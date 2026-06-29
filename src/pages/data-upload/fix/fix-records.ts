/* -------------------------------------------------------------------------- */
/* Mock cropping / operations records for the Fix-issues tabs                  */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight standalone mock data for the Fix-issues page's Cropping table
 * + Field views. CheckDataStep also generates similar fixtures, but that
 * module owns a lot more incidental state (status tiers, action kinds,
 * sticky-fix column, etc.) — keeping a separate, simpler dataset here means
 * the views in this folder stay self-contained.
 */

import { type IssueSeverity, issueFor, type RowIssue } from './row-issues'

/* -------------------------------------------------------------------------- */
/* Seed pools                                                                  */
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

/* -------------------------------------------------------------------------- */
/* Deterministic helpers                                                       */
/* -------------------------------------------------------------------------- */

const pick = <T>(arr: T[], i: number): T => arr[i % arr.length]

const hash = (i: number, salt: number) =>
  ((i + 1) * 9301 + salt * 49297) % 233280

const pickHashed = <T>(arr: T[], i: number, salt: number): T =>
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

const maybeMissing = <T>(
  value: T,
  i: number,
  salt: number,
  p: number,
): T | null => (hash(i, salt) / 233280 < p ? null : value)

/* -------------------------------------------------------------------------- */
/* Row models                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Provenance — where this row came from in the user's upload. Surfaces at
 * the bottom of the record editor so the user can cross-reference the
 * original file when a value looks wrong.
 */
export type RecordProvenance = {
  filename: string
  sheetName: string
  /** 1-based row index in the source sheet (the header sits on row 1). */
  sourceRow: number
}

export type CroppingRecord = {
  id: string
  farmName: string
  fieldName: string
  harvestYear: number
  cropName: string
  cropType: string | null
  cropVariety: string | null
  workingArea: number | null
  tillage: string | null
  yield: number | null
  plantingDate: string | null
  harvestDate: string | null
  totalYield: number | null
  issues: RowIssue[]
  provenance: RecordProvenance
}

export type OperationRecord = {
  id: string
  farmName: string
  fieldName: string
  harvestYear: number
  operationGroup: string
  operationType: string
  operationDate: string | null
  productName: string | null
  quantity: number | null
  unit: string | null
  appliedArea: number | null
  issues: RowIssue[]
  provenance: RecordProvenance
}

/* -------------------------------------------------------------------------- */
/* Classifiers — produce RowIssue lists from the raw row values               */
/* -------------------------------------------------------------------------- */

const classifyCropping = (row: Omit<CroppingRecord, 'issues'>): RowIssue[] => {
  const out: RowIssue[] = []
  if (row.workingArea === null)
    out.push(issueFor('required-missing', 'Working area'))
  if (row.yield === null) out.push(issueFor('required-missing', 'Yield'))
  if (row.cropType === null)
    out.push(issueFor('crop-type-unknown', 'Crop type'))
  if (row.plantingDate && row.harvestDate && row.plantingDate > row.harvestDate)
    out.push(issueFor('planting-after-harvest', 'Planting date'))
  if (row.yield === 0) out.push(issueFor('yield-zero', 'Yield'))
  if (row.id.endsWith('-10') || row.id.endsWith('-21'))
    out.push(issueFor('duplicate-cropping'))
  return out
}

