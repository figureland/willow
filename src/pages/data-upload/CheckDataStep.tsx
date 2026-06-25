import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  DataTable,
  type GridColDef,
  IconSearch,
  Modal,
  MultiSelect,
  Tab,
  TabBar,
  TabPanel,
  Tabs,
  TextInput,
} from '../../components/ui'
import { ActionCell, type ActionKind } from './ActionCell'
import {
  type IssueSeverity,
  issueFor,
  type RowIssue,
  worstSeverity,
} from './fix/row-issues'

/* -------------------------------------------------------------------------- */
/* Tab state                                                                   */
/* -------------------------------------------------------------------------- */

type TabId = 'cropping' | 'operations' | 'soil-sampling'

const TAB_IDS: TabId[] = ['cropping', 'operations', 'soil-sampling']

const isTabId = (v: string | null): v is TabId =>
  v !== null && (TAB_IDS as string[]).includes(v)

const pickAction = (i: number): ActionKind => {
  // Skew toward Edit so most rows are amendments; sprinkle add/delete.
  const m = i % 7
  if (m === 0) return 'add'
  if (m === 1) return 'delete'
  return 'edit'
}

/* -------------------------------------------------------------------------- */
/* Mock seed data — small pools the rows are composed from.                    */
/* -------------------------------------------------------------------------- */

const FARM_NAMES = ['Brookside Leys', 'Foxglove Hill', 'Amber Harvest Farm']

const FIELD_NAMES = [
  'Millpond',
  'Orchard Fold',
  "Cobbett's Hollow",
  'Mill Lane',
  'Saltway',
  'Stone Pightle',
  'Lower Coppice',
  'Top Meadow',
  'Long Acre',
  'Spinney',
  'River Bend',
  'South Ridge',
  'Hayrick',
  'Marlpit',
  'Old Barn Field',
]

const CROP_NAMES = [
  'Winter wheat',
  'Spring barley',
  'Winter oilseed rape',
  'Sugar beet',
  'Maize',
  'Potatoes maincrop',
  'Spring beans',
  'Grass ley',
  'Cover crop',
]

const CROP_TYPES = ['Main crop', 'Cover crop', 'Catch crop', 'Companion crop']

const CROP_VARIETIES: Record<string, string[]> = {
  'Winter wheat': ['Skyfall', 'Extase', 'Crusoe'],
  'Spring barley': ['Laureate', 'Planet', 'Diablo'],
  'Winter oilseed rape': ['Aurelia', 'DK Excited', 'Aviron'],
  'Sugar beet': ['Maverick', 'Daphna'],
  Maize: ['Pioneer P7034', 'Severus'],
  'Potatoes maincrop': ['Maris Piper', 'King Edward'],
  'Spring beans': ['Lynx', 'Vertigo'],
  'Grass ley': ['AberMagic', 'Tyrella'],
  'Cover crop': ['Clover mix', 'Mustard'],
}

const TILLAGE_METHODS = ['Conventional', 'Min-till', 'No-till', 'Strip-till']

const OPERATION_GROUPS = [
  'Crop Protection',
  'Nutrition',
  'Cultivation',
  'Establishment',
]

const OPERATION_TYPES: Record<string, string[]> = {
  'Crop Protection': ['Fungicides', 'Herbicides', 'Pesticides'],
  Nutrition: ['Manufactured Fertiliser', 'Organic Fertiliser', 'Foliar feed'],
  Cultivation: ['Deep plowing', 'Cultivation', 'Min-till'],
  Establishment: ['Seeding', 'Drilling'],
}

const PRODUCTS_BY_GROUP: Record<string, string[]> = {
  'Crop Protection': [
    'Roundup Flex',
    'Atlantis Star',
    'Aviator Xpro',
    'Karate Zeon',
  ],
  Nutrition: ['Yara Mila Actyva S', 'Nitram', 'CAN 27', 'DAP 18-46'],
  Cultivation: ['—'],
  Establishment: ['Seed'],
}

const UNITS_BY_GROUP: Record<string, string[]> = {
  'Crop Protection': ['L/ha', 'g/ha'],
  Nutrition: ['kg/ha', 't/ha'],
  Cultivation: ['—'],
  Establishment: ['kg/ha', 'units'],
}

const LAB_METHODS = [
  'Dumas combustion',
  'Walkley-Black',
  'Loss on ignition',
  'NIR spectroscopy',
]

/* -------------------------------------------------------------------------- */
/* Deterministic helpers — same row index → same row across renders            */
/* -------------------------------------------------------------------------- */

const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length]

/** Cheap LCG-style hash so values vary but stay deterministic per index. */
const hash = (i: number, salt: number) =>
  ((i + 1) * 9301 + salt * 49297) % 233280

const pickHashed = <T,>(arr: T[], i: number, salt: number): T =>
  arr[hash(i, salt) % arr.length]

const num = (
  i: number,
  salt: number,
  min: number,
  max: number,
  decimals = 0,
) => {
  const v = min + (hash(i, salt) / 233280) * (max - min)
  const factor = 10 ** decimals
  return Math.round(v * factor) / factor
}

