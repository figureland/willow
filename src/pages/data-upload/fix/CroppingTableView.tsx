import { useMemo } from 'react'
import { DataTable, type GridColDef } from '../../../components/ui'
import { CROPPING_RECORDS, type CroppingRecord } from './fix-records'
import { worstSeverity } from './row-issues'
import { rowMatchesSeverity, useSeverityFilter } from './use-severity-filter'

/* -------------------------------------------------------------------------- */
/* Dense cropping grid — shows every cropping record in the upload            */
/* -------------------------------------------------------------------------- */

const MissingCell = () => <span className="text-text-secondary">—</span>

const COLUMNS: GridColDef<CroppingRecord>[] = [
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

export const CroppingTableView = () => {
  const filter = useSeverityFilter()
  const rows = useMemo(
    () => CROPPING_RECORDS.filter((r) => rowMatchesSeverity(r.issues, filter)),
    [filter],
  )
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-8 py-10">
      <DataTable<CroppingRecord>
        rows={rows}
        columns={COLUMNS}
        selectable={false}
        defaultPageSize={25}
        pageSizeOptions={[25, 50, 100]}
        getRowClassName={({ row }) => {
          const sev = worstSeverity(row.issues)
          if (sev === 'blocking') return 'row-issue-blocking'
          if (sev === 'warning') return 'row-issue-warning'
          return ''
        }}
      />
    </div>
  )
}
