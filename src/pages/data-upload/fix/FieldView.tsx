import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  DataTable,
  type GridColDef,
  Modal,
  Tab,
  TabBar,
  TabPanel,
  Tabs,
  TextInput,
} from '../../../components/ui'
import { IconSearch } from '../../../components/ui/icons'
import { actionColumn, SelectionActionBar, statusColumn } from './fix-grid-bits'
import type {
  CroppingRecord,
  FieldStatus,
  OperationRecord,
} from './fix-records'
import { useFixState } from './fix-state'
import { buildIssueGroups, type IssueGroup } from './issue-groups'
import { RecordEditorSheet } from './RecordEditorSheet'
import { StatusHaloBadge } from './RowStatusPip'
import {
  buildOperationFieldFields,
  CROPPING_FIELD_FIELDS,
} from './record-editor-schemas'
import { type RowIssue, worstSeverity } from './row-issues'
import { SuggestionCard } from './SuggestionCard'
import { rowMatchesSeverity, useSeverityFilter } from './use-severity-filter'

/* -------------------------------------------------------------------------- */
/* Field-status mapping — translates the field aggregate into the row pip    */
/* vocabulary used by the shared StatusHaloBadge.                             */
/* -------------------------------------------------------------------------- */

const FIELD_STATUS_PIP: Record<FieldStatus, 'clean' | 'warning' | 'blocking'> =
  {
    good: 'clean',
    warning: 'warning',
    blocked: 'blocking',
  }

const MissingCell = () => <span className="text-text-secondary">—</span>

const NUMBER_FIELD_KEYS = new Set([
  'workingArea',
  'yield',
  'totalYield',
  'quantity',
  'appliedArea',
  'harvestYear',
])

const coerceForFieldKey = (key: string, raw: string): string | number => {
  if (NUMBER_FIELD_KEYS.has(key)) {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  return raw
}

/* -------------------------------------------------------------------------- */
/* Per-field grids — narrower columns than the global Data Table               */
/* -------------------------------------------------------------------------- */

const CROPPING_COLUMNS: GridColDef<CroppingRecord>[] = [
  {
    field: 'harvestYear',
    headerName: 'Year',
    type: 'number',
    flex: 0.4,
    minWidth: 80,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  { field: 'cropName', headerName: 'Crop', flex: 1, minWidth: 140 },
  {
    field: 'cropVariety',
    headerName: 'Variety',
    flex: 0.9,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.cropVariety === null ? <MissingCell /> : row.cropVariety,
  },
  {
    field: 'workingArea',
    headerName: 'Area (ha)',
    type: 'number',
    flex: 0.6,
    minWidth: 100,
    renderCell: ({ row }) =>
      row.workingArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.workingArea.toFixed(1)}</span>
      ),
  },
  {
    field: 'yield',
    headerName: 'Yield',
    type: 'number',
    flex: 0.6,
    minWidth: 100,
    renderCell: ({ row }) =>
      row.yield === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.yield.toFixed(2)}</span>
      ),
  },
  {
    field: 'plantingDate',
    headerName: 'Planting',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.plantingDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.plantingDate}</span>
      ),
  },
  {
    field: 'harvestDate',
    headerName: 'Harvest',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.harvestDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.harvestDate}</span>
      ),
  },
]

const OPERATION_COLUMNS: GridColDef<OperationRecord>[] = [
  { field: 'operationGroup', headerName: 'Group', flex: 1, minWidth: 140 },
  { field: 'operationType', headerName: 'Type', flex: 1, minWidth: 140 },
  {
    field: 'operationDate',
    headerName: 'Date',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.operationDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.operationDate}</span>
      ),
  },
  {
    field: 'productName',
    headerName: 'Product',
    flex: 1.1,
    minWidth: 150,
    renderCell: ({ row }) =>
      row.productName === null ? <MissingCell /> : row.productName,
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.quantity === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.quantity.toFixed(2)}</span>
      ),
  },
  {
    field: 'unit',
    headerName: 'Unit',
    flex: 0.5,
    minWidth: 80,
    renderCell: ({ row }) => (row.unit === null ? <MissingCell /> : row.unit),
  },
  {
    field: 'appliedArea',
    headerName: 'Applied (ha)',
    type: 'number',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.appliedArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.appliedArea.toFixed(1)}</span>
      ),
  },
]