const dateForYear = (year: number, dayOffset: number): string => {
  const start = new Date(Date.UTC(year, 0, 1))
  start.setUTCDate(start.getUTCDate() + dayOffset)
  return start.toISOString().slice(0, 10)
}

/** Sort rows by `farmName` (ascending, locale-aware). */
const sortByFarm = <Row extends { farmName: string }>(rows: Row[]): Row[] =>
  [...rows].sort((a, b) => a.farmName.localeCompare(b.farmName))

/**
 * Deterministically null a value out with the given probability. We use this
 * to seed each row's optional fields so the tables show realistic patches of
 * missing data — the same row index always produces the same gaps.
 */
const maybeMissing = <T,>(
  value: T,
  i: number,
  salt: number,
  p: number,
): T | null => (hash(i, salt) / 233280 < p ? null : value)

/** Em-dash rendered in secondary text for missing cells. */
const MissingCell = () => <span className="text-text-secondary">—</span>

/* -------------------------------------------------------------------------- */
/* Row-level rule checks (blocking / warning / note / ok)                      */
/* -------------------------------------------------------------------------- */

type RowStatus = 'blocking' | 'warning' | 'note' | 'ok'

/** Count of `null` fields among the supplied values. */
const missingCount = (...values: unknown[]) =>
  values.reduce<number>((acc, v) => acc + (v === null ? 1 : 0), 0)

/**
 * Reduce a per-row rule outcome into the three-tier status.
 *
 *   - blocking: a critical field is missing (must fix to proceed).
 *   - warning:  multiple secondary fields are missing (affects accuracy).
 *   - note:     at least one optional field is missing (Sandy will assume).
 *   - ok:       nothing missing.
 */
const statusOf = (rule: {
  blocking: boolean
  warningCount: number
  noteCount: number
}): RowStatus => {
  if (rule.blocking) return 'blocking'
  if (rule.warningCount >= 2) return 'warning'
  if (rule.warningCount >= 1 || rule.noteCount >= 1) return 'note'
  return 'ok'
}

/* -------------------------------------------------------------------------- */
/* Fix-column factory — shared sticky-left "fix" affordance for all 3 tabs    */
/* -------------------------------------------------------------------------- */

/**
 * Click handler stashed at module scope so the column's renderCell (which
 * is defined outside the component tree) can fire into the page's state.
 * Set by CheckDataStep on mount, called by each Fix cell.
 */
let onFixRowGlobal: ((row: { id: string; issues: RowIssue[] }) => void) | null =
  null

const fixColumn = <
  Row extends { id: string; issues: RowIssue[] },
>(): GridColDef<Row> => ({
  field: 'fix',
  headerName: '',
  width: 80,
  sortable: false,
  filterable: false,
  renderCell: ({ row }) => {
    if (!row.issues || row.issues.length === 0) {
      return (
        <span aria-hidden="true" className="text-text-secondary">
          ·
        </span>
      )
    }
    return (
      <button
        type="button"
        onClick={() => onFixRowGlobal?.(row)}
        className={clsx(
          'inline-flex items-center rounded-md border border-border-secondary bg-bg-primary px-3 py-1 text-sm font-medium text-text-primary transition-colors',
          'hover:bg-bg-secondary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
        )}
      >
        Fix
      </button>
    )
  },
})

/* -------------------------------------------------------------------------- */
/* Tab 2 — Cropping                                                            */
/* -------------------------------------------------------------------------- */

type CroppingRow = {
  id: string
  fieldName: string
  farmName: string
  harvestYear: number
  cropName: string
  cropType: string | null
  cropVariety: string | null
  cropId: string | null
  workingArea: number | null
  tillage: string | null
  yield: number | null
  strawYield: number | null
  plantingDate: string | null
  harvestDate: string | null
  totalYield: number | null
  harvestYield: number | null
  legumeMix: string | null
  status: RowStatus
  action: ActionKind
  issues: RowIssue[]
}

/** Classify a cropping row into the new issue model. Accepts the row's
 *  data fields — `status`, `action`, and `issues` are added later. */
type CroppingClassifierInput = Omit<CroppingRow, 'issues' | 'status' | 'action'>
const classifyCroppingRow = (row: CroppingClassifierInput): RowIssue[] => {
  const out: RowIssue[] = []
  if (row.workingArea === null)
    out.push(issueFor('required-missing', 'workingArea'))
  if (row.yield === null) out.push(issueFor('required-missing', 'yield'))
  if (row.cropType === null) out.push(issueFor('crop-type-unknown', 'cropType'))
  if (row.plantingDate && row.harvestDate && row.plantingDate > row.harvestDate)
    out.push(issueFor('planting-after-harvest', 'plantingDate'))
  if (
    row.harvestYield !== null &&
    row.totalYield !== null &&
    row.harvestYield > row.totalYield
  )
    out.push(issueFor('harvest-gt-total', 'harvestYield'))
  if (row.yield === 0) out.push(issueFor('yield-zero', 'yield'))
  // Deterministic "duplicate cropping" — every 11th row.
  if (row.id.endsWith('-10') || row.id.endsWith('-21'))
    out.push(issueFor('duplicate-cropping'))
  return out
}

