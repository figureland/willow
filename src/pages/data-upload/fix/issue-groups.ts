import type {
  CroppingRecord,
  OperationRecord,
  RecordProvenance,
} from './fix-records'
import {
  ISSUE_DEFAULTS,
  type IssueCode,
  type IssueSeverity,
  type RowIssue,
} from './row-issues'

/* -------------------------------------------------------------------------- */
/* Issue derivation                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Each Issue is a flat collection of records that share the same problem —
 * same record type, same issue code, same broken-field signature. Resolving
 * an issue means patching every record (or the user's selection) with one
 * shared value.
 *
 * No clusters, no sub-groups: one issue, one record list, one suggested fix.
 */

export type RecordType = 'cropping' | 'operation'

export type FixableRecord = {
  id: string
  type: RecordType
  farmName: string
  fieldName: string
  harvestYear: number
  provenance: RecordProvenance
  /** Live issues on this row — drives the status column. */
  issues: RowIssue[]
  /** Display projection for the preview grid — key matches `brokenFieldKeys`. */
  display: Record<string, string | number | null>
  /** Raw record-key → value for fields the editor uses. */
  values: Record<string, string | number | null>
}

export type IssueGroup = {
  /** Stable id encoding (recordType, code, broken-field signature). */
  id: string
  code: IssueCode
  severity: IssueSeverity
  recordType: RecordType
  title: string
  description: string
  /** Record-keys that need a fix on every row in this issue. */
  brokenFieldKeys: string[]
  /** Display labels per broken-field key. */
  brokenFieldLabels: string[]
  /** Sandy's suggested values, keyed by record-key (as strings). */
  sandySuggestion: Record<string, string>
  recordIds: string[]
}

/* -------------------------------------------------------------------------- */
/* Column-label → record-key map. The classifier writes column labels into    */
/* RowIssue.columnName; the resolver needs the underlying record key.         */
/* -------------------------------------------------------------------------- */

const CROPPING_COLUMN_KEY: Record<string, keyof CroppingRecord & string> = {
  'Working area': 'workingArea',
  Yield: 'yield',
  'Crop type': 'cropType',
  'Planting date': 'plantingDate',
  'Harvest date': 'harvestDate',
  Variety: 'cropVariety',
  Year: 'harvestYear',
}

const OPERATION_COLUMN_KEY: Record<string, keyof OperationRecord & string> = {
  Quantity: 'quantity',
  Unit: 'unit',
  'Applied area': 'appliedArea',
  Product: 'productName',
  Date: 'operationDate',
  Year: 'harvestYear',
}

const labelFor = (type: RecordType, key: string): string => {
  const dict = type === 'cropping' ? CROPPING_COLUMN_KEY : OPERATION_COLUMN_KEY
  const found = Object.entries(dict).find(([, v]) => v === key)
  return found?.[0] ?? key
}