const computeRowClass = ({
  row,
  edited,
  removed,
}: {
  row: { id: string; issues: RowIssue[] }
  edited: Set<string>
  removed: Set<string>
}) => {
  if (removed.has(row.id)) return 'row-removed'
  if (edited.has(row.id)) return 'row-edited'
  const sev = worstSeverity(row.issues)
  if (sev === 'blocking') return 'row-issue-blocking'
  if (sev === 'warning') return 'row-issue-warning'
  return ''
}

/**
 * Collect every field key flagged as broken across a set of records — feeds
 * `RecordEditorSheet.invalidKeys` so the editor outlines the relevant inputs
 * in red the moment the user opens it.
 */
const collectInvalidKeys = (records: { issues: RowIssue[] }[]): string[] => {
  const set = new Set<string>()
  for (const r of records) {
    for (const issue of r.issues ?? []) {
      if (issue.columnName) set.add(issue.columnName)
    }
  }
  return [...set]
}

/* -------------------------------------------------------------------------- */
/* Field summary — derived live from the FixState context                     */
/* -------------------------------------------------------------------------- */

type FieldDerivedSummary = {
  name: string
  farmName: string
  status: FieldStatus
  croppingRecords: CroppingRecord[]
  operationRecords: OperationRecord[]
  totalIssueCount: number
}

const worst = (a: FieldStatus, b: 'blocking' | 'warning'): FieldStatus => {
  if (a === 'blocked' || b === 'blocking') return 'blocked'
  if (a === 'warning' || b === 'warning') return 'warning'
  return 'good'
}

const buildFieldSummaries = (
  cropping: CroppingRecord[],
  operations: OperationRecord[],
  removedCropping: Set<string>,
  removedOperations: Set<string>,
): FieldDerivedSummary[] => {
  const map = new Map<string, FieldDerivedSummary>()
  const ensure = (name: string, farmName: string): FieldDerivedSummary => {
    let existing = map.get(name)
    if (!existing) {
      existing = {
        name,
        farmName,
        status: 'good',
        croppingRecords: [],
        operationRecords: [],
        totalIssueCount: 0,
      }
      map.set(name, existing)
    }
    return existing
  }
  for (const r of cropping) {
    const summary = ensure(r.fieldName, r.farmName)
    summary.croppingRecords.push(r)
    if (!removedCropping.has(r.id)) {
      summary.totalIssueCount += r.issues.length
      for (const i of r.issues)
        summary.status = worst(summary.status, i.severity)
    }
  }
  for (const r of operations) {
    const summary = ensure(r.fieldName, r.farmName)
    summary.operationRecords.push(r)
    if (!removedOperations.has(r.id)) {
      summary.totalIssueCount += r.issues.length
      for (const i of r.issues)
        summary.status = worst(summary.status, i.severity)
    }
  }
  const rank: Record<FieldStatus, number> = { blocked: 0, warning: 1, good: 2 }
  return [...map.values()].sort((a, b) => {
    const r = rank[a.status] - rank[b.status]
    if (r !== 0) return r
    const f = a.farmName.localeCompare(b.farmName)
    return f !== 0 ? f : a.name.localeCompare(b.name)
  })
}

/* -------------------------------------------------------------------------- */
/* FieldList — left rail picker                                                */
/* -------------------------------------------------------------------------- */

type FieldListProps = {
  fields: FieldDerivedSummary[]
  activeName: string | null
  onSelect: (name: string) => void
}

const FieldList = ({ fields, activeName, onSelect }: FieldListProps) => (
  <ul className="flex flex-col">
    {fields.map((field) => {
      const isActive = field.name === activeName
      return (
        <li key={field.name}>
          <button
            type="button"
            onClick={() => onSelect(field.name)}
            className={clsx(
              'flex w-full items-center gap-3 border-b-2 border-border-tertiary px-4 py-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
              isActive
                ? 'bg-bg-tertiary text-text-primary'
                : 'bg-bg-primary text-text-primary hover:bg-bg-secondary',
            )}
          >
            <StatusHaloBadge status={FIELD_STATUS_PIP[field.status]} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-md font-medium">{field.name}</span>
              <span className="truncate text-xs text-text-secondary">
                {field.farmName} ·{' '}
                {field.totalIssueCount === 0
                  ? 'No issues'
                  : `${field.totalIssueCount} ${
                      field.totalIssueCount === 1 ? 'issue' : 'issues'
                    }`}
              </span>
            </div>
          </button>
        </li>
      )
    })}
  </ul>
)

/* -------------------------------------------------------------------------- */
/* FieldDetails — three sections (Cropping / Operations / Soil) per field     */
/* -------------------------------------------------------------------------- */