type CroppingStatusInput = Pick<
  CroppingRow,
  | 'workingArea'
  | 'yield'
  | 'cropType'
  | 'tillage'
  | 'harvestDate'
  | 'cropVariety'
  | 'cropId'
  | 'plantingDate'
  | 'strawYield'
  | 'legumeMix'
  | 'totalYield'
  | 'harvestYield'
>
const croppingRowStatus = (row: CroppingStatusInput): RowStatus =>
  statusOf({
    // Working area and yield are the foundations of any cropping calculation.
    blocking: row.workingArea === null || row.yield === null,
    warningCount: missingCount(row.cropType, row.tillage, row.harvestDate),
    noteCount: missingCount(
      row.cropVariety,
      row.cropId,
      row.plantingDate,
      row.strawYield,
      row.legumeMix,
      row.totalYield,
      row.harvestYield,
    ),
  })

const CROPPING_ROWS: CroppingRow[] = sortByFarm(
  Array.from({ length: 24 }, (_, i) => {
    const cropName = pick(CROP_NAMES, i)
    const variety = pick(CROP_VARIETIES[cropName] ?? ['—'], i)
    const year = 2024 + (i % 3)
    const workingArea = num(i, 5, 2.5, 28, 1)
    const yieldVal = num(i, 6, 3.2, 11, 2)
    const totalYield = Math.round(yieldVal * workingArea * 10) / 10
    const harvestYield = Math.round(yieldVal * workingArea * 0.92 * 10) / 10
    const base = {
      id: `crop-${i}`,
      fieldName: pick(FIELD_NAMES, i),
      farmName: pick(FARM_NAMES, i),
      harvestYear: year,
      cropName,
      cropType: maybeMissing(pickHashed(CROP_TYPES, i, 7), i, 50, 0.3),
      cropVariety: maybeMissing(variety, i, 51, 0.4),
      cropId: maybeMissing(`CR-${(1000 + i).toString()}`, i, 52, 0.2),
      workingArea: maybeMissing(workingArea, i, 53, 0.15),
      tillage: maybeMissing(pickHashed(TILLAGE_METHODS, i, 8), i, 54, 0.45),
      yield: maybeMissing(yieldVal, i, 55, 0.3),
      strawYield: maybeMissing(num(i, 9, 1.8, 5, 2), i, 56, 0.55),
      plantingDate: maybeMissing(
        dateForYear(year - 1, 270 + (i % 30)),
        i,
        57,
        0.5,
      ),
      harvestDate: maybeMissing(dateForYear(year, 200 + (i % 30)), i, 58, 0.35),
      totalYield: maybeMissing(totalYield, i, 59, 0.4),
      harvestYield: maybeMissing(harvestYield, i, 60, 0.4),
      legumeMix: maybeMissing(i % 5 === 0 ? 'Yes' : 'No', i, 61, 0.6),
    }
    return {
      ...base,
      status: croppingRowStatus(base),
      action: pickAction(i),
      issues: classifyCroppingRow(base),
    }
  }),
)

const CROPPING_COLUMNS: GridColDef<CroppingRow>[] = [
  fixColumn<CroppingRow>(),
  { field: 'fieldName', headerName: 'Field', flex: 1, minWidth: 140 },
  {
    field: 'action',
    headerName: 'Action',
    flex: 0.6,
    minWidth: 100,
    sortable: true,
    renderCell: ({ row }) => <ActionCell action={row.action} />,
  },
  {
    field: 'harvestYear',
    headerName: 'Harvest year',
    type: 'number',
    flex: 0.7,
    minWidth: 120,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  { field: 'cropName', headerName: 'Crop name', flex: 1.1, minWidth: 160 },
  {
    field: 'cropType',
    headerName: 'Crop type',
    flex: 0.9,
    minWidth: 130,
    renderCell: ({ row }) =>
      row.cropType === null ? <MissingCell /> : row.cropType,
  },
  {
    field: 'cropVariety',
    headerName: 'Crop variety',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) =>
      row.cropVariety === null ? <MissingCell /> : row.cropVariety,
  },
  {
    field: 'cropId',
    headerName: 'Crop ID',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.cropId === null ? <MissingCell /> : row.cropId,
  },
  {
    field: 'workingArea',
    headerName: 'Working area (ha)',
    type: 'number',
    flex: 0.9,
    minWidth: 150,
    renderCell: ({ row }) =>
      row.workingArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.workingArea.toFixed(1)}</span>
      ),
  },
  {
    field: 'tillage',
    headerName: 'Tillage method',
    flex: 1,
    minWidth: 150,
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
    field: 'strawYield',
    headerName: 'Straw yield (t/ha)',
    type: 'number',
    flex: 0.9,
    minWidth: 150,
    renderCell: ({ row }) =>
      row.strawYield === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.strawYield.toFixed(2)}</span>
      ),
  },
  {
    field: 'plantingDate',
    headerName: 'Planting date',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) =>
      row.plantingDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.plantingDate}</span>
      ),
  },
  {
    field: 'harvestDate',
    headerName: 'Harvest date',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) =>
      row.harvestDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.harvestDate}</span>
      ),
  },
  {
    field: 'totalYield',
    headerName: 'Total yield (t)',
    type: 'number',
    flex: 0.9,
    minWidth: 140,
    renderCell: ({ row }) =>
      row.totalYield === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.totalYield.toFixed(1)}</span>
      ),
  },
  {
    field: 'harvestYield',
    headerName: 'Harvest yield (t)',
    type: 'number',
    flex: 0.9,
    minWidth: 150,
    renderCell: ({ row }) =>
      row.harvestYield === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.harvestYield.toFixed(1)}</span>
      ),
  },
  {
    field: 'legumeMix',
    headerName: 'Legume mix',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.legumeMix === null ? <MissingCell /> : row.legumeMix,
  },
]

