/* -------------------------------------------------------------------------- */
/* Mock cropping / operations records for the Fix-issues tabs                  */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight standalone mock data for the Fix-issues page's Cropping table
 * + Field views. CheckDataStep also generates similar fixtures, but that
 * module owns a lot more incidental state (status tiers, action kinds,
 * sticky-fix column, etc.) — keeping a separate, simpler dataset here means
 * the views in this folder stay self-contained.
 *
 * Field / farm pairs are sourced from the real Sandy data (`@/data`) so the
 * record editor's Farm/Field dropdowns can resolve each row back to a real
 * farm and field id. Inventing names here would break that lookup and the
 * Farm/Field selects would land on an unselected state.
 */

import { FARMS, FIELDS, getFarm } from '../../../data'
import { type IssueSeverity, issueFor, type RowIssue } from './row-issues'

/* -------------------------------------------------------------------------- */
/* Seed pools — sourced from the live Sandy data so every record references a */
/* real (farm, field) pair                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every (farm, field) pair the demo will draw from. Built from the live
 * Sandy fixtures so the editor's farm/field selects resolve cleanly.
 */
const FIELD_PAIRS: { fieldName: string; farmName: string }[] = FIELDS.map(
  (field) => ({
    fieldName: field.name,
    farmName: getFarm(field.farmId)?.name ?? FARMS[0]?.name ?? '—',
  }),
)

const FIELD_NAMES: string[] = FIELD_PAIRS.map((p) => p.fieldName)

/**
 * Resolve the farm a field belongs to using the real Sandy data. Falls back
 * to the first farm only if the field name is somehow off-grid.
 */
const farmForField = (fieldName: string): string =>
  FIELD_PAIRS.find((p) => p.fieldName === fieldName)?.farmName ??
  FARMS[0]?.name ??
  '—'

/**
 * Names that may carry broken fields in the mock dataset. Everything else is
 * fully populated so a typical Fix step has a healthy "no issues" majority.
 * Kept to the first five real field names so editing one of them surfaces
 * the same farm/field pair every time.
 */
const BROKEN_FIELD_NAMES: Set<string> = new Set(FIELD_NAMES.slice(0, 5))

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

/**
 * Stable hash for a row id → produces deterministic but varied "which extra
 * issues should this row carry" decisions. Same row id always produces the
 * same set; reshuffling the fixture seed would shuffle the issues.
 */
const hashOf = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Deterministic bucket — `rowId % buckets === target`. */
const inBucket = (id: string, buckets: number, target: number): boolean =>
  hashOf(id) % buckets === target

export const classifyCropping = (
  row: Omit<CroppingRecord, 'issues'>,
): RowIssue[] => {
  const out: RowIssue[] = []
  // Per-row real validation — null required values + cross-field rules.
  if (row.workingArea === null)
    out.push(issueFor('required-missing', 'Working area'))
  if (row.yield === null) out.push(issueFor('required-missing', 'Yield'))
  if (row.cropType === null)
    out.push(issueFor('crop-type-unknown', 'Crop type'))
  if (row.plantingDate && row.harvestDate && row.plantingDate > row.harvestDate)
    out.push(issueFor('planting-after-harvest', 'Planting date'))
  if (row.yield === 0) out.push(issueFor('yield-zero', 'Yield'))

  // Beyond the per-row checks we seed a wider variety of catalogue codes so
  // every fixes.* type shows up at least once. Each bucket targets a small
  // slice of the broken-fields set so we don't blanket every row.
  if (!BROKEN_FIELD_NAMES.has(row.fieldName)) return out

  if (inBucket(row.id, 12, 0)) {
    out.push(issueFor('duplicate-cropping'))
  }
  if (inBucket(row.id, 14, 1)) {
    out.push(
      issueFor(
        'max-length-exceeded',
        'Crop variety',
        'Sandy caps variety names at 60 characters.',
      ),
    )
  }
  if (inBucket(row.id, 16, 2)) {
    out.push(
      issueFor(
        'year-invalid',
        'Harvest year',
        'Year reads as 5 digits — expected a 4-digit value.',
      ),
    )
  }
  if (inBucket(row.id, 18, 3)) {
    out.push(
      issueFor(
        'date-invalid',
        'Planting date',
        'Date does not parse — check the formatting in your file.',
      ),
    )
  }
  if (inBucket(row.id, 20, 4)) {
    out.push(
      issueFor(
        'decimal-out-of-range',
        'Yield',
        'Yield outside the 0–25 t/ha range Sandy expects.',
      ),
    )
  }
  if (inBucket(row.id, 22, 5)) {
    out.push(
      issueFor(
        'crop-area-exceeds-field',
        'Working area',
        'Working area is larger than the parent field.',
      ),
    )
  }
  if (inBucket(row.id, 24, 6)) {
    out.push(
      issueFor(
        'harvest-gt-total',
        'Yield',
        'Yield × area exceeds the total harvest on file.',
      ),
    )
  }
  return out
}

