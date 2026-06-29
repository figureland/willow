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
} from '../../../components/ui'
import { actionColumn, SelectionActionBar, statusColumn } from './fix-grid-bits'
import type { CroppingRecord, OperationRecord } from './fix-records'
import { useFixState } from './fix-state'
import { type EditableField, RecordEditorSheet } from './RecordEditorSheet'
import {
  CROP_TYPE_ITEMS,
  farmFieldPatchByIds,
  farmIdForRow,
  farmItems,
  fieldIdForRow,
  fieldItemsForFarm,
  operationTypeItemsFor,
} from './record-editor-options'
import { type RowIssue, worstSeverity } from './row-issues'
import { rowMatchesSeverity, useSeverityFilter } from './use-severity-filter'

/* -------------------------------------------------------------------------- */
/* Data table — Cropping / Operations / Soil tabs over the full record set    */
/* -------------------------------------------------------------------------- */

const MissingCell = () => <span className="text-text-secondary">—</span>

/**
 * Resolve a per-row CSS class for the grid row. Removed rows and edited rows
 * outrank severity tints — the user's intent is the strongest signal once
 * they've touched the data.
 */
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

const buildCroppingColumns = (
  edited: Set<string>,
  removed: Set<string>,
  onPipClick: (rowId: string) => void,
): GridColDef<CroppingRecord>[] => [
  statusColumn<CroppingRecord>(removed, undefined, onPipClick),
  actionColumn<CroppingRecord>(edited, removed),
  ...CROPPING_COLUMNS,
]

const buildOperationColumns = (
  edited: Set<string>,
  removed: Set<string>,
  onPipClick: (rowId: string) => void,
): GridColDef<OperationRecord>[] => [
  statusColumn<OperationRecord>(removed, undefined, onPipClick),
  actionColumn<OperationRecord>(edited, removed),
  ...OPERATION_COLUMNS,
]

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
    field: 'cropType',
    headerName: 'Type',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.cropType === null ? <MissingCell /> : row.cropType,
  },
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
    field: 'tillage',
    headerName: 'Tillage',
    flex: 0.9,
    minWidth: 130,
    renderCell: ({ row }) =>
      row.tillage === null ? <MissingCell /> : row.tillage,
  },
  {
    field: 'yield',
    headerName: 'Yield (t/ha)',
    type: 'number',
    flex: 0.8,
    minWidth: 120,
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
    minWidth: 130,
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
    minWidth: 130,
    renderCell: ({ row }) =>
      row.harvestDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.harvestDate}</span>
      ),
  },
  {
    field: 'totalYield',
    headerName: 'Total (t)',
    type: 'number',
    flex: 0.8,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.totalYield === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.totalYield.toFixed(1)}</span>
      ),
  },
]

/* -------------------------------------------------------------------------- */
/* Operations columns                                                          */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Editable field schemas                                                      */
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

