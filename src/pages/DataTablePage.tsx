import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell'
import { DataTable, type GridColDef } from '../components/ui'

type Grower = {
  id: string
  grower: string
  supplyShare: string
  crop: string
  ncvPnl: number
  valueAtRisk: number
  risk: 'low' | 'medium' | 'high'
}

const SAMPLE_ROWS: Grower[] = Array.from({ length: 21 }, (_, i) => {
  const idNum = 139 - i * 3
  const crops = ['Soybean', 'Grain maize', 'Winter wheat', 'Spring barley']
  const crop = crops[i % crops.length]
  const supplyShares = ['1%', '3%', '6%', '10%', '24%', '68%']
  const risks: Grower['risk'][] = ['low', 'medium', 'high']
  return {
    id: `G-${idNum}`,
    grower: `Grower ID-${idNum}`,
    supplyShare: supplyShares[i % supplyShares.length],
    crop,
    ncvPnl: 420 - i * 13,
    valueAtRisk: 11 + (i % 7),
    risk: risks[i % risks.length],
  }
})

const RiskDot = ({ level }: { level: Grower['risk'] }) => {
  const tone =
    level === 'high'
      ? 'bg-support-fg-red border-support-border-red'
      : level === 'low'
        ? 'bg-support-fg-green border-support-border-green'
        : 'bg-support-fg-amber border-support-border-amber'
  return (
    <span
      className={`inline-block size-3 rounded-full border-2 ${tone}`}
      aria-hidden="true"
    />
  )
}

export const DataTablePage = () => {
  const navigate = useNavigate()

  const columns = useMemo<GridColDef<Grower>[]>(
    () => [
      {
        field: 'grower',
        headerName: 'Grower',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => (
          <span className="flex flex-col leading-tight">
            <span className="text-text-primary">{row.grower}</span>
            <span className="text-text-secondary">{row.supplyShare}</span>
          </span>
        ),
      },
      {
        field: 'crop',
        headerName: 'Crop',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => row.crop,
      },
      {
        field: 'ncvPnl',
        headerName: 'NCV P&L',
        flex: 1,
        minWidth: 140,
        type: 'number',
        valueFormatter: (value: number) => `$${value}`,
      },
      {
        field: 'valueAtRisk',
        headerName: 'Value at risk',
        flex: 1,
        minWidth: 180,
        sortComparator: (a: number, b: number) => a - b,
        renderCell: ({ row }) => (
          <span className="flex items-center gap-3">
            <RiskDot level={row.risk} />
            <span>${row.valueAtRisk}/acre</span>
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <AppShell
      header={{
        title: 'Data table',
        onBack: () => navigate(-1),
      }}
    >
      <DataTable
        rows={SAMPLE_ROWS}
        columns={columns}
        defaultPageSize={5}
        pageSizeOptions={[5, 10, 20]}
      />
    </AppShell>
  )
}