/* -------------------------------------------------------------------------- */
/* Tab 3 — Operations                                                          */
/* -------------------------------------------------------------------------- */

type OperationRow = {
  id: string
  farmName: string
  fieldName: string
  harvestYear: number
  cropName: string
  cropType: string | null
  cropVariety: string | null
  cropId: string | null
  operationType: string
  operationGroup: string
  operationDate: string | null
  productName: string | null
  quantity: number | null
  unit: string | null
  appliedArea: number | null
  status: RowStatus
  action: ActionKind
  issues: RowIssue[]
}

type OperationClassifierInput = Omit<OperationRow, 'issues' | 'status'>
const classifyOperationRow = (row: OperationClassifierInput): RowIssue[] => {
  const out: RowIssue[] = []
  if (row.quantity === null) out.push(issueFor('required-missing', 'quantity'))
  if (row.unit === null) out.push(issueFor('required-missing', 'unit'))
  if (row.cropId === null)
    out.push(
      issueFor(
        'orphan-operation',
        'cropId',
        'No matching cropping record found.',
      ),
    )
  if (row.action === 'delete' && row.operationGroup === 'Crop Protection')
    out.push(issueFor('deletion-not-allowed'))
  if (row.appliedArea !== null && row.appliedArea > 30)
    out.push(issueFor('crop-area-exceeds-field', 'appliedArea'))
  // Sprinkle a duplicate warning so the demo surfaces the warning state.
  if (row.id.endsWith('-7') || row.id.endsWith('-19'))
    out.push(issueFor('duplicate-operation'))
  return out
}

type OperationStatusInput = Pick<
  OperationRow,
  | 'quantity'
  | 'unit'
  | 'productName'
  | 'appliedArea'
  | 'operationDate'
  | 'cropType'
  | 'cropVariety'
  | 'cropId'
>
const operationRowStatus = (row: OperationStatusInput): RowStatus =>
  statusOf({
    // Quantity and unit together describe the operation — neither makes
    // sense without the other, so missing either blocks downstream maths.
    blocking: row.quantity === null || row.unit === null,
    warningCount: missingCount(
      row.productName,
      row.appliedArea,
      row.operationDate,
    ),
    noteCount: missingCount(row.cropType, row.cropVariety, row.cropId),
  })

const OPERATIONS_ROWS: OperationRow[] = sortByFarm(
  Array.from({ length: 28 }, (_, i) => {
    const group = pick(OPERATION_GROUPS, i)
    const cropName = pick(CROP_NAMES, i + 1)
    const variety = pick(CROP_VARIETIES[cropName] ?? ['—'], i)
    const year = 2024 + (i % 3)
    const base = {
      id: `op-${i}`,
      farmName: pick(FARM_NAMES, i),
      fieldName: pick(FIELD_NAMES, i + 2),
      harvestYear: year,
      cropName,
      cropType: maybeMissing(pickHashed(CROP_TYPES, i, 11), i, 70, 0.35),
      cropVariety: maybeMissing(variety, i, 71, 0.4),
      cropId: maybeMissing(`CR-${(1100 + i).toString()}`, i, 72, 0.25),
      operationGroup: group,
      operationType: pick(OPERATION_TYPES[group] ?? ['—'], i),
      operationDate: maybeMissing(
        dateForYear(year, 90 + ((i * 11) % 180)),
        i,
        73,
        0.3,
      ),
      productName: maybeMissing(
        pick(PRODUCTS_BY_GROUP[group] ?? ['—'], i),
        i,
        74,
        0.35,
      ),
      quantity: maybeMissing(num(i, 13, 0.5, 220, 2), i, 75, 0.3),
      unit: maybeMissing(pick(UNITS_BY_GROUP[group] ?? ['—'], i), i, 76, 0.35),
      appliedArea: maybeMissing(num(i, 14, 2.5, 28, 1), i, 77, 0.4),
    }
    const action = pickAction(i)
    const withAction = { ...base, action }
    return {
      ...base,
      status: operationRowStatus(base),
      action,
      issues: classifyOperationRow(withAction),
    }
  }),
)