const joinAnd = (parts: string[]): string => {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * Map raw issue codes + broken-field labels into a short, plain-English
 * title. We prefer the field-driven phrasing ("Yield missing") over the
 * catalogue label ("Required field missing") when there's a single broken
 * field, and fall back to the catalogue label otherwise.
 */
const buildFriendlyTitle = (
  code: IssueCode,
  catalogueLabel: string,
  brokenLabels: string[],
): string => {
  switch (code) {
    case 'required-missing':
      return brokenLabels.length > 0
        ? `${joinAnd(brokenLabels)} missing`
        : 'Required field missing'
    case 'crop-type-unknown':
      return 'Crop type not recognised'
    case 'planting-after-harvest':
      return 'Planting date after harvest'
    case 'yield-zero':
      return 'Yield recorded as zero'
    case 'crop-area-exceeds-field':
      return 'Working area larger than the field'
    case 'duplicate-cropping':
      return 'Duplicate cropping record'
    case 'duplicate-operation':
      return 'Duplicate operation'
    default:
      if (brokenLabels.length === 1)
        return `${brokenLabels[0]} — ${catalogueLabel.toLowerCase()}`
      return catalogueLabel
  }
}

const recordKeyFor = (
  type: RecordType,
  columnName: string | undefined,
): string | undefined => {
  if (!columnName) return undefined
  const dict = type === 'cropping' ? CROPPING_COLUMN_KEY : OPERATION_COLUMN_KEY
  return dict[columnName]
}

/* -------------------------------------------------------------------------- */
/* Sandy suggestion — median for numbers, mode for strings                     */
/* -------------------------------------------------------------------------- */

const median = (nums: number[]): number => {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
}

const mode = (values: string[]): string => {
  if (values.length === 0) return ''
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = values[0]
  let bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

const suggestForKey = (
  key: string,
  siblings: Record<string, unknown>[],
): string | undefined => {
  const populated = siblings
    .map((r) => r[key])
    .filter((v): v is string | number => v !== null && v !== undefined)
  if (populated.length === 0) return undefined
  if (typeof populated[0] === 'number') {
    return String(median(populated as number[]))
  }
  return mode(populated as string[])
}

/* -------------------------------------------------------------------------- */
/* Display projections                                                         */
/* -------------------------------------------------------------------------- */

const projectCropping = (row: CroppingRecord): FixableRecord => ({
  id: row.id,
  type: 'cropping',
  farmName: row.farmName,
  fieldName: row.fieldName,
  harvestYear: row.harvestYear,
  provenance: row.provenance,
  issues: row.issues,
  display: {
    farmName: row.farmName,
    fieldName: row.fieldName,
    harvestYear: row.harvestYear,
    cropName: row.cropName,
    cropType: row.cropType,
    cropVariety: row.cropVariety,
    workingArea: row.workingArea,
    yield: row.yield,
    plantingDate: row.plantingDate,
    harvestDate: row.harvestDate,
  },
  values: {
    farmName: row.farmName,
    fieldName: row.fieldName,
    harvestYear: row.harvestYear,
    cropName: row.cropName,
    cropType: row.cropType,
    cropVariety: row.cropVariety,
    workingArea: row.workingArea,
    yield: row.yield,
    plantingDate: row.plantingDate,
    harvestDate: row.harvestDate,
  },
})

const projectOperation = (row: OperationRecord): FixableRecord => ({
  id: row.id,
  type: 'operation',
  farmName: row.farmName,
  fieldName: row.fieldName,
  harvestYear: row.harvestYear,
  provenance: row.provenance,
  issues: row.issues,
  display: {
    farmName: row.farmName,
    fieldName: row.fieldName,
    harvestYear: row.harvestYear,
    operationGroup: row.operationGroup,
    operationType: row.operationType,
    operationDate: row.operationDate,
    productName: row.productName,
    quantity: row.quantity,
    unit: row.unit,
    appliedArea: row.appliedArea,
  },
  values: {
    farmName: row.farmName,
    fieldName: row.fieldName,
    harvestYear: row.harvestYear,
    operationGroup: row.operationGroup,
    operationType: row.operationType,
    operationDate: row.operationDate,
    productName: row.productName,
    quantity: row.quantity,
    unit: row.unit,
    appliedArea: row.appliedArea,
  },
})

export const projectRecord = (
  row: CroppingRecord | OperationRecord,
  type: RecordType,
): FixableRecord =>
  type === 'cropping'
    ? projectCropping(row as CroppingRecord)
    : projectOperation(row as OperationRecord)

/* -------------------------------------------------------------------------- */
/* Issue grouping                                                              */
/* -------------------------------------------------------------------------- */

type Scan = {
  code: IssueCode
  severity: IssueSeverity
  brokenKeys: string[]
}

const scanRow = (
  row: CroppingRecord | OperationRecord,
  type: RecordType,
): Scan[] => {
  // Each issue code on a row carries its own broken-field set. Different
  // codes on the same row become independent issue rows downstream.
  const byCode = new Map<
    IssueCode,
    { severity: IssueSeverity; keys: Set<string> }
  >()
  for (const i of row.issues) {
    const key = recordKeyFor(type, i.columnName)
    let bucket = byCode.get(i.code)
    if (!bucket) {
      bucket = { severity: i.severity, keys: new Set<string>() }
      byCode.set(i.code, bucket)
    }
    if (key) bucket.keys.add(key)
  }
  return [...byCode.entries()].map(([code, b]) => ({
    code,
    severity: b.severity,
    brokenKeys: [...b.keys].sort(),
  }))
}

/**
 * Build the issue list. Each issue groups every row that shares the same
 * (recordType, code, broken-field signature) so the fix can apply uniformly.
 */
export const buildIssueGroups = (
  cropping: CroppingRecord[],
  operations: OperationRecord[],
  options: {
    removedCroppingIds?: Set<string>
    removedOperationIds?: Set<string>
    editedCroppingIds?: Set<string>
    editedOperationIds?: Set<string>
  } = {},
): IssueGroup[] => {
  const {
    removedCroppingIds = new Set<string>(),
    removedOperationIds = new Set<string>(),
    editedCroppingIds = new Set<string>(),
    editedOperationIds = new Set<string>(),
  } = options

  type Bucket = {
    type: RecordType
    code: IssueCode
    severity: IssueSeverity
    brokenKeys: string[]
    rows: (CroppingRecord | OperationRecord)[]
  }
  const buckets = new Map<string, Bucket>()

  const consume = (row: CroppingRecord | OperationRecord, type: RecordType) => {
    for (const scan of scanRow(row, type)) {
      const signature = scan.brokenKeys.join('+') || '__none__'
      const id = `${type}:${scan.code}:${signature}`
      let bucket = buckets.get(id)
      if (!bucket) {
        bucket = {
          type,
          code: scan.code,
          severity: scan.severity,
          brokenKeys: scan.brokenKeys,
          rows: [],
        }
        buckets.set(id, bucket)
      }
      bucket.rows.push(row)
    }
  }

  for (const row of cropping) {
    if (removedCroppingIds.has(row.id) || editedCroppingIds.has(row.id))
      continue
    consume(row, 'cropping')
  }
  for (const row of operations) {
    if (removedOperationIds.has(row.id) || editedOperationIds.has(row.id))
      continue
    consume(row, 'operation')
  }

  const cleanCropping = cropping.filter((r) => r.issues.length === 0)
  const cleanOperations = operations.filter((r) => r.issues.length === 0)

  const groups: IssueGroup[] = []
  for (const [id, bucket] of buckets) {
    const siblings =
      bucket.type === 'cropping' ? cleanCropping : cleanOperations
    const sandySuggestion: Record<string, string> = {}
    for (const key of bucket.brokenKeys) {
      const guess = suggestForKey(
        key,
        siblings as unknown as Record<string, unknown>[],
      )
      if (guess !== undefined) sandySuggestion[key] = guess
    }
    const defaults = ISSUE_DEFAULTS[bucket.code]
    const total = bucket.rows.length
    const brokenLabels = bucket.brokenKeys.map((k) => labelFor(bucket.type, k))
    const title = buildFriendlyTitle(bucket.code, defaults.label, brokenLabels)
    groups.push({
      id,
      code: bucket.code,
      severity: bucket.severity,
      recordType: bucket.type,
      title,
      description:
        bucket.type === 'cropping'
          ? `Affects ${total} cropping ${total === 1 ? 'record' : 'records'}.`
          : `Affects ${total} operation ${total === 1 ? 'record' : 'records'}.`,
      brokenFieldKeys: bucket.brokenKeys,
      brokenFieldLabels: brokenLabels,
      sandySuggestion,
      recordIds: bucket.rows.map((r) => r.id),
    })
  }

  // Stable order: blocking first, then by total record count desc.
  const severityRank: Record<IssueSeverity, number> = {
    blocking: 0,
    warning: 1,
  }
  groups.sort((a, b) => {
    const r = severityRank[a.severity] - severityRank[b.severity]
    return r !== 0 ? r : b.recordIds.length - a.recordIds.length
  })
  return groups
}