const CROPPING_FIELDS: EditableField<CroppingRecord>[] = [
  {
    kind: 'farm-field',
    key: '__farm_field',
    label: 'Farm and field',
    farmItems,
    fieldItemsFor: fieldItemsForFarm,
    readFarmId: farmIdForRow,
    readFieldId: fieldIdForRow,
    write: (farmId, fieldId) =>
      farmFieldPatchByIds<CroppingRecord>(farmId, fieldId),
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

const buildOperationFields = (
  records: OperationRecord[],
): EditableField<OperationRecord>[] => [
  {
    kind: 'farm-field',
    key: '__farm_field',
    label: 'Farm and field',
    farmItems,
    fieldItemsFor: fieldItemsForFarm,
    readFarmId: farmIdForRow,
    readFieldId: fieldIdForRow,
    write: (farmId, fieldId) =>
      farmFieldPatchByIds<OperationRecord>(farmId, fieldId),
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
    // Pull the canonical type list from the rows the user is editing so the
    // dropdown stays scoped to the relevant operation group.
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

/**
 * Collect every field key flagged as broken across a set of records — feeds
 * `RecordEditorSheet.invalidKeys` so the editor outlines the matching inputs
 * in red the moment it opens. Farm/Field issues map onto the composite
 * `__farm_field` key.
 */
const collectInvalidKeys = (records: { issues: RowIssue[] }[]): string[] => {
  const set = new Set<string>()
  for (const r of records) {
    for (const issue of r.issues ?? []) {
      if (!issue.columnName) continue
      if (issue.columnName === 'farmName' || issue.columnName === 'fieldName') {
        set.add('__farm_field')
      } else {
        set.add(issue.columnName)
      }
    }
  }
  return [...set]
}

/* -------------------------------------------------------------------------- */
/* Tab plumbing                                                                */
/* -------------------------------------------------------------------------- */

type DataTab = 'cropping' | 'operations' | 'soil'

const isDataTab = (v: string | null): v is DataTab =>
  v === 'cropping' || v === 'operations' || v === 'soil'

/* -------------------------------------------------------------------------- */
/* View                                                                        */
/* -------------------------------------------------------------------------- */

export const DataTableView = () => {
  const filter = useSeverityFilter()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('dataTab')
  const tab: DataTab = isDataTab(rawTab) ? rawTab : 'cropping'
  const setTab = (next: DataTab) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'cropping') params.delete('dataTab')
    else params.set('dataTab', next)
    setSearchParams(params, { replace: true })
  }

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
  } = useFixState()

  const croppingRows = useMemo(
    () => croppingRecords.filter((r) => rowMatchesSeverity(r.issues, filter)),
    [croppingRecords, filter],
  )
  const operationRows = useMemo(
    () => operationRecords.filter((r) => rowMatchesSeverity(r.issues, filter)),
    [operationRecords, filter],
  )

  // Selection state per tab so switching doesn't clobber the other tab's
  // pending selection. `Set<string>` keeps lookups O(1).
  const [croppingSelection, setCroppingSelection] = useState<Set<string>>(
    () => new Set(),
  )
  const [operationSelection, setOperationSelection] = useState<Set<string>>(
    () => new Set(),
  )

  const activeSelectionCount =
    tab === 'cropping'
      ? croppingSelection.size
      : tab === 'operations'
        ? operationSelection.size
        : 0

  const [editorOpen, setEditorOpen] = useState(false)

  // Clicking the status pip on a row opens the editor scoped to just that
  // row — same flow as selecting + Edit, but one click instead of two.
  const openSingleCroppingEditor = (rowId: string) => {
    setCroppingSelection(new Set([rowId]))
    setEditorOpen(true)
  }
  const openSingleOperationEditor = (rowId: string) => {
    setOperationSelection(new Set([rowId]))
    setEditorOpen(true)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: openSingleCroppingEditor is stable enough — recreating the column defs every render defeats the memo
  const croppingColumns = useMemo(
    () =>
      buildCroppingColumns(
        editedCroppingIds,
        removedCroppingIds,
        openSingleCroppingEditor,
      ),
    [editedCroppingIds, removedCroppingIds],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: openSingleOperationEditor is stable enough — recreating the column defs every render defeats the memo
  const operationColumns = useMemo(
    () =>
      buildOperationColumns(
        editedOperationIds,
        removedOperationIds,
        openSingleOperationEditor,
      ),
    [editedOperationIds, removedOperationIds],
  )
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

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
    else if (tab === 'operations') setOperationSelection(new Set())
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
    } else if (tab === 'operations') {
      removeOperations(operationSelection)
      setOperationSelection(new Set())
    }
    setDeleteConfirmOpen(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-8 pb-24">
      <Tabs<DataTab> value={tab} onValueChange={setTab}>
        <TabBar>
          <Tab value="cropping">Cropping</Tab>
          <Tab value="operations">Operations</Tab>
          <Tab value="soil">Soil</Tab>
        </TabBar>
        <TabPanel value="cropping" className="pt-4">
          <DataTable<CroppingRecord>
            rows={croppingRows}
            columns={croppingColumns}
            selectable
            defaultPageSize={25}
            pageSizeOptions={[25, 50, 100]}
            getRowClassName={({ row }) =>
              computeRowClass({
                row,
                edited: editedCroppingIds,
                removed: removedCroppingIds,
              })
            }
            isRowSelectable={({ row }) => !removedCroppingIds.has(row.id)}
            rowSelectionModel={{
              type: 'include',
              ids: croppingSelection,
            }}
            onRowSelectionModelChange={(model) => {
              setCroppingSelection(new Set(Array.from(model.ids).map(String)))
            }}
          />
        </TabPanel>
        <TabPanel value="operations" className="pt-4">
          <DataTable<OperationRecord>
            rows={operationRows}
            columns={operationColumns}
            selectable
            defaultPageSize={25}
            pageSizeOptions={[25, 50, 100]}
            getRowClassName={({ row }) =>
              computeRowClass({
                row,
                edited: editedOperationIds,
                removed: removedOperationIds,
              })
            }
            isRowSelectable={({ row }) => !removedOperationIds.has(row.id)}
            rowSelectionModel={{
              type: 'include',
              ids: operationSelection,
            }}
            onRowSelectionModelChange={(model) => {
              setOperationSelection(new Set(Array.from(model.ids).map(String)))
            }}
          />
        </TabPanel>
        <TabPanel value="soil" className="pt-4">
          <SoilEmptyState />
        </TabPanel>
      </Tabs>

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
          fields={CROPPING_FIELDS}
          recordLabel="cropping record"
          onSave={applyCroppingPatch}
          getProvenance={(row) => row.provenance}
          invalidKeys={collectInvalidKeys(selectedCroppingRecords)}
        />
      ) : null}
      {tab === 'operations' ? (
        <RecordEditorSheet<OperationRecord>
          open={editorOpen}
          onOpenChange={setEditorOpen}
          records={selectedOperationRecords}
          fields={buildOperationFields(selectedOperationRecords)}
          recordLabel="operation"
          onSave={applyOperationPatch}
          getProvenance={(row) => row.provenance}
          invalidKeys={collectInvalidKeys(selectedOperationRecords)}
        />
      ) : null}

      <Modal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${activeSelectionCount} ${
          activeSelectionCount === 1 ? 'record' : 'records'
        }?`}
        description="This can't be undone. The selected rows will be removed from your upload."
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
          You'll lose any associated issues alongside the row data. Other tabs
          and selections are unaffected.
        </p>
      </Modal>
    </div>
  )
}

const SoilEmptyState = () => (
  <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-tertiary bg-bg-secondary px-8 py-16 text-center">
    <h3 className="text-lg font-semibold text-text-primary">
      No soil records yet
    </h3>
    <p className="max-w-[420px] text-md text-text-secondary">
      Upload soil sampling data to see it summarised here alongside your
      cropping and operations records.
    </p>
  </div>
)