const OPERATIONS_COLUMNS: GridColDef<OperationRow>[] = [
  fixColumn<OperationRow>(),
  { field: 'fieldName', headerName: 'Field', flex: 1, minWidth: 140 },
  {
    field: 'action',
    headerName: 'Action',
    flex: 0.6,
    minWidth: 100,
    sortable: true,
    renderCell: ({ row }) => <ActionCell action={row.action} />,
  },
  {
    field: 'harvestYear',
    headerName: 'Harvest year',
    type: 'number',
    flex: 0.7,
    minWidth: 120,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  { field: 'cropName', headerName: 'Crop name', flex: 1.1, minWidth: 150 },
  {
    field: 'cropType',
    headerName: 'Crop type',
    flex: 0.9,
    minWidth: 130,
    renderCell: ({ row }) =>
      row.cropType === null ? <MissingCell /> : row.cropType,
  },
  {
    field: 'cropVariety',
    headerName: 'Crop variety',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) =>
      row.cropVariety === null ? <MissingCell /> : row.cropVariety,
  },
  {
    field: 'cropId',
    headerName: 'Crop ID',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.cropId === null ? <MissingCell /> : row.cropId,
  },
  {
    field: 'operationType',
    headerName: 'Operation type',
    flex: 1.1,
    minWidth: 160,
  },
  {
    field: 'operationGroup',
    headerName: 'Operation group',
    flex: 1.1,
    minWidth: 160,
  },
  {
    field: 'operationDate',
    headerName: 'Operation date',
    flex: 1,
    minWidth: 140,
    renderCell: ({ row }) =>
      row.operationDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.operationDate}</span>
      ),
  },
  {
    field: 'productName',
    headerName: 'Product name',
    flex: 1.2,
    minWidth: 170,
    renderCell: ({ row }) =>
      row.productName === null ? <MissingCell /> : row.productName,
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    flex: 0.8,
    minWidth: 120,
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
    flex: 0.6,
    minWidth: 90,
    renderCell: ({ row }) => (row.unit === null ? <MissingCell /> : row.unit),
  },
  {
    field: 'appliedArea',
    headerName: 'Applied area (ha)',
    type: 'number',
    flex: 0.9,
    minWidth: 150,
    renderCell: ({ row }) =>
      row.appliedArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.appliedArea.toFixed(1)}</span>
      ),
  },
]

/* -------------------------------------------------------------------------- */
/* Tab 4 — Soil sampling                                                       */
/* -------------------------------------------------------------------------- */

type SoilSamplingRow = {
  id: string
  fieldName: string
  farmName: string
  harvestYear: number
  testDate: string | null
  samplingDepth: number | null
  numberOfSamples: number | null
  laboratoryMethod: string | null
  georeferenced: string | null
  soc: number | null
  som: number | null
  ph: number | null
  mineralNitrogen: number | null
  bulkDensity: number | null
  topSoilDepth: number | null
  subSoilDepth: number | null
  status: RowStatus
  action: ActionKind
  issues: RowIssue[]
}

type SoilClassifierInput = Pick<
  SoilSamplingRow,
  'testDate' | 'ph' | 'samplingDepth'
>
const classifySoilRow = (row: SoilClassifierInput): RowIssue[] => {
  const out: RowIssue[] = []
  if (row.testDate === null) out.push(issueFor('required-missing', 'testDate'))
  if (row.ph !== null && (row.ph < 3 || row.ph > 10))
    out.push(issueFor('decimal-out-of-range', 'ph'))
  if (row.samplingDepth !== null && row.samplingDepth <= 0)
    out.push(issueFor('positive-int-required', 'samplingDepth'))
  return out
}

type SoilStatusInput = Pick<
  SoilSamplingRow,
  | 'testDate'
  | 'ph'
  | 'soc'
  | 'samplingDepth'
  | 'som'
  | 'mineralNitrogen'
  | 'bulkDensity'
  | 'topSoilDepth'
  | 'subSoilDepth'
  | 'georeferenced'
  | 'laboratoryMethod'
  | 'numberOfSamples'
>
const soilRowStatus = (row: SoilStatusInput): RowStatus =>
  statusOf({
    // Test date anchors the sample in time — without it we can't compare
    // against earlier readings.
    blocking: row.testDate === null,
    warningCount: missingCount(row.ph, row.soc, row.samplingDepth),
    noteCount: missingCount(
      row.som,
      row.mineralNitrogen,
      row.bulkDensity,
      row.topSoilDepth,
      row.subSoilDepth,
      row.georeferenced,
      row.laboratoryMethod,
      row.numberOfSamples,
    ),
  })