type FieldDetailsProps = {
  field: FieldDerivedSummary
  filter: ReturnType<typeof useSeverityFilter>
}

const FieldDetails = ({ field, filter }: FieldDetailsProps) => {
  const {
    editedCroppingIds,
    editedOperationIds,
    removedCroppingIds,
    removedOperationIds,
    patchCropping,
    patchOperations,
    removeCropping,
    removeOperations,
  } = useFixState()

  const croppingRows = useMemo(
    () =>
      field.croppingRecords.filter((r) => rowMatchesSeverity(r.issues, filter)),
    [field.croppingRecords, filter],
  )
  const operationRows = useMemo(
    () =>
      field.operationRecords.filter((r) =>
        rowMatchesSeverity(r.issues, filter),
      ),
    [field.operationRecords, filter],
  )

  const [croppingSelection, setCroppingSelection] = useState<Set<string>>(
    () => new Set(),
  )
  const [operationSelection, setOperationSelection] = useState<Set<string>>(
    () => new Set(),
  )

  // Reset selections when the active field changes — selecting rows then
  // jumping to another field shouldn't carry orphaned ids across.
  // We use field.name as the keying signal via useMemo above; if the user
  // clicks a different field, those derived arrays change and any selected
  // ids will simply no longer match. That's correct without an explicit reset.

  const [editorTarget, setEditorTarget] = useState<
    'cropping' | 'operations' | null
  >(null)
  const [deleteTarget, setDeleteTarget] = useState<
    'cropping' | 'operations' | null
  >(null)

  const selectedCroppingRecords = useMemo(
    () => field.croppingRecords.filter((r) => croppingSelection.has(r.id)),
    [field.croppingRecords, croppingSelection],
  )
  const selectedOperationRecords = useMemo(
    () => field.operationRecords.filter((r) => operationSelection.has(r.id)),
    [field.operationRecords, operationSelection],
  )

  // Clicking the status pip on a row jumps straight into the editor for
  // that one row — quicker than selecting + Edit.
  const openSingleCroppingEditor = (rowId: string) => {
    setCroppingSelection(new Set([rowId]))
    setEditorTarget('cropping')
  }
  const openSingleOperationEditor = (rowId: string) => {
    setOperationSelection(new Set([rowId]))
    setEditorTarget('operations')
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: openSingleCroppingEditor is stable enough — re-running the memo every render would defeat the column-def cache
  const croppingCols = useMemo(
    () => [
      statusColumn<CroppingRecord>(
        removedCroppingIds,
        undefined,
        openSingleCroppingEditor,
      ),
      actionColumn<CroppingRecord>(editedCroppingIds, removedCroppingIds),
      ...CROPPING_COLUMNS,
    ],
    [editedCroppingIds, removedCroppingIds],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: openSingleOperationEditor is stable enough — re-running the memo every render would defeat the column-def cache
  const operationCols = useMemo(
    () => [
      statusColumn<OperationRecord>(
        removedOperationIds,
        undefined,
        openSingleOperationEditor,
      ),
      actionColumn<OperationRecord>(editedOperationIds, removedOperationIds),
      ...OPERATION_COLUMNS,
    ],
    [editedOperationIds, removedOperationIds],
  )

  // Show the action bar for whichever section currently has a selection. If
  // both do (uncommon — actions are scoped per section), cropping wins.
  const activeSection: 'cropping' | 'operations' | null =
    croppingSelection.size > 0
      ? 'cropping'
      : operationSelection.size > 0
        ? 'operations'
        : null
  const activeSelectionCount =
    activeSection === 'cropping'
      ? croppingSelection.size
      : activeSection === 'operations'
        ? operationSelection.size
        : 0

  const clearActiveSelection = () => {
    if (activeSection === 'cropping') setCroppingSelection(new Set())
    else if (activeSection === 'operations') setOperationSelection(new Set())
  }

  const applyCroppingPatch = (patch: Partial<CroppingRecord>) => {
    patchCropping(croppingSelection, patch)
    setEditorTarget(null)
    setCroppingSelection(new Set())
  }
  const applyOperationPatch = (patch: Partial<OperationRecord>) => {
    patchOperations(operationSelection, patch)
    setEditorTarget(null)
    setOperationSelection(new Set())
  }

  const confirmDelete = () => {
    if (deleteTarget === 'cropping') {
      removeCropping(croppingSelection)
      setCroppingSelection(new Set())
    } else if (deleteTarget === 'operations') {
      removeOperations(operationSelection)
      setOperationSelection(new Set())
    }
    setDeleteTarget(null)
  }

  const isEmpty =
    field.croppingRecords.length === 0 && field.operationRecords.length === 0

  // Per-field issue groups — derived from FixState's live records so the
  // fix cards stay in sync with edits/removals. Filtered to just this
  // field's record ids.
  const fieldIssueGroups = useMemo(() => {
    const all = buildIssueGroups(field.croppingRecords, field.operationRecords)
    return all
  }, [field.croppingRecords, field.operationRecords])

  const croppingFixes = fieldIssueGroups.filter(
    (g) => g.recordType === 'cropping',
  )
  const operationFixes = fieldIssueGroups.filter(
    (g) => g.recordType === 'operation',
  )

  // Active section tab — persisted in the URL so back/forward + refresh
  // keep the user on the same tab across fields.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('fieldTab')
  const tab: 'cropping' | 'operations' | 'soil' =
    rawTab === 'operations' || rawTab === 'soil' ? rawTab : 'cropping'
  const setTab = (next: 'cropping' | 'operations' | 'soil') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'cropping') params.delete('fieldTab')
    else params.set('fieldTab', next)
    setSearchParams(params, { replace: true })
  }

  const acceptSandyForGroup = (group: IssueGroup) => {
    const patch: Record<string, unknown> = {}
    for (const key of group.brokenFieldKeys) {
      const raw = group.sandySuggestion[key]
      if (raw === undefined) continue
      patch[key] = coerceForFieldKey(key, raw)
    }
    if (Object.keys(patch).length === 0) return
    // Jump to the tab the patch actually targets so the user sees the
    // affected records update beneath the suggestion, not a stale tab.
    const targetTab =
      group.recordType === 'cropping' ? 'cropping' : 'operations'
    if (tab !== targetTab) setTab(targetTab)
    if (group.recordType === 'cropping') {
      patchCropping(group.recordIds, patch as Partial<CroppingRecord>, {
        autoSave: true,
      })
    } else {
      patchOperations(group.recordIds, patch as Partial<OperationRecord>, {
        autoSave: true,
      })
    }
  }

  // Consolidate cropping + operation fix groups into a single, capped list.
  // The cap varies between fields so the UI reads as a realistic mix —
  // some fields are clean (no fixes), some have one or two, some have a
  // handful. The per-field cap is a stable hash of the field name so the
  // same field always shows the same number of fixes between renders.
  const FIXES_PER_FIELD_MAX = 4
  const fixesCapForField = useMemo(() => {
    let h = 0
    for (let i = 0; i < field.name.length; i++) {
      h = (h * 31 + field.name.charCodeAt(i)) | 0
    }
    return Math.abs(h) % (FIXES_PER_FIELD_MAX + 1)
  }, [field.name])
  const allFieldFixes = useMemo(
    () => [...croppingFixes, ...operationFixes].slice(0, fixesCapForField),
    [croppingFixes, operationFixes, fixesCapForField],
  )

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Field name sits at the top — same typography as the Issue Type
          page so the two views read in parallel. */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-text-primary">
          {field.name}
        </h1>
        <p className="text-sm text-text-secondary">{field.farmName}</p>
      </header>

      {/* Fixes sit ABOVE the table switcher so they apply to the whole field,
          not whichever tab happens to be active. */}
      <FieldFixesSection
        groups={allFieldFixes}
        onAcceptSandy={acceptSandyForGroup}
      />

      <Tabs<'cropping' | 'operations' | 'soil'>
        value={tab}
        onValueChange={setTab}
      >
        <TabBar>
          <Tab value="cropping">Cropping ({field.croppingRecords.length})</Tab>
          <Tab value="operations">
            Operations ({field.operationRecords.length})
          </Tab>
          <Tab value="soil">Soil (0)</Tab>
        </TabBar>
        <TabPanel value="cropping" className="flex flex-col gap-4 pt-4">
          {field.croppingRecords.length > 0 ? (
            <DataTable<CroppingRecord>
              rows={croppingRows}
              columns={croppingCols}
              selectable
              hideFooter
              getRowClassName={({ row }) =>
                computeRowClass({
                  row,
                  edited: editedCroppingIds,
                  removed: removedCroppingIds,
                })
              }
              isRowSelectable={({ row }) => !removedCroppingIds.has(row.id)}
              rowSelectionModel={{ type: 'include', ids: croppingSelection }}
              onRowSelectionModelChange={(model) => {
                setCroppingSelection(new Set(Array.from(model.ids).map(String)))
              }}
            />
          ) : (
            <FieldEmptyState
              kind="cropping"
              isEmpty={field.croppingRecords.length === 0}
            />
          )}
        </TabPanel>
        <TabPanel value="operations" className="flex flex-col gap-4 pt-4">
          {field.operationRecords.length > 0 ? (
            <DataTable<OperationRecord>
              rows={operationRows}
              columns={operationCols}
              selectable
              hideFooter
              getRowClassName={({ row }) =>
                computeRowClass({
                  row,
                  edited: editedOperationIds,
                  removed: removedOperationIds,
                })
              }
              isRowSelectable={({ row }) => !removedOperationIds.has(row.id)}
              rowSelectionModel={{ type: 'include', ids: operationSelection }}
              onRowSelectionModelChange={(model) => {
                setOperationSelection(
                  new Set(Array.from(model.ids).map(String)),
                )
              }}
            />
          ) : (
            <FieldEmptyState
              kind="operations"
              isEmpty={field.operationRecords.length === 0}
            />
          )}
        </TabPanel>
        <TabPanel value="soil" className="flex flex-col gap-4 pt-4">
          <div className="rounded-xl border-2 border-dashed border-border-tertiary bg-bg-secondary px-6 py-8 text-center text-sm text-text-secondary">
            No soil records for this field.
          </div>
        </TabPanel>
      </Tabs>

      {isEmpty ? (
        <p className="text-md text-text-secondary">
          No records found for this field.
        </p>
      ) : null}

      {activeSection && activeSelectionCount > 0 ? (
        <SelectionActionBar
          count={activeSelectionCount}
          recordLabel={
            activeSection === 'cropping' ? 'cropping record' : 'operation'
          }
          onEdit={() => setEditorTarget(activeSection)}
          onDelete={() => setDeleteTarget(activeSection)}
          onClear={clearActiveSelection}
        />
      ) : null}

      {editorTarget === 'cropping' ? (
        <RecordEditorSheet<CroppingRecord>
          open
          onOpenChange={(next) => {
            if (!next) setEditorTarget(null)
          }}
          records={selectedCroppingRecords}
          fields={CROPPING_FIELD_FIELDS}
          recordLabel="cropping record"
          onSave={applyCroppingPatch}
          getProvenance={(row) => row.provenance}
          invalidKeys={collectInvalidKeys(selectedCroppingRecords)}
        />
      ) : null}
      {editorTarget === 'operations' ? (
        <RecordEditorSheet<OperationRecord>
          open
          onOpenChange={(next) => {
            if (!next) setEditorTarget(null)
          }}
          records={selectedOperationRecords}
          fields={buildOperationFieldFields(selectedOperationRecords)}
          recordLabel="operation"
          onSave={applyOperationPatch}
          getProvenance={(row) => row.provenance}
          invalidKeys={collectInvalidKeys(selectedOperationRecords)}
        />
      ) : null}

      <Modal
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null)
        }}
        title={`Delete ${activeSelectionCount} ${
          activeSelectionCount === 1 ? 'record' : 'records'
        }?`}
        description="The selected rows will be marked for removal. You can save or discard the change from the bar above."
        maxWidth="440px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete {activeSelectionCount}{' '}
              {activeSelectionCount === 1 ? 'record' : 'records'}
            </Button>
          </>
        }
      >
        <p className="text-md text-text-secondary">
          Deleted rows stay visible until you save — they'll appear with a
          strikethrough so you can review the change first.
        </p>
      </Modal>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* FieldFixesSection — flat list of Sandy-suggestion cards                    */