export const classifyOperation = (
  row: Omit<OperationRecord, 'issues'>,
): RowIssue[] => {
  const out: RowIssue[] = []
  if (row.quantity === null) out.push(issueFor('required-missing', 'Quantity'))
  if (row.unit === null) out.push(issueFor('required-missing', 'Unit'))
  if (row.appliedArea !== null && row.appliedArea > 30)
    out.push(issueFor('crop-area-exceeds-field', 'Applied area'))

  if (!BROKEN_FIELD_NAMES.has(row.fieldName)) return out

  if (inBucket(row.id, 12, 0)) {
    out.push(issueFor('duplicate-operation'))
  }
  if (inBucket(row.id, 14, 1)) {
    out.push(issueFor('duplicate-fertiliser'))
  }
  if (inBucket(row.id, 16, 2)) {
    out.push(
      issueFor(
        'positive-int-required',
        'Quantity',
        'Quantity recorded as a negative number.',
      ),
    )
  }
  if (inBucket(row.id, 18, 3)) {
    out.push(
      issueFor(
        'date-invalid',
        'Operation date',
        'Operation date does not parse — Sandy expects DD-MMM-YY.',
      ),
    )
  }
  if (inBucket(row.id, 20, 4)) {
    out.push(
      issueFor(
        'max-length-exceeded',
        'Product name',
        'Product name longer than the 80-character cap.',
      ),
    )
  }
  // Cross-record cases — emitted here against single rows so the demo
  // surfaces them without needing a real cross-record join. The copy hints
  // at the relationship (a missing cropping key / a deletion in the file).
  if (inBucket(row.id, 18, 5)) {
    out.push(
      issueFor(
        'orphan-operation',
        undefined,
        'No cropping record matches this operation — pick one or exclude.',
      ),
    )
  }
  if (inBucket(row.id, 26, 6)) {
    out.push(
      issueFor(
        'deletion-not-allowed',
        undefined,
        'File asks to delete a crop-protection record — not allowed via upload.',
      ),
    )
  }
  return out
}

/**
 * Synthetic farm-duplicate issue — surfaces a single fixes.farm.duplicate-sandy-id
 * issue at the start of the fixture so the IssuesView card list always shows
 * the full breadth of catalogue codes. The classifier above can't naturally
 * emit this one (it's about farm-level metadata, not per-row data).
 */
export const SYNTHETIC_FARM_DUPLICATE_ISSUE: RowIssue = issueFor(
  'duplicate-farm',
  'Farm name',
  'Two farms in this upload share the same Sandy ID.',
)

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
    const fieldName = pick(FIELD_NAMES, i)
    // Only the small set of broken-fields can carry missing values. Records
    // on every other field stay fully populated so the demo doesn't look
    // like a total failure.
    const broken = BROKEN_FIELD_NAMES.has(fieldName)
    const m = <T>(value: T, salt: number, p: number): T | null =>
      broken ? maybeMissing(value, i, salt, p) : value
    const base = {
      id: `crop-${i}`,
      fieldName,
      // Paired against the real Sandy data so the editor's Farm/Field
      // selects can resolve to a known (farmId, fieldId) pair.
      farmName: farmForField(fieldName),
      harvestYear: year,
      cropName,
      cropType: m(pickHashed(['Main crop', 'Cover crop'], i, 7), 50, 0.3),
      cropVariety: m(variety, 51, 0.4),
      workingArea: m(workingArea, 53, 0.15),
      tillage: m(pickHashed(TILLAGE_METHODS, i, 8), 54, 0.45),
      yield: m(yieldVal, 55, 0.3),
      plantingDate: m(dateForYear(year - 1, 270 + (i % 30)), 57, 0.5),
      harvestDate: m(dateForYear(year, 200 + (i % 30)), 58, 0.35),
      totalYield: m(totalYield, 59, 0.4),
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
    const fieldName = pick(FIELD_NAMES, i + 2)
    const broken = BROKEN_FIELD_NAMES.has(fieldName)
    const m = <T>(value: T, salt: number, p: number): T | null =>
      broken ? maybeMissing(value, i, salt, p) : value
    const base = {
      id: `op-${i}`,
      // Paired against the real Sandy data so the editor's Farm/Field
      // selects can resolve to a known (farmId, fieldId) pair.
      farmName: farmForField(fieldName),
      fieldName,
      harvestYear: year,
      operationGroup: group,
      operationType: pick(OPERATION_TYPES[group] ?? ['—'], i),
      operationDate: m(dateForYear(year, 90 + ((i * 11) % 180)), 73, 0.3),
      productName: m(pick(PRODUCTS_BY_GROUP[group] ?? ['—'], i), 74, 0.35),
      quantity: m(num(i, 13, 0.5, 220, 2), 75, 0.3),
      unit: m(pick(UNITS_BY_GROUP[group] ?? ['—'], i), 76, 0.35),
      appliedArea: broken
        ? maybeMissing(num(i, 14, 2.5, 28, 1), i, 77, 0.4)
        : num(i, 14, 2.5, 22, 1),
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