const SOIL_ROWS: SoilSamplingRow[] = sortByFarm(
  Array.from({ length: 16 }, (_, i) => {
    const year = 2024 + (i % 3)
    const base = {
      id: `soil-${i}`,
      fieldName: pick(FIELD_NAMES, i),
      farmName: pick(FARM_NAMES, i),
      harvestYear: year,
      testDate: maybeMissing(
        dateForYear(year, 60 + ((i * 17) % 200)),
        i,
        80,
        0.3,
      ),
      samplingDepth: maybeMissing(
        pickHashed([15, 20, 30, 50], i, 21),
        i,
        81,
        0.4,
      ),
      numberOfSamples: maybeMissing(
        pickHashed([4, 6, 8, 12, 16], i, 22),
        i,
        82,
        0.35,
      ),
      laboratoryMethod: maybeMissing(
        pickHashed(LAB_METHODS, i, 23),
        i,
        83,
        0.45,
      ),
      georeferenced: maybeMissing(i % 3 === 0 ? 'Yes' : 'No', i, 84, 0.5),
      soc: maybeMissing(num(i, 24, 1.2, 4.5, 2), i, 85, 0.4),
      som: maybeMissing(num(i, 25, 2.4, 9, 2), i, 86, 0.55),
      ph: maybeMissing(num(i, 26, 5.6, 7.8, 1), i, 87, 0.2),
      mineralNitrogen: maybeMissing(num(i, 27, 15, 90, 0), i, 88, 0.5),
      bulkDensity: maybeMissing(num(i, 28, 1.05, 1.55, 2), i, 89, 0.6),
      topSoilDepth: maybeMissing(
        pickHashed([20, 25, 30, 35], i, 29),
        i,
        90,
        0.5,
      ),
      subSoilDepth: maybeMissing(
        pickHashed([40, 50, 60, 70], i, 30),
        i,
        91,
        0.6,
      ),
    }
    return {
      ...base,
      status: soilRowStatus(base),
      action: pickAction(i),
      issues: classifySoilRow(base),
    }
  }),
)

const SOIL_COLUMNS: GridColDef<SoilSamplingRow>[] = [
  fixColumn<SoilSamplingRow>(),
  { field: 'fieldName', headerName: 'Field', flex: 1, minWidth: 140 },
  {
    field: 'action',
    headerName: 'Action',
    flex: 0.6,
    minWidth: 100,
    sortable: true,
    renderCell: ({ row }) => <ActionCell action={row.action} />,
  },
  {
    field: 'harvestYear',
    headerName: 'Harvest year',
    type: 'number',
    flex: 0.7,
    minWidth: 120,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  {
    field: 'testDate',
    headerName: 'Test date',
    flex: 1,
    minWidth: 130,
    renderCell: ({ row }) =>
      row.testDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.testDate}</span>
      ),
  },
  {
    field: 'samplingDepth',
    headerName: 'Sampling depth (cm)',
    type: 'number',
    flex: 0.9,
    minWidth: 160,
    renderCell: ({ row }) =>
      row.samplingDepth === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.samplingDepth}</span>
      ),
  },
  {
    field: 'numberOfSamples',
    headerName: 'No. of samples',
    type: 'number',
    flex: 0.8,
    minWidth: 140,
    renderCell: ({ row }) =>
      row.numberOfSamples === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.numberOfSamples}</span>
      ),
  },
  {
    field: 'laboratoryMethod',
    headerName: 'Lab method',
    flex: 1.2,
    minWidth: 170,
    renderCell: ({ row }) =>
      row.laboratoryMethod === null ? <MissingCell /> : row.laboratoryMethod,
  },
  {
    field: 'georeferenced',
    headerName: 'Georeferenced',
    flex: 0.8,
    minWidth: 130,
    renderCell: ({ row }) =>
      row.georeferenced === null ? <MissingCell /> : row.georeferenced,
  },
  {
    field: 'soc',
    headerName: 'SOC (%)',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.soc === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.soc.toFixed(2)}</span>
      ),
  },
  {
    field: 'som',
    headerName: 'SOM (%)',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.som === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.som.toFixed(2)}</span>
      ),
  },
  {
    field: 'ph',
    headerName: 'pH',
    type: 'number',
    flex: 0.5,
    minWidth: 80,
    renderCell: ({ row }) =>
      row.ph === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.ph.toFixed(1)}</span>
      ),
  },
  {
    field: 'mineralNitrogen',
    headerName: 'Mineral N (kgN/ha)',
    type: 'number',
    flex: 0.9,
    minWidth: 160,
    renderCell: ({ row }) =>
      row.mineralNitrogen === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.mineralNitrogen}</span>
      ),
  },
  {
    field: 'bulkDensity',
    headerName: 'Bulk density (g/cm³)',
    type: 'number',
    flex: 0.9,
    minWidth: 170,
    renderCell: ({ row }) =>
      row.bulkDensity === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.bulkDensity.toFixed(2)}</span>
      ),
  },
  {
    field: 'topSoilDepth',
    headerName: 'Top soil depth (cm)',
    type: 'number',
    flex: 0.9,
    minWidth: 160,
    renderCell: ({ row }) =>
      row.topSoilDepth === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.topSoilDepth}</span>
      ),
  },
  {
    field: 'subSoilDepth',
    headerName: 'Sub soil depth (cm)',
    type: 'number',
    flex: 0.9,
    minWidth: 160,
    renderCell: ({ row }) =>
      row.subSoilDepth === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.subSoilDepth}</span>
      ),
  },
]

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

const ALL_FARMS_VALUE = '__all__'

const FARM_FILTER_OPTIONS = [
  { value: ALL_FARMS_VALUE, label: 'All farms' },
  ...FARM_NAMES.map((name) => ({ value: name, label: name })),
]