/* -------------------------------------------------------------------------- */

const FieldFixesSection = ({
  groups,
  onAcceptSandy,
}: {
  groups: IssueGroup[]
  onAcceptSandy: (group: IssueGroup) => void
}) => {
  // Only surface groups Sandy can actually propose a fix for. Anything else
  // still appears as a row-level issue in the data table.
  const actionable = groups.filter(
    (g) => Object.keys(g.sandySuggestion).length > 0,
  )
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        How to fix
      </h3>
      {actionable.length === 0 ? (
        // Neutral placeholder card — keeps the field-detail layout stable
        // even on clean fields where Sandy has nothing to suggest.
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border-tertiary bg-bg-secondary px-6 py-8 text-center">
          <p className="text-md font-medium text-text-primary">
            Nothing to fix here
          </p>
          <p className="text-sm text-text-secondary">
            Sandy hasn't found anything that needs your attention on this field.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
          {actionable.map((group) => (
            <SuggestionCard
              key={group.id}
              tone="smart"
              headline={`Update ${group.recordIds.length} ${
                group.recordIds.length === 1 ? 'record' : 'records'
              } ${group.brokenFieldKeys
                .map((k, i) => {
                  const v = group.sandySuggestion[k]
                  return v ? `${group.brokenFieldLabels[i]} to ${v}` : null
                })
                .filter((s): s is string => s !== null)
                .join(', ')}`}
              description={`Based on the other records in this sheet, we'd set ${group.brokenFieldKeys
                .map((k, i) => {
                  const v = group.sandySuggestion[k]
                  return v ? `${group.brokenFieldLabels[i]}: ${v}` : null
                })
                .filter((s): s is string => s !== null)
                .join(' · ')}.`}
              cta={
                <Button variant="primary" onClick={() => onAcceptSandy(group)}>
                  Apply suggestion
                </Button>
              }
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* FieldEmptyState — dashed border placeholder for a record-type with no rows */
/* -------------------------------------------------------------------------- */

const FieldEmptyState = ({
  kind,
  isEmpty,
}: {
  kind: 'cropping' | 'operations'
  isEmpty: boolean
}) => (
  <div className="rounded-xl border-2 border-dashed border-border-tertiary bg-bg-secondary px-6 py-8 text-center text-sm text-text-secondary">
    {isEmpty
      ? `No ${kind} records for this field.`
      : `No ${kind} records match the current filter.`}
  </div>
)

/* -------------------------------------------------------------------------- */
/* FieldView — sidebar + details                                               */
/* -------------------------------------------------------------------------- */

export const FieldView = () => {
  const filter = useSeverityFilter()
  const {
    croppingRecords,
    operationRecords,
    removedCroppingIds,
    removedOperationIds,
  } = useFixState()

  const allFields = useMemo(
    () =>
      buildFieldSummaries(
        croppingRecords,
        operationRecords,
        removedCroppingIds,
        removedOperationIds,
      ),
    [
      croppingRecords,
      operationRecords,
      removedCroppingIds,
      removedOperationIds,
    ],
  )

  // Apply the severity filter to the sidebar — fields with nothing left
  // matching the current filter drop out.
  const severityFiltered = useMemo(() => {
    if (filter === 'all') return allFields
    return allFields.filter(
      (f) =>
        f.croppingRecords.some((r) => rowMatchesSeverity(r.issues, filter)) ||
        f.operationRecords.some((r) => rowMatchesSeverity(r.issues, filter)),
    )
  }, [allFields, filter])

  const [query, setQuery] = useState('')
  const fields = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return severityFiltered
    return severityFiltered.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.farmName.toLowerCase().includes(q),
    )
  }, [severityFiltered, query])

  // Active field lives in the URL so back/forward + refresh keep the user
  // on the same field across view types.
  const [searchParams, setSearchParams] = useSearchParams()
  const activeName = searchParams.get('field')
  const setActiveName = (name: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('field', name)
    setSearchParams(params, { replace: true })
  }
  const activeField =
    fields.find((f) => f.name === activeName) ?? fields[0] ?? null

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="flex w-[30%] min-w-[260px] max-w-[420px] flex-col border-r-2 border-border-tertiary bg-bg-primary">
        <div className="border-b-2 border-border-tertiary px-4 py-3">
          <TextInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search fields"
            aria-label="Search fields"
            leadingIcon={<IconSearch size={16} />}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {fields.length === 0 ? (
            <p className="px-4 py-6 text-sm text-text-secondary">
              No fields match{query ? ` "${query}"` : ' the current filter'}.
            </p>
          ) : (
            <FieldList
              fields={fields}
              activeName={activeField?.name ?? null}
              onSelect={setActiveName}
            />
          )}
        </div>
      </aside>
      <section className="flex-1 overflow-y-auto px-8 py-8">
        {activeField ? (
          <FieldDetails
            // Re-key on field name so per-field selection state resets when
            // the user switches fields — otherwise stale ids from the
            // previous field could affect the new field's action bar.
            key={activeField.name}
            field={activeField}
            filter={filter}
          />
        ) : (
          <p className="text-md text-text-secondary">
            No fields match the current filter.
          </p>
        )}
      </section>
    </div>
  )
}
