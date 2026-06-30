import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  DataTable,
  type GridColDef,
  Modal,
  MultiSelect,
  Spinner,
  Tab,
  TabBar,
  TabPanel,
  Tabs,
  TextInput,
} from '../../components/ui'
import {
  IconDownload,
  IconFilter,
  IconSearch,
} from '../../components/ui/icons'
import { DownloadTemplateModal } from './DownloadTemplateModal'
import {
  actionColumn,
  SelectionActionBar,
  statusColumn,
} from './fix/fix-grid-bits'
import type { CroppingRecord, OperationRecord } from './fix/fix-records'
import { useFixState } from './fix/fix-state'
import { RecordEditorSheet } from './fix/RecordEditorSheet'
import {
  buildOperationFieldFields,
  CROPPING_FIELD_FIELDS,
} from './fix/record-editor-schemas'

/* -------------------------------------------------------------------------- */
/* CommitStep — final read-only review before save                             */
/*                                                                             */
/* Mirrors the Fix-issues card layout (headline + four solid summary tiles)   */
/* and then shows the cropping + operations records as plain DataTables —    */
/* no filters, no edit affordances. Hitting "Save to Sandy" simulates the    */
/* commit and bounces the user home.                                          */
/* -------------------------------------------------------------------------- */

const MissingCell = () => <span className="text-text-secondary">—</span>