/** Filter rows by query (matches farm + field) and farm set. */
const filterRows = <Row extends { farmName: string; fieldName?: string }>(
  rows: Row[],
  query: string,
  farms: string[],
): Row[] => {
  const q = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (farms.length > 0 && !farms.includes(row.farmName)) return false
    if (!q) return true
    const haystack = `${row.farmName} ${row.fieldName ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })
}

export const CheckDataStep = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('tab')
  const tab: TabId = isTabId(raw) ? raw : 'cropping'

  const query = searchParams.get('q') ?? ''
  // `farm` param values are the farm names themselves; an empty set means
  // "all farms" (so we don't need to encode it explicitly).
  const farmFilter = searchParams.getAll('farm')

  const setTab = (next: TabId) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'cropping') p.delete('tab')
        else p.set('tab', next)
        return p
      },
      { replace: true },
    )
  }

  const setQuery = (next: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('q', next)
        else p.delete('q')
        return p
      },
      { replace: true },
    )
  }

  // Farms multiselect with "Select all" as the first option. Picking it
  // wipes any individual farm selections; picking an individual farm wipes
  // the "Select all" sentinel.
  const farmSelectValue =
    farmFilter.length === 0 ? [ALL_FARMS_VALUE] : farmFilter
  const setFarmFilter = (next: string[]) => {
    const previouslyHadAll = farmSelectValue.includes(ALL_FARMS_VALUE)
    const nowHasAll = next.includes(ALL_FARMS_VALUE)
    let resolved: string[]
    if (nowHasAll && !previouslyHadAll) {
      // User just toggled "All farms" on — clear individual picks.
      resolved = []
    } else if (nowHasAll && previouslyHadAll) {
      // Both are still set; the user added an individual farm. Drop the
      // sentinel so the individual selection wins.
      resolved = next.filter((v) => v !== ALL_FARMS_VALUE)
    } else {
      resolved = next
    }
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('farm')
        for (const f of resolved) p.append('farm', f)
        return p
      },
      { replace: true },
    )
  }

  // Memoise column arrays so the DataTable doesn't re-derive layout on every
  // tab switch. The row arrays are top-level constants already.
  const columns = useMemo(
    () => ({
      cropping: CROPPING_COLUMNS,
      operations: OPERATIONS_COLUMNS,
      'soil-sampling': SOIL_COLUMNS,
    }),
    [],
  )

  // Severity filter — driven by the aggregate tiles. Cleared on tab switch
  // so each tab starts at the "show everything" view.
  const [sevFilter, setSevFilter] = useState<IssueSeverity | null>(null)
  useEffect(() => {
    setSevFilter(null)
  }, [])

  const filteredCropping = useMemo(() => {
    const rows = filterRows(CROPPING_ROWS, query, farmFilter)
    return sevFilter
      ? rows.filter((r) => worstSeverity(r.issues) === sevFilter)
      : rows
  }, [query, farmFilter, sevFilter])
  const filteredOperations = useMemo(() => {
    const rows = filterRows(OPERATIONS_ROWS, query, farmFilter)
    return sevFilter
      ? rows.filter((r) => worstSeverity(r.issues) === sevFilter)
      : rows
  }, [query, farmFilter, sevFilter])
  const filteredSoil = useMemo(() => {
    const rows = filterRows(SOIL_ROWS, query, farmFilter)
    return sevFilter
      ? rows.filter((r) => worstSeverity(r.issues) === sevFilter)
      : rows
  }, [query, farmFilter, sevFilter])

  /* ------------------------------------------------------------------ */
  /* Per-tab issue counts — drives the aggregate tiles above the grid.  */
  /* ------------------------------------------------------------------ */

  const activeRows: ReadonlyArray<{ issues: RowIssue[] }> =
    tab === 'cropping'
      ? CROPPING_ROWS
      : tab === 'operations'
        ? OPERATIONS_ROWS
        : SOIL_ROWS
  const blockingCount = activeRows.filter(
    (r) => worstSeverity(r.issues) === 'blocking',
  ).length
  const warningCount = activeRows.filter(
    (r) => worstSeverity(r.issues) === 'warning',
  ).length

  /* ------------------------------------------------------------------ */
  /* Fix-row modal                                                        */
  /* ------------------------------------------------------------------ */

  const [fixRow, setFixRow] = useState<{
    id: string
    issues: RowIssue[]
  } | null>(null)

  // Wire the column's static click handler to the page's state. Runs once
  // per mount; the closure captures `setFixRow` which is stable.
  useEffect(() => {
    onFixRowGlobal = (row) => setFixRow(row)
    return () => {
      onFixRowGlobal = null
    }
  }, [])

  const rowClass = (row: { issues: RowIssue[] }): string => {
    const sev = worstSeverity(row.issues)
    if (sev === 'blocking') return 'row-issue-blocking'
    if (sev === 'warning') return 'row-issue-warning'
    return ''
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Severity tiles — show aggregate counts for the active tab and act as
          single-select filters when tapped. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SeverityTile
          severity="blocking"
          count={blockingCount}
          active={sevFilter === 'blocking'}
          onToggle={() =>
            setSevFilter((p) => (p === 'blocking' ? null : 'blocking'))
          }
        />
        <SeverityTile
          severity="warning"
          count={warningCount}
          active={sevFilter === 'warning'}
          onToggle={() =>
            setSevFilter((p) => (p === 'warning' ? null : 'warning'))
          }
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[260px]">
          <TextInput
            placeholder="Search by farm or field"
            aria-label="Search rows"
            value={query}
            onValueChange={setQuery}
            leadingIcon={<IconSearch />}
          />
        </div>
        <div className="w-[260px]">
          <MultiSelect
            placeholder="All farms"
            aria-label="Filter by farm"
            value={farmSelectValue}
            onValueChange={setFarmFilter}
            items={FARM_FILTER_OPTIONS}
            searchable={false}
          />
        </div>
      </div>

      <div className="refine-grid">
        <Tabs<TabId> value={tab} onValueChange={setTab}>
          <TabBar>
            <Tab value="cropping">Cropping</Tab>
            <Tab value="operations">Operations</Tab>
            <Tab value="soil-sampling">Soil sampling</Tab>
          </TabBar>

          <TabPanel value="cropping" className="pt-4">
            <DataTable
              rows={filteredCropping}
              columns={columns.cropping}
              defaultPageSize={20}
              pageSizeOptions={[10, 20, 50]}
              selectable={false}
              getRowClassName={({ row }) => rowClass(row)}
            />
          </TabPanel>

          <TabPanel value="operations" className="pt-4">
            <DataTable
              rows={filteredOperations}
              columns={columns.operations}
              defaultPageSize={20}
              pageSizeOptions={[10, 20, 50]}
              selectable={false}
              getRowClassName={({ row }) => rowClass(row)}
            />
          </TabPanel>

          <TabPanel value="soil-sampling" className="pt-4">
            <DataTable
              rows={filteredSoil}
              columns={columns['soil-sampling']}
              defaultPageSize={20}
              pageSizeOptions={[10, 20, 50]}
              selectable={false}
              getRowClassName={({ row }) => rowClass(row)}
            />
          </TabPanel>
        </Tabs>
      </div>

      <FixRowModal
        row={fixRow}
        onOpenChange={(o) => {
          if (!o) setFixRow(null)
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* SeverityTile + FixRowModal — small UI helpers used only by this step      */
/* -------------------------------------------------------------------------- */

const SeverityTile = ({
  severity,
  count,
  active,
  onToggle,
}: {
  severity: IssueSeverity
  count: number
  active: boolean
  onToggle: () => void
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={active}
    className={clsx(
      'flex items-center justify-between gap-4 rounded-xl border-2 px-5 py-4 text-left transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      severity === 'blocking'
        ? active
          ? 'border-support-fg-red bg-support-bg-red'
          : 'border-border-tertiary bg-bg-primary hover:border-support-fg-red'
        : active
          ? 'border-support-fg-amber bg-support-bg-amber'
          : 'border-border-tertiary bg-bg-primary hover:border-support-fg-amber',
    )}
  >
    <div className="flex flex-col gap-1">
      <span
        className={clsx(
          'text-sm font-semibold uppercase tracking-[0.15px]',
          severity === 'blocking'
            ? 'text-support-fg-red'
            : 'text-support-fg-amber',
        )}
      >
        {severity === 'blocking' ? 'Blocking errors' : 'Warnings'}
      </span>
      <span className="text-3xl font-semibold tabular-nums text-text-primary">
        {count}
      </span>
    </div>
    <span className="text-sm font-semibold text-text-secondary">
      {active ? 'Showing only these' : count > 0 ? 'Show only these' : null}
    </span>
  </button>
)

const FixRowModal = ({
  row,
  onOpenChange,
}: {
  row: { id: string; issues: RowIssue[] } | null
  onOpenChange: (open: boolean) => void
}) => {
  if (!row) return null
  const sev = worstSeverity(row.issues)
  return (
    <Modal
      open={!!row}
      onOpenChange={onOpenChange}
      title="Fix row"
      description={
        sev === 'blocking'
          ? 'This row has blocking errors and must be fixed to proceed.'
          : 'This row has warnings — review before continuing.'
      }
      maxWidth="640px"
    >
      <div className="flex flex-col gap-5">
        <ul className="flex flex-col gap-3">
          {row.issues.map((issue) => (
            <li
              key={`${issue.code}-${issue.columnName ?? 'row'}`}
              className={clsx(
                'rounded-lg border-2 px-4 py-3',
                issue.severity === 'blocking'
                  ? 'border-support-fg-red bg-support-bg-red'
                  : 'border-support-fg-amber bg-support-bg-amber',
              )}
            >
              <p className="text-md font-semibold text-text-primary">
                {issue.message}
              </p>
              {issue.detail ? (
                <p className="text-sm text-text-secondary">{issue.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Ignore for now
          </Button>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Edit value
          </Button>
        </div>
      </div>
    </Modal>
  )
}
