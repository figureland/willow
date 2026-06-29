import clsx from 'clsx'
import { useMemo, useState } from 'react'
import {
  Button,
  DataTable,
  type GridColDef,
  Modal,
  TextInput,
} from '../../../components/ui'
import { IconSearch } from '../../../components/ui/icons'
import type {
  CroppingRecord,
  FieldStatus,
  OperationRecord,
} from './fix-records'
import { useFixState } from './fix-state'
import { type EditableField, RecordEditorSheet } from './RecordEditorSheet'
import {
  CROP_TYPE_ITEMS,
  farmFieldItems,
  farmFieldValueFor,
  farmFieldWritePatch,
  operationTypeItemsFor,
} from './record-editor-options'
import { type RowIssue, worstSeverity } from './row-issues'
import { rowMatchesSeverity, useSeverityFilter } from './use-severity-filter'

/* -------------------------------------------------------------------------- */
/* Status pill — reused from the previous FieldView                            */
/* -------------------------------------------------------------------------- */

const STATUS_LABEL: Record<FieldStatus, string> = {
  blocked: 'Blocked',
  warning: 'Warning',
  good: 'Good',
}

const STATUS_PILL: Record<FieldStatus, string> = {
  blocked: 'bg-support-bg-red text-support-fg-red',
  warning: 'bg-support-bg-amber text-support-fg-amber',
  good: 'bg-support-bg-green text-support-fg-green',
}

const StatusPill = ({ status }: { status: FieldStatus }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      STATUS_PILL[status],
    )}
  >
    {STATUS_LABEL[status]}
  </span>
)

const MissingCell = () => <span className="text-text-secondary">—</span>

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

/* -------------------------------------------------------------------------- */
/* Action column + row class — shared with DataTableView                       */
/* -------------------------------------------------------------------------- */

type RowAction = 'create' | 'edit' | 'delete'
const ACTION_LABEL: Record<RowAction, string> = {
  create: 'CREATE',
  edit: 'EDIT',
  delete: 'DELETE',
}

const ActionPill = ({ action }: { action: RowAction }) => (
  <span className="inline-flex items-center rounded-md bg-text-secondary/10 px-2 py-0.5 text-xs font-semibold tracking-[0.15px] text-text-secondary">
    {ACTION_LABEL[action]}
  </span>
)

const actionFor = (
  rowId: string,
  edited: Set<string>,
  removed: Set<string>,
): RowAction =>
  removed.has(rowId) ? 'delete' : edited.has(rowId) ? 'edit' : 'create'

const actionColumn = <Row extends { id: string }>(
  edited: Set<string>,
  removed: Set<string>,
): GridColDef<Row> => ({
  field: '__action',
  headerName: 'Action',
  sortable: false,
  filterable: false,
  width: 96,
  renderCell: ({ row }) => (
    <ActionPill action={actionFor(row.id, edited, removed)} />
  ),
})

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

/* -------------------------------------------------------------------------- */
/* Editable-field schemas — Farm + Field are locked in field-scoped edits     */
/* -------------------------------------------------------------------------- */

const parseNullableNumber = (raw: string): number | null | undefined => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