const CROPPING_COLUMNS: GridColDef<CroppingRecord>[] = [
  { field: 'farmName', headerName: 'Farm', flex: 1, minWidth: 150 },
  { field: 'fieldName', headerName: 'Field', flex: 1, minWidth: 140 },
  {
    field: 'harvestYear',
    headerName: 'Year',
    type: 'number',
    flex: 0.5,
    minWidth: 90,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  { field: 'cropName', headerName: 'Crop', flex: 1, minWidth: 150 },
  {
    field: 'cropVariety',
    headerName: 'Variety',
    flex: 1,
    minWidth: 130,
    renderCell: ({ row }) =>
      row.cropVariety === null ? <MissingCell /> : row.cropVariety,
  },
  {
    field: 'workingArea',
    headerName: 'Area (ha)',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.workingArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.workingArea.toFixed(1)}</span>
      ),
  },
  {
    field: 'yield',
    headerName: 'Yield (t/ha)',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
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
    flex: 0.9,
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
    flex: 0.9,
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
  { field: 'farmName', headerName: 'Farm', flex: 1, minWidth: 150 },
  { field: 'fieldName', headerName: 'Field', flex: 1, minWidth: 140 },
  {
    field: 'harvestYear',
    headerName: 'Year',
    type: 'number',
    flex: 0.5,
    minWidth: 90,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
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

type CommitTab = 'cropping' | 'operations'

type Stage = 'review' | 'confirming' | 'committing' | 'done'

/**
 * Event the wizard top bar dispatches when the user clicks the global
 * "Save to Sandy" button. CommitStep listens for it and opens its own
 * confirmation modal — keeps the modal state co-located with the page even
 * though the trigger lives in the wizard chrome.
 */
const COMMIT_REQUEST_EVENT = 'data-upload:commit-request'

/**
 * Enterprise bucket — derived from crop / operation type so the commit
 * page can offer a coarse "Arable / Perennial / Permanent grassland"
 * filter without us adding a new field to the record model.
 */
type Enterprise = 'arable' | 'perennial' | 'permanent-grassland' | 'mixed'

const ENTERPRISE_LABEL: Record<Enterprise, string> = {
  arable: 'Arable',
  perennial: 'Perennials',
  'permanent-grassland': 'Permanent grassland',
  mixed: 'Mixed',
}

const enterpriseForCropping = (row: CroppingRecord): Enterprise => {
  const crop = (row.cropName ?? '').toLowerCase()
  if (/grass|ley|pasture/.test(crop)) return 'permanent-grassland'
  if (/orchard|vine|hop|fruit|apple|pear/.test(crop)) return 'perennial'
  return 'arable'
}

const enterpriseForOperation = (row: OperationRecord): Enterprise => {
  const group = (row.operationGroup ?? '').toLowerCase()
  if (group.includes('grass')) return 'permanent-grassland'
  if (group.includes('orchard') || group.includes('vine')) return 'perennial'
  return 'arable'
}

export const CommitStep = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<CommitTab>('cropping')
  const [stage, setStage] = useState<Stage>('review')
  // Latch — `setStage` from the event listener needs to see the latest
  // stage value so we don't re-trigger the modal while committing.
  const stageRef = useRef(stage)
  stageRef.current = stage

  const {
    croppingRecords,
    operationRecords,
    editedCroppingIds,
    editedOperationIds,
    removedCroppingIds,
    removedOperationIds,
    patchCropping,
    patchOperations,
    removeCropping,
    removeOperations,
    saveChanges,
    discardChanges,
    hasUnsavedChanges,
  } = useFixState()

  // Commit is the final review — strip the per-row issue lists so the
  // Status pip reads clean for every record.
  const cleanCroppingRecords = useMemo(
    () => croppingRecords.map((r) => ({ ...r, issues: [] })),
    [croppingRecords],
  )
  const cleanOperationRecords = useMemo(
    () => operationRecords.map((r) => ({ ...r, issues: [] })),
    [operationRecords],
  )

  /* ---------- Filter + search state ------------------------------------- */
  const [filterOpen, setFilterOpen] = useState(false)
  const [farmFilter, setFarmFilter] = useState<string[]>([])
  const [fieldFilter, setFieldFilter] = useState<string[]>([])
  const [enterpriseFilter, setEnterpriseFilter] = useState<string[]>([])
  const [cropFilter, setCropFilter] = useState<string[]>([])
  const [query, setQuery] = useState('')

  const allFarms = useMemo(() => {
    const s = new Set<string>()
    for (const r of cleanCroppingRecords) s.add(r.farmName)
    for (const r of cleanOperationRecords) s.add(r.farmName)
    return [...s].sort()
  }, [cleanCroppingRecords, cleanOperationRecords])
  const allFields = useMemo(() => {
    const s = new Set<string>()
    for (const r of cleanCroppingRecords) s.add(r.fieldName)
    for (const r of cleanOperationRecords) s.add(r.fieldName)
    return [...s].sort()
  }, [cleanCroppingRecords, cleanOperationRecords])
  const allCrops = useMemo(() => {
    const s = new Set<string>()
    for (const r of cleanCroppingRecords) if (r.cropName) s.add(r.cropName)
    return [...s].sort()
  }, [cleanCroppingRecords])

  const matchesFilters = (
    farmName: string,
    fieldName: string,
    enterprise: Enterprise,
    cropName: string | null,
    searchable: string,
  ): boolean => {
    if (farmFilter.length > 0 && !farmFilter.includes(farmName)) return false
    if (fieldFilter.length > 0 && !fieldFilter.includes(fieldName)) return false
    if (enterpriseFilter.length > 0 && !enterpriseFilter.includes(enterprise))
      return false
    if (cropFilter.length > 0) {
      if (!cropName || !cropFilter.includes(cropName)) return false
    }
    const q = query.trim().toLowerCase()
    if (q && !searchable.toLowerCase().includes(q)) return false
    return true
  }

  const filteredCropping = useMemo(
    () =>
      cleanCroppingRecords.filter((r) =>
        matchesFilters(
          r.farmName,
          r.fieldName,
          enterpriseForCropping(r),
          r.cropName ?? null,
          [
            r.farmName,
            r.fieldName,
            r.cropName,
            r.cropVariety,
            r.cropType,
            r.tillage,
            String(r.harvestYear ?? ''),
          ]
            .filter(Boolean)
            .join(' '),
        ),
      ),
    // biome-ignore lint/correctness/useExhaustiveDependencies: matchesFilters is closure-stable enough
    [
      cleanCroppingRecords,
      farmFilter,
      fieldFilter,
      enterpriseFilter,
      cropFilter,
      query,
    ],
  )
  const filteredOperations = useMemo(
    () =>
      cleanOperationRecords.filter((r) =>
        matchesFilters(
          r.farmName,
          r.fieldName,
          enterpriseForOperation(r),
          null,
          [
            r.farmName,
            r.fieldName,
            r.operationGroup,
            r.operationType,
            r.productName,
            String(r.harvestYear ?? ''),
          ]
            .filter(Boolean)
            .join(' '),
        ),
      ),
    // biome-ignore lint/correctness/useExhaustiveDependencies: matchesFilters is closure-stable enough
    [
      cleanOperationRecords,
      farmFilter,
      fieldFilter,
      enterpriseFilter,
      cropFilter,
      query,
    ],
  )

  const activeFilterCount =
    farmFilter.length +
    fieldFilter.length +
    enterpriseFilter.length +
    cropFilter.length
  const clearFilters = () => {
    setFarmFilter([])
    setFieldFilter([])
    setEnterpriseFilter([])
    setCropFilter([])
  }

  /* ---------- Selection + edit state ------------------------------------ */
  const [croppingSelection, setCroppingSelection] = useState<Set<string>>(
    () => new Set(),
  )
  const [operationSelection, setOperationSelection] = useState<Set<string>>(
    () => new Set(),
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [validating, setValidating] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)

  const activeSelectionCount =
    tab === 'cropping' ? croppingSelection.size : operationSelection.size

  const selectedCroppingRecords = useMemo(
    () => croppingRecords.filter((r) => croppingSelection.has(r.id)),
    [croppingRecords, croppingSelection],
  )
  const selectedOperationRecords = useMemo(
    () => operationRecords.filter((r) => operationSelection.has(r.id)),
    [operationRecords, operationSelection],
  )

  const clearActiveSelection = () => {
    if (tab === 'cropping') setCroppingSelection(new Set())
    else setOperationSelection(new Set())
  }

  const openSingleCroppingEditor = (rowId: string) => {
    setCroppingSelection(new Set([rowId]))
    setEditorOpen(true)
  }
  const openSingleOperationEditor = (rowId: string) => {
    setOperationSelection(new Set([rowId]))
    setEditorOpen(true)
  }

  const applyCroppingPatch = (patch: Partial<CroppingRecord>) => {
    patchCropping(croppingSelection, patch)
    setEditorOpen(false)
    setCroppingSelection(new Set())
  }
  const applyOperationPatch = (patch: Partial<OperationRecord>) => {
    patchOperations(operationSelection, patch)
    setEditorOpen(false)
    setOperationSelection(new Set())
  }

  const confirmDelete = () => {
    if (tab === 'cropping') {
      removeCropping(croppingSelection)
      setCroppingSelection(new Set())
    } else {
      removeOperations(operationSelection)
      setOperationSelection(new Set())
    }
    setDeleteConfirmOpen(false)
  }

  const handleSaveChanges = () => {
    // Dim the table + show a loader while we "re-validate" the changes.
    // 900ms ≈ the FixLoader cadence so the surfaces feel related.
    setValidating(true)
    window.setTimeout(() => {
      saveChanges()
      setValidating(false)
    }, 900)
  }

  /* ---------- Column defs ----------------------------------------------- */
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

  // Headline stats — same shape as the Fix-issues summary tiles so the
  // commit step reads as the closing beat of the same conversation.
  const summary = useMemo(() => {
    const farms = new Set<string>()
    const fields = new Set<string>()
    for (const r of croppingRecords) {
      farms.add(r.farmName)
      fields.add(`${r.farmName}::${r.fieldName}`)
    }
    for (const r of operationRecords) {
      farms.add(r.farmName)
      fields.add(`${r.farmName}::${r.fieldName}`)
    }
    return {
      totalRecords: croppingRecords.length + operationRecords.length,
      croppingCount: croppingRecords.length,
      operationCount: operationRecords.length,
      farms: farms.size,
      fields: fields.size,
    }
  }, [croppingRecords, operationRecords])

  // The wizard's top-bar "Save to Sandy" button dispatches a custom
  // event — listen for it and open our confirmation modal. We ignore the
  // event whenever we're already past the review stage so a re-trigger
  // can't bounce the user out of the committing screen.
  useEffect(() => {
    const onRequest = () => {
      // Skip the interstitial confirmation modal — jump straight into the
      // committing animation so the user only sees one decision (the
      // wizard's Save to Sandy button) followed by the loader.
      if (stageRef.current === 'review') setStage('committing')
    }
    window.addEventListener(COMMIT_REQUEST_EVENT, onRequest)
    return () => window.removeEventListener(COMMIT_REQUEST_EVENT, onRequest)
  }, [])

  // Simulated commit: ~2.4s of fake "uploading", then a brief "done" beat
  // before we bounce home. Mirrors the FixLoader cadence so the two
  // surfaces feel like the same conversation.
  useEffect(() => {
    if (stage !== 'committing') return
    const t = window.setTimeout(() => setStage('done'), 2400)
    return () => window.clearTimeout(t)
  }, [stage])

  useEffect(() => {
    if (stage !== 'done') return
    // Linger on the success screen so the user has a beat to read it and
    // a chance to bounce out early via the Continue button. Auto-redirects
    // at the end of the window if they don't act.
    const t = window.setTimeout(() => navigate('/'), 10_000)
    return () => window.clearTimeout(t)
  }, [stage, navigate])

  if (stage === 'committing' || stage === 'done') {
    return (
      <CommitProgress
        stage={stage}
        totalRecords={summary.totalRecords}
        onContinue={() => navigate('/')}
      />
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-bg-primary pb-24">
      {/* Header + body share the same `max-w-[1200px]` clamp + `px-8`
          padding as the Anomaly detection + Completeness steps so all
          three wizard surfaces feel like one page. */}
      <section>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-8 py-10">
          <h1 className="text-3xl font-semibold text-text-primary">
            Here's what you're adding to Sandy.
          </h1>
          <p className="max-w-[640px] text-md text-text-secondary">
            Final review — nothing is saved to your farm record until you hit
            Save to Sandy.
          </p>
        </div>
      </section>

      {/* Save / discard bar — same shape as the Fix-issues page. Sits
          above the toolbar when there are pending edits. */}
      {hasUnsavedChanges ? (
        <div className="sticky top-[88px] z-20 border-b-2 border-border-tertiary bg-bg-primary">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-end gap-2 px-8 py-3">
            <Button
              variant="secondary"
              onClick={discardChanges}
              disabled={validating}
            >
              Discard changes
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveChanges}
              disabled={validating}
            >
              Save changes
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-8 pt-8">
        <Tabs<CommitTab> value={tab} onValueChange={setTab}>
          <TabBar>
            <Tab value="cropping">
              Cropping ({filteredCropping.length.toLocaleString()})
            </Tab>
            <Tab value="operations">
              Operations ({filteredOperations.length.toLocaleString()})
            </Tab>
          </TabBar>

          {/* Toolbar — search + filter popover + Excel download. Lives
              outside the TabPanels so the same chrome serves both tabs. */}
          <div className="relative flex flex-wrap items-center gap-3 pt-4">
            <div className="min-w-[260px] flex-1">
              <TextInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search records…"
                aria-label="Search records"
                leadingIcon={<IconSearch size={16} />}
              />
            </div>
            <FilterPopover
              open={filterOpen}
              onOpenChange={setFilterOpen}
              activeCount={activeFilterCount}
              onClear={clearFilters}
              farms={allFarms}
              farmValue={farmFilter}
              onFarmChange={setFarmFilter}
              fields={allFields}
              fieldValue={fieldFilter}
              onFieldChange={setFieldFilter}
              enterprises={(Object.keys(ENTERPRISE_LABEL) as Enterprise[]).map(
                (e) => ({ value: e, label: ENTERPRISE_LABEL[e] }),
              )}
              enterpriseValue={enterpriseFilter}
              onEnterpriseChange={setEnterpriseFilter}
              crops={allCrops}
              cropValue={cropFilter}
              onCropChange={setCropFilter}
            />
            <Button
              variant="secondary"
              leadingIcon={<IconDownload size={16} />}
              onClick={() => setDownloadOpen(true)}
            >
              Download Excel
            </Button>
          </div>

          <TabPanel value="cropping" className="pt-4">
            <div
              className={clsx(
                'relative transition-opacity duration-200',
                validating && 'opacity-40',
              )}
            >
              <DataTable<CroppingRecord>
                rows={filteredCropping}
                columns={croppingCols}
                selectable
                defaultPageSize={25}
                pageSizeOptions={[25, 50, 100]}
                isRowSelectable={({ row }) => !removedCroppingIds.has(row.id)}
                rowSelectionModel={{
                  type: 'include',
                  ids: croppingSelection,
                }}
                onRowSelectionModelChange={(model) => {
                  setCroppingSelection(
                    new Set(Array.from(model.ids).map(String)),
                  )
                }}
              />
              {validating ? <TableLoaderOverlay /> : null}
            </div>
          </TabPanel>
          <TabPanel value="operations" className="pt-4">
            <div
              className={clsx(
                'relative transition-opacity duration-200',
                validating && 'opacity-40',
              )}
            >
              <DataTable<OperationRecord>
                rows={filteredOperations}
                columns={operationCols}
                selectable
                defaultPageSize={25}
                pageSizeOptions={[25, 50, 100]}
                isRowSelectable={({ row }) => !removedOperationIds.has(row.id)}
                rowSelectionModel={{
                  type: 'include',
                  ids: operationSelection,
                }}
                onRowSelectionModelChange={(model) => {
                  setOperationSelection(
                    new Set(Array.from(model.ids).map(String)),
                  )
                }}
              />
              {validating ? <TableLoaderOverlay /> : null}
            </div>
          </TabPanel>
        </Tabs>
      </div>

      {activeSelectionCount > 0 ? (
        <SelectionActionBar
          count={activeSelectionCount}
          recordLabel={tab === 'cropping' ? 'cropping record' : 'operation'}
          onEdit={() => setEditorOpen(true)}
          onDelete={() => setDeleteConfirmOpen(true)}
          onClear={clearActiveSelection}
        />
      ) : null}

      {tab === 'cropping' ? (
        <RecordEditorSheet<CroppingRecord>
          open={editorOpen}
          onOpenChange={setEditorOpen}
          records={selectedCroppingRecords}
          fields={CROPPING_FIELD_FIELDS}
          recordLabel="cropping record"
          onSave={applyCroppingPatch}
          getProvenance={(row) => row.provenance}
        />
      ) : (
        <RecordEditorSheet<OperationRecord>
          open={editorOpen}
          onOpenChange={setEditorOpen}
          records={selectedOperationRecords}
          fields={buildOperationFieldFields(selectedOperationRecords)}
          recordLabel="operation"
          onSave={applyOperationPatch}
          getProvenance={(row) => row.provenance}
        />
      )}

      <Modal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${activeSelectionCount} ${
          activeSelectionCount === 1 ? 'record' : 'records'
        }?`}
        description="The selected rows will be marked for removal. Save or discard your changes before saving to Sandy."
        maxWidth="440px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
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
          Deleted rows stay visible until you save — they appear with a
          strikethrough so you can review the change first.
        </p>
      </Modal>

      <DownloadTemplateModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        mode="issues"
        defaultEnterprise="arable"
        issueSummary={{
          records: summary.totalRecords,
          issues: 0,
        }}
      />

      <Modal
        open={stage === 'confirming'}
        onOpenChange={(next) => {
          if (!next) setStage('review')
        }}
        title="Save to Sandy?"
        description={`We'll add ${summary.totalRecords.toLocaleString()} records (${summary.croppingCount.toLocaleString()} cropping, ${summary.operationCount.toLocaleString()} operations) to your farm record across ${summary.farms} ${summary.farms === 1 ? 'farm' : 'farms'}.`}
        maxWidth="480px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStage('review')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setStage('committing')}>
              Yes, save to Sandy
            </Button>
          </>
        }
      >
        <p className="text-md text-text-secondary">
          Once committed, the records become part of your live Sandy data —
          we'll bounce you back to your dashboard when it's done.
        </p>
      </Modal>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* CommitProgress — full-page loader + success state                          */
/*                                                                             */
/* Mirrors the styling of FixLoader / FixIntro on the Fix page so the commit  */
/* feels like the same conversation.                                          */
/* -------------------------------------------------------------------------- */

const CommitProgress = ({
  stage,
  totalRecords,
  onContinue,
}: {
  stage: 'committing' | 'done'
  totalRecords: number
  onContinue: () => void
}) => {
  if (stage === 'committing') {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-bg-primary px-8 py-16">
        <div className="flex max-w-[480px] flex-col items-center gap-6 text-center">
          <ThinkingDots />
          <p
            aria-live="polite"
            className="commit-loader-message text-md text-text-secondary"
          >
            Saving {totalRecords.toLocaleString()} records to Sandy…
          </p>
          <style>{`
            @keyframes commit-loader-dot {
              0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
              40% { opacity: 1; transform: scale(1); }
            }
            .commit-loader-dot {
              animation: commit-loader-dot 1.2s ease-in-out infinite;
            }
            @keyframes commit-loader-fade {
              from { opacity: 0; transform: translateY(2px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .commit-loader-message {
              animation: commit-loader-fade 250ms ease-out;
            }
          `}</style>
        </div>
      </div>
    )
  }
  // done
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center bg-bg-primary px-8 py-16">
      <div className="flex max-w-[640px] flex-col items-center gap-10 text-center">
        <CompletedTick />
        <h1
          className="max-w-[560px] text-5xl font-medium leading-[1.05] tracking-tight text-text-primary animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          Saved to Sandy
        </h1>
        <p
          className="max-w-[460px] text-md leading-relaxed text-text-secondary animate-fade-up"
          style={{ animationDelay: '440ms' }}
        >
          {totalRecords.toLocaleString()} records are now part of your farm
          record. We'll bounce you back to your dashboard in a moment.
        </p>
        <div className="animate-fade-up" style={{ animationDelay: '560ms' }}>
          <Button variant="primary" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* FilterPopover — anchored multi-select panel above the data table            */
/* -------------------------------------------------------------------------- */

type FilterPopoverProps = {
  open: boolean
  onOpenChange: (next: boolean) => void
  activeCount: number
  onClear: () => void
  farms: string[]
  farmValue: string[]
  onFarmChange: (next: string[]) => void
  fields: string[]
  fieldValue: string[]
  onFieldChange: (next: string[]) => void
  enterprises: { value: string; label: string }[]
  enterpriseValue: string[]
  onEnterpriseChange: (next: string[]) => void
  crops: string[]
  cropValue: string[]
  onCropChange: (next: string[]) => void
}

const FilterPopover = ({
  open,
  onOpenChange,
  activeCount,
  onClear,
  farms,
  farmValue,
  onFarmChange,
  fields,
  fieldValue,
  onFieldChange,
  enterprises,
  enterpriseValue,
  onEnterpriseChange,
  crops,
  cropValue,
  onCropChange,
}: FilterPopoverProps) => (
  <div className="relative">
    <Button
      variant="secondary"
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      leadingIcon={<IconFilter size={16} />}
    >
      Filters
      {activeCount > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sandy-900 px-1.5 text-xs font-semibold text-text-primary-inverse">
          {activeCount}
        </span>
      ) : null}
    </Button>
    {open ? (
      <>
        {/* Backdrop catches outside clicks so the popover dismisses
            cleanly. Stays transparent so the page underneath reads
            through. */}
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-10 cursor-default"
        />
        <div
          role="dialog"
          aria-label="Filter records"
          className="absolute right-0 top-full z-20 mt-2 flex w-[360px] flex-col gap-4 rounded-xl border-2 border-border-tertiary bg-bg-primary p-5 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-md font-semibold text-text-primary">Filters</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClear}
              disabled={activeCount === 0}
            >
              Clear all
            </Button>
          </div>
          <MultiSelect<string>
            label="Farm"
            items={farms.map((f) => ({ value: f, label: f }))}
            value={farmValue}
            onValueChange={onFarmChange}
            placeholder="Any farm"
          />
          <MultiSelect<string>
            label="Field"
            items={fields.map((f) => ({ value: f, label: f }))}
            value={fieldValue}
            onValueChange={onFieldChange}
            placeholder="Any field"
          />
          <MultiSelect<string>
            label="Enterprise"
            items={enterprises}
            value={enterpriseValue}
            onValueChange={onEnterpriseChange}
            placeholder="Any enterprise"
          />
          <MultiSelect<string>
            label="Crop"
            items={crops.map((c) => ({ value: c, label: c }))}
            value={cropValue}
            onValueChange={onCropChange}
            placeholder="Any crop"
          />
        </div>
      </>
    ) : null}
  </div>
)

/* -------------------------------------------------------------------------- */
/* TableLoaderOverlay — covers a dimmed table during re-validation            */
/* -------------------------------------------------------------------------- */

const TableLoaderOverlay = () => (
  <div className="pointer-events-none absolute inset-0 grid place-items-center">
    <div className="flex items-center gap-3 rounded-full bg-bg-primary px-4 py-2 shadow-md">
      <Spinner size={18} className="text-text-secondary" />
      <p className="text-sm font-medium text-text-primary">
        Re-validating your changes…
      </p>
    </div>
  </div>
)

const ThinkingDots = () => (
  <div className="flex items-center gap-2" aria-hidden="true">
    <span
      className="commit-loader-dot size-3 rounded-full bg-sandy-400"
      style={{ animationDelay: '0s' }}
    />
    <span
      className="commit-loader-dot size-3 rounded-full bg-sandy-400"
      style={{ animationDelay: '0.2s' }}
    />
    <span
      className="commit-loader-dot size-3 rounded-full bg-sandy-400"
      style={{ animationDelay: '0.4s' }}
    />
  </div>
)

const CompletedTick = () => (
  <span
    aria-hidden="true"
    className="grid size-20 place-items-center rounded-full bg-sandy-300 shadow-md animate-fade-up"
  >
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <title>Saved</title>
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="#0a0a0a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
)