const classifyOperation = (
  row: Omit<OperationRecord, 'issues'>,
): RowIssue[] => {
  const out: RowIssue[] = []
  if (row.quantity === null) out.push(issueFor('required-missing', 'Quantity'))
  if (row.unit === null) out.push(issueFor('required-missing', 'Unit'))
  if (row.appliedArea !== null && row.appliedArea > 30)
    out.push(issueFor('crop-area-exceeds-field', 'Applied area'))
  if (row.id.endsWith('-7') || row.id.endsWith('-19'))
    out.push(issueFor('duplicate-operation'))
  return out
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const CROPPING_SOURCE_FILES = [
  { filename: 'xfarm-export-2024.xlsx', sheetName: 'Cropping' },
  { filename: 'agleader-cropping.csv', sheetName: 'Sheet1' },
  { filename: 'climate-fieldview.xlsx', sheetName: 'Crops' },
]

const OPERATION_SOURCE_FILES = [
  { filename: 'xfarm-operations-export.xlsx', sheetName: 'PRD_Fertilizers' },
  { filename: 'xfarm-operations-export.xlsx', sheetName: 'PRD_Chemicals' },
  { filename: 'agleader-operations.csv', sheetName: 'Sheet1' },
  { filename: 'climate-fieldview.xlsx', sheetName: 'Applications' },
]

export const CROPPING_RECORDS: CroppingRecord[] = Array.from(
  { length: 100 },
  (_, i) => {
    const cropName = pick(CROP_NAMES, i)
    const variety = pick(CROP_VARIETIES[cropName] ?? ['—'], i)
    const year = 2024 + (i % 3)
    const workingArea = num(i, 5, 2.5, 28, 1)
    const yieldVal = num(i, 6, 3.2, 11, 2)
    const totalYield = Math.round(yieldVal * workingArea * 10) / 10
    const source = CROPPING_SOURCE_FILES[i % CROPPING_SOURCE_FILES.length]
    const base = {
      id: `crop-${i}`,
      fieldName: pick(FIELD_NAMES, i),
      farmName: pick(FARM_NAMES, i),
      harvestYear: year,
      cropName,
      cropType: maybeMissing(
        pickHashed(['Main crop', 'Cover crop'], i, 7),
        i,
        50,
        0.3,
      ),
      cropVariety: maybeMissing(variety, i, 51, 0.4),
      workingArea: maybeMissing(workingArea, i, 53, 0.15),
      tillage: maybeMissing(pickHashed(TILLAGE_METHODS, i, 8), i, 54, 0.45),
      yield: maybeMissing(yieldVal, i, 55, 0.3),
      plantingDate: maybeMissing(
        dateForYear(year - 1, 270 + (i % 30)),
        i,
        57,
        0.5,
      ),
      harvestDate: maybeMissing(dateForYear(year, 200 + (i % 30)), i, 58, 0.35),
      totalYield: maybeMissing(totalYield, i, 59, 0.4),
      provenance: {
        filename: source.filename,
        sheetName: source.sheetName,
        sourceRow: i + 2,
      },
    }
    return { ...base, issues: classifyCropping(base) }
  },
)

export const OPERATION_RECORDS: OperationRecord[] = Array.from(
  { length: 140 },
  (_, i) => {
    const group = pick(OPERATION_GROUPS, i)
    const year = 2024 + (i % 3)
    const source = OPERATION_SOURCE_FILES[i % OPERATION_SOURCE_FILES.length]
    const base = {
      id: `op-${i}`,
      farmName: pick(FARM_NAMES, i),
      fieldName: pick(FIELD_NAMES, i + 2),
      harvestYear: year,
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
      provenance: {
        filename: source.filename,
        sheetName: source.sheetName,
        sourceRow: i + 2,
      },
    }
    return { ...base, issues: classifyOperation(base) }
  },
)

/* -------------------------------------------------------------------------- */
/* Field aggregation                                                           */
/* -------------------------------------------------------------------------- */

export type FieldStatus = 'blocked' | 'warning' | 'good'

export type FieldSummary = {
  name: string
  farmName: string
  status: FieldStatus
  /** Total issue counts grouped by record category. */
  croppingIssueCount: number
  operationIssueCount: number
  croppingRecords: CroppingRecord[]
  operationRecords: OperationRecord[]
}

const worst = (
  a: FieldStatus,
  b: FieldStatus | IssueSeverity | null,
): FieldStatus => {
  if (a === 'blocked' || b === 'blocking') return 'blocked'
  if (a === 'warning' || b === 'warning') return 'warning'
  return 'good'
}

const buildFieldSummary = (name: string): FieldSummary => {
  const croppingRecords = CROPPING_RECORDS.filter((r) => r.fieldName === name)
  const operationRecords = OPERATION_RECORDS.filter((r) => r.fieldName === name)

  let status: FieldStatus = 'good'
  let croppingIssueCount = 0
  let operationIssueCount = 0

  for (const r of croppingRecords) {
    croppingIssueCount += r.issues.length
    for (const i of r.issues) status = worst(status, i.severity)
  }
  for (const r of operationRecords) {
    operationIssueCount += r.issues.length
    for (const i of r.issues) status = worst(status, i.severity)
  }

  // Pick the first farm we see across either record list — every record
  // for a given field name in the mock data shares the same farm.
  const farmName =
    croppingRecords[0]?.farmName ?? operationRecords[0]?.farmName ?? '—'

  return {
    name,
    farmName,
    status,
    croppingIssueCount,
    operationIssueCount,
    croppingRecords,
    operationRecords,
  }
}

/** All fields touched by the upload, sorted with worst status first. */
export const FIELD_SUMMARIES: FieldSummary[] = (() => {
  const names = new Set<string>()
  for (const r of CROPPING_RECORDS) names.add(r.fieldName)
  for (const r of OPERATION_RECORDS) names.add(r.fieldName)
  const summaries = [...names].map(buildFieldSummary)
  const rank: Record<FieldStatus, number> = { blocked: 0, warning: 1, good: 2 }
  return summaries.sort((a, b) => {
    const r = rank[a.status] - rank[b.status]
    return r !== 0 ? r : a.name.localeCompare(b.name)
  })
})()