const parseNullableString = (raw: string): string | null | undefined => {
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

const CROPPING_FIELD_FIELDS: EditableField<CroppingRecord>[] = [
  {
    kind: 'composite',
    key: '__farm_field',
    label: 'Farm / Field',
    items: farmFieldItems,
    read: (row) => farmFieldValueFor(row),
    write: (raw) => farmFieldWritePatch<CroppingRecord>(raw),
    readOnly: true,
  },
  {
    key: 'harvestYear',
    rowKey: 'harvestYear',
    label: 'Year',
    fromInput: (v) => {
      const n = Number(v.trim())
      return Number.isFinite(n) ? n : undefined
    },
  },
  { key: 'cropName', rowKey: 'cropName', label: 'Crop' },
  {
    kind: 'select',
    key: 'cropType',
    rowKey: 'cropType',
    label: 'Type',
    items: CROP_TYPE_ITEMS,
    fromInput: parseNullableString,
  },
  {
    key: 'cropVariety',
    rowKey: 'cropVariety',
    label: 'Variety',
    fromInput: parseNullableString,
  },
  {
    key: 'workingArea',
    rowKey: 'workingArea',
    label: 'Area (ha)',
    fromInput: parseNullableNumber,
  },
  {
    key: 'tillage',
    rowKey: 'tillage',
    label: 'Tillage',
    fromInput: parseNullableString,
  },
  {
    key: 'yield',
    rowKey: 'yield',
    label: 'Yield (t/ha)',
    fromInput: parseNullableNumber,
  },
  {
    key: 'plantingDate',
    rowKey: 'plantingDate',
    label: 'Planting',
    fromInput: parseNullableString,
  },
  {
    key: 'harvestDate',
    rowKey: 'harvestDate',
    label: 'Harvest',
    fromInput: parseNullableString,
  },
  {
    key: 'totalYield',
    rowKey: 'totalYield',
    label: 'Total (t)',
    fromInput: parseNullableNumber,
  },
]

const buildOperationFieldFields = (
  records: OperationRecord[],
): EditableField<OperationRecord>[] => [
  {
    kind: 'composite',
    key: '__farm_field',
    label: 'Farm / Field',
    items: farmFieldItems,
    read: (row) => farmFieldValueFor(row),
    write: (raw) => farmFieldWritePatch<OperationRecord>(raw),
    readOnly: true,
  },
  {
    key: 'harvestYear',
    rowKey: 'harvestYear',
    label: 'Year',
    fromInput: (v) => {
      const n = Number(v.trim())
      return Number.isFinite(n) ? n : undefined
    },
  },
  { key: 'operationGroup', rowKey: 'operationGroup', label: 'Group' },
  {
    kind: 'select',
    key: 'operationType',
    rowKey: 'operationType',
    label: 'Type',
    items: operationTypeItemsFor(records),
  },
  {
    key: 'operationDate',
    rowKey: 'operationDate',
    label: 'Date',
    fromInput: parseNullableString,
  },
  {
    key: 'productName',
    rowKey: 'productName',
    label: 'Product',
    fromInput: parseNullableString,
  },
  {
    key: 'quantity',
    rowKey: 'quantity',
    label: 'Quantity',
    fromInput: parseNullableNumber,
  },
  {
    key: 'unit',
    rowKey: 'unit',
    label: 'Unit',
    fromInput: parseNullableString,
  },
  {
    key: 'appliedArea',
    rowKey: 'appliedArea',
    label: 'Applied (ha)',
    fromInput: parseNullableNumber,
  },
]

const describeCropping = (row: CroppingRecord) =>
  `${row.cropName} ${row.harvestYear}`

const describeOperation = (row: OperationRecord) =>
  `${row.operationType} ${row.harvestYear}`

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
    return r !== 0 ? r : a.name.localeCompare(b.name)
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
              'flex w-full items-center justify-between gap-3 border-b-2 border-border-tertiary px-4 py-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
              isActive
                ? 'bg-bg-tertiary text-text-primary'
                : 'bg-bg-primary text-text-primary hover:bg-bg-secondary',
            )}
          >
            <div className="flex min-w-0 flex-col">
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
            <StatusPill status={field.status} />
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

  const croppingCols = useMemo(
    () => [
      actionColumn<CroppingRecord>(editedCroppingIds, removedCroppingIds),
      ...CROPPING_COLUMNS,
    ],
    [editedCroppingIds, removedCroppingIds],
  )
  const operationCols = useMemo(
    () => [
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

  return (
    <div className="flex flex-col gap-8 pb-24">
      {field.croppingRecords.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-lg font-medium text-text-primary">
            Cropping ({croppingRows.length})
          </h4>
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
        </section>
      ) : null}

      {field.operationRecords.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h4 className="text-lg font-medium text-text-primary">
            Operations ({operationRows.length})
          </h4>
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
              setOperationSelection(new Set(Array.from(model.ids).map(String)))
            }}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h4 className="text-lg font-medium text-text-primary">Soil</h4>
        <div className="rounded-xl border-2 border-dashed border-border-tertiary bg-bg-secondary px-6 py-8 text-center text-sm text-text-secondary">
          No soil records for this field.
        </div>
      </section>

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
          describeRecord={describeCropping}
          onSave={applyCroppingPatch}
          getProvenance={(row) => row.provenance}
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
          describeRecord={describeOperation}
          onSave={applyOperationPatch}
          getProvenance={(row) => row.provenance}
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
/* SelectionActionBar — shared bottom bar (mirrors DataTableView)              */
/* -------------------------------------------------------------------------- */

const SelectionActionBar = ({
  count,
  recordLabel,
  onEdit,
  onDelete,
  onClear,
}: {
  count: number
  recordLabel: string
  onEdit: () => void
  onDelete: () => void
  onClear: () => void
}) => (
  <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-6 pb-6">
    <div className="pointer-events-auto flex items-center gap-4 rounded-pill border-2 border-border-tertiary bg-bg-primary px-4 py-2 shadow-xl">
      <div className="flex items-center gap-3">
        <span className="text-md font-medium text-text-primary">
          {count} {count === 1 ? recordLabel : `${recordLabel}s`} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-text-secondary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Clear
        </button>
      </div>
      <div className="h-6 w-px bg-border-tertiary" />
      <div className="flex items-center gap-2">
        <Button variant="destructive" onClick={onDelete}>
          Delete {count === 1 ? 'record' : `${count} records`}
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Edit {count === 1 ? 'record' : `${count} records`}
        </Button>
      </div>
    </div>
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

  const [activeName, setActiveName] = useState<string | null>(
    () => fields[0]?.name ?? null,
  )
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
