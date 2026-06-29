/**
 * Mock issue model for the data-upload review step. Each issue describes a
 * row that needs the user's attention before the import can proceed, and
 * carries the resolution state alongside the source data.
 *
 * In a real implementation these would be produced by the backend after
 * analysing the uploaded files; here we generate a plausible set client-side.
 */

/* -------------------------------------------------------------------------- */
/* Shared shapes                                                               */
/* -------------------------------------------------------------------------- */

export type SandyConfidence = 'High' | 'Medium' | 'Low'

export type SandyPrediction = {
  /** The system value Sandy thinks the source should map to. */
  value: string
  confidence: SandyConfidence
}

/**
 * Resolutions are the user's chosen action for an issue. Each issue type
 * supports a subset of these (see `defaultResolutionForIssue` below). They
 * all share the same shape so the resolver can hold one `Resolution` per
 * issue regardless of variant.
 */
export type Resolution =
  | { kind: 'pending' }
  | { kind: 'remove' }
  | { kind: 'ignore' }
  | { kind: 'create-new'; name: string }
  | { kind: 'match-existing'; value: string }
  /** Schema-transformation issues store a full rule program (see
   *  `./schema-transformation.ts`) under `program`. We keep it as
   *  `unknown` here so this module stays unaware of the schema
   *  primitives; the resolver narrows when needed. */
  | { kind: 'rule-program'; program: unknown }
  /** Value-mapping issues store a per-source-value decision map keyed by
   *  the raw source string. `unknown` keeps this module independent of
   *  the value-mapping primitives. */
  | { kind: 'value-mapping'; decisions: unknown }

/* -------------------------------------------------------------------------- */
/* Issue variants                                                              */
/* -------------------------------------------------------------------------- */

type BaseIssue = {
  id: string
  /** Short headline shown in the modal title row. */
  title: string
}

/**
 * 1. A farm in the import data doesn't match any existing farm. User can
 *    remove it, create a new farm with that name, or pair it to an existing
 *    farm via the dropdown.
 */
export type FarmMissingIssue = BaseIssue & {
  type: 'farm-missing'
  sourceName: string
  existingFarms: { value: string; label: string }[]
  /**
   * Number of records in the upload that reference this farm — used to
   * surface "applies to N records" when the resolution will batch-change
   * many rows at once. Omit (or set to 1) for single-record issues.
   */
  affects?: number
}

/** 2. Same shape as farm-missing for a field that didn't match. */
export type FieldMissingIssue = BaseIssue & {
  type: 'field-missing'
  sourceName: string
  /** The farm this field is reported under (for context). */
  farmName: string
  existingFields: { value: string; label: string }[]
  affects?: number
}

/**
 * 2b. A batch of unknown fields that share a context (typically the same
 *     just-resolved farm). The user picks a single target farm and Sandy
 *     attaches every listed field name to it as a new field. Demonstrates
 *     the "many fields, one decision" path requested by the user.
 */
export type FieldMissingBatchIssue = BaseIssue & {
  type: 'field-missing-batch'
  /** Source field names detected in the upload that need attaching. */
  sourceNames: string[]
  /** Suggested farm the batch came from — drives the default selection. */
  suggestedFarmName?: string
  existingFarms: { value: string; label: string }[]
}

/**
 * 3. Schema transformation — Sandy can't directly map this file's columns
 *    onto the canonical schema. The resolver lets the user describe their
 *    spreadsheet's layout one canonical field at a time, building a small
 *    visual rule program. See `./schema-transformation.ts` for the model.
 */
export type SchemaTransformationIssue = BaseIssue & {
  type: 'schema-transformation'
  /** Filename the rules apply to. Surfaced in the issue header. */
  filename: string
  /** Sheet within the workbook this issue is scoped to. */
  sheetName: string
  /** Human label for the data category (e.g. "Operations"). */
  dataCategory: string
  /**
   * When true, Sandy has already read the sheet and proposed a layout
   * that the user just needs to confirm with Yes / No. When false (or
   * omitted) we fall back to the "we don't recognise this template"
   * framing where the user has to drive the resolver themselves.
   */
  recognised?: boolean
  /**
   * Short summary of *what* Sandy found inside the file when
   * `recognised` is true (e.g. "16 cropping records across 3 farms").
   * Surfaced on the card alongside the source filename.
   */
  recognisedSummary?: string
}

/**
 * 4. Value mapping — Sandy spotted column values it doesn't recognise (e.g.
 *    `WW` for Winter wheat). The user maps each unknown value onto a known
 *    canonical value or adds it as a new rule. Rules are scoped by data
 *    category so they're reused across files in that category.
 */
export type ValueMappingIssue = BaseIssue & {
  type: 'value-mapping'
  /** Data category the rules apply to (Operations / Cropping / …). */
  category: 'operational' | 'cropping' | 'soil-sampling'
  /** Filename the unknown values were detected in. */
  filename: string
  /** Sheet within the workbook. */
  sheetName: string
  /** Source column the unknown values came from. */
  sourceColumn: string
  /** Canonical field label they map onto. */
  targetLabel: string
  /** Unknown source values with their suggested canonical match. */
  sourceValues: {
    value: string
    occurrences: number
    suggestion?: string
  }[]
  /** Canonical vocabulary the dropdown picks from. */
  canonicalOptions: { value: string; label: string }[]
}

/**
 * Generic mapping issue used for 4–8. The source values are what the import
 * contained; the user picks the corresponding system value (with a Sandy
 * prediction pre-selected when available).
 */
export type MappingIssue = BaseIssue & {
  type:
    | 'crop-variety-mapping'
    | 'product-unit-mapping'
    | 'operation-mapping'
    | 'crop-type-mapping'
    | 'tillage-mapping'
  /**
   * Labels for the columns above the source / target columns — keeps the
   * UI legible without inventing one row component per issue type.
   */
  sourceColumns: [string, string]
  targetColumns: [string, string]
  /**
   * Rows: each row is one source pairing that needs mapping. The system
   * pairing (`target`) defaults to the Sandy prediction, and the user can
   * change it via the dropdown.
   */
  rows: {
    id: string
    source: [string, string]
    options: { value: string; label: string }[]
    prediction?: SandyPrediction
    /**
     * Number of records in the upload that share this source pairing. When
     * > 1 the mapping decision is batched across all of them — surfaced in
     * the row as "applies to N records".
     */
    affects?: number
  }[]
}

export type Issue =
  | FarmMissingIssue
  | FieldMissingIssue
  | FieldMissingBatchIssue
  | SchemaTransformationIssue
  | ValueMappingIssue
  | MappingIssue

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Crude edit distance — good enough to pick the nearest farm/field name for
 * the "Replace" default. Cheaper than Levenshtein and fine for prototype-scale
 * lists.
 */
const closeness = (a: string, b: string): number => {
  const la = a.toLowerCase()
  const lb = b.toLowerCase()
  if (la === lb) return 0
  // Higher score = more different.
  let diff = Math.abs(la.length - lb.length) * 2
  for (let i = 0; i < Math.min(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) diff += 1
  }
  return diff
}

/** Pick the option whose label most closely matches the source name. */
const closestOption = (
  source: string,
  options: { value: string; label: string }[],
): string | null => {
  if (options.length === 0) return null
  let best = options[0]
  let bestScore = closeness(source, best.label)
  for (let i = 1; i < options.length; i++) {
    const score = closeness(source, options[i].label)
    if (score < bestScore) {
      bestScore = score
      best = options[i]
    }
  }
  return best.value
}

/**
 * What the resolver starts with. Mapping issues default to accepting Sandy's
 * prediction (when supplied), which feels right for the "happy path" — the
 * user just clicks through. Farm/field issues default to **Replace** with the
 * closest-named existing record auto-selected; the user can override.
 */
export const defaultResolutionForIssue = (issue: Issue): Resolution => {
  if (issue.type === 'farm-missing') {
    const value = closestOption(issue.sourceName, issue.existingFarms) ?? ''
    return { kind: 'match-existing', value }
  }
  if (issue.type === 'field-missing') {
    const value = closestOption(issue.sourceName, issue.existingFields) ?? ''
    return { kind: 'match-existing', value }
  }
  if (issue.type === 'schema-transformation') {
    // Pre-fill obvious 1:1 column rules (e.g. fieldName → Field name) so the
    // user opens the modal to a head start instead of an empty form.
    return {
      kind: 'rule-program',
      program: suggestedProgramForSheet(issue.sheetName),
    }
  }
  if (issue.type === 'value-mapping') {
    // Seed each known source value with Sandy's suggestion (when present)
    // so the happy path is "skim and confirm" rather than "fill in 5 selects".
    const decisions: Record<
      string,
      { kind: 'map'; canonicalValue: string } | { kind: 'skip' }
    > = {}
    for (const sv of issue.sourceValues) {
      decisions[sv.value] = sv.suggestion
        ? { kind: 'map', canonicalValue: sv.suggestion }
        : { kind: 'skip' }
    }
    return { kind: 'value-mapping', decisions }
  }
  if (issue.type === 'field-missing-batch') {
    // Pre-select the suggested farm by name when available, otherwise the
    // first existing farm — the user can swap before confirming.
    const fromSuggested = issue.suggestedFarmName
      ? issue.existingFarms.find(
          (f) =>
            f.label.toLowerCase() === issue.suggestedFarmName?.toLowerCase(),
        )?.value
      : undefined
    const value = fromSuggested ?? issue.existingFarms[0]?.value ?? ''
    return { kind: 'match-existing', value }
  }
  return { kind: 'pending' }
}

/* -------------------------------------------------------------------------- */
/* Mock data                                                                   */
/* -------------------------------------------------------------------------- */

import { FARMS, FIELDS } from '../../data'
import { suggestedProgramForSheet } from './schema-transformation'

export const EXISTING_FARMS = FARMS.map((f) => ({
  value: f.id,
  label: f.name,
}))

export const EXISTING_FIELDS = FIELDS.map((f) => ({
  value: f.id,
  label: f.name,
}))

const CROP_VARIETY_OPTIONS = [
  {
    value: 'cover-crop-mix',
    label: 'Cover crop / crop mix, not otherwise specified',
  },
  {
    value: 'potatoes-maincrop-jersey',
    label: 'Potatoes maincrop · Jersey Royal',
  },
  { value: 'potatoes-seed', label: 'Potatoes seed · NA' },
  { value: 'winter-wheat-skyfall', label: 'Winter wheat · Skyfall' },
  { value: 'winter-wheat-extase', label: 'Winter wheat · Extase' },
  { value: 'sugar-beet-na', label: 'Sugar beet · NA' },
]

const PRODUCT_UNIT_OPTIONS = [
  { value: 'kg-ha', label: 'kg/ha' },
  { value: 'l-ha', label: 'L/ha' },
  { value: 'g-ha', label: 'g/ha' },
  { value: 't-ha', label: 't/ha' },
  { value: 'units', label: 'units' },
]

const OPERATION_OPTIONS = [
  {
    value: 'crop-protection-fungicides',
    label: 'Crop Protection · Fungicides',
  },
  {
    value: 'crop-protection-herbicides',
    label: 'Crop Protection · Herbicides',
  },
  {
    value: 'crop-protection-pesticides',
    label: 'Crop Protection · Pesticides',
  },
  {
    value: 'nutrition-manufactured',
    label: 'Nutrition · Manufactured Fertiliser',
  },
  { value: 'nutrition-organic', label: 'Nutrition · Organic Fertiliser' },
  { value: 'cultivation-deep-plowing', label: 'Cultivation · Deep plowing' },
]

const TILLAGE_OPTIONS = [
  { value: 'conventional', label: 'Conventional tillage' },
  { value: 'min-till', label: 'Min-till' },
  { value: 'no-till', label: 'No-till' },
  { value: 'strip-till', label: 'Strip-till' },
]

export const MOCK_ISSUES: Issue[] = [
  {
    id: 'iss-farm-1',
    type: 'farm-missing',
    title: 'Farm not recognised',
    sourceName: 'Brookside Lays',
    existingFarms: EXISTING_FARMS,
    affects: 218,
  },
  {
    id: 'iss-field-1',
    type: 'field-missing',
    title: 'Field not recognised',
    sourceName: 'Lower Coppice',
    farmName: 'Brookside Leys',
    existingFields: EXISTING_FIELDS,
    affects: 42,
  },
  {
    id: 'iss-crop-variety',
    type: 'crop-variety-mapping',
    title: 'Crop and variety mapping',
    sourceColumns: ['Source crop', 'Source variety'],
    targetColumns: ['Sandy crop', 'Sandy variety'],
    rows: [
      {
        id: 'cv-1',
        source: ['Cover crop/crop mix, not otherwise specified', ''],
        options: CROP_VARIETY_OPTIONS,
        prediction: { value: 'cover-crop-mix', confidence: 'High' },
        affects: 64,
      },
      {
        id: 'cv-2',
        source: ['Potatoes maincrop', 'Jersey Royal'],
        options: CROP_VARIETY_OPTIONS,
        prediction: { value: 'potatoes-maincrop-jersey', confidence: 'High' },
        affects: 12,
      },
      {
        id: 'cv-3',
        source: ['Potatoes seed', 'NA'],
        options: CROP_VARIETY_OPTIONS,
        prediction: { value: 'potatoes-seed', confidence: 'High' },
      },
    ],
  },
  {
    id: 'iss-product-units',
    type: 'product-unit-mapping',
    title: 'Product unit mapping',
    sourceColumns: ['Source product', 'Source unit'],
    targetColumns: ['Sandy product', 'Sandy unit'],
    rows: [
      {
        id: 'pu-1',
        source: ['Yara Mila Actyva S', 'kg/ha'],
        options: PRODUCT_UNIT_OPTIONS,
        prediction: { value: 'kg-ha', confidence: 'High' },
        affects: 128,
      },
      {
        id: 'pu-2',
        source: ['Roundup Flex', 'litres/ha'],
        options: PRODUCT_UNIT_OPTIONS,
        prediction: { value: 'l-ha', confidence: 'High' },
        affects: 36,
      },
    ],
  },
  {
    id: 'iss-operation',
    type: 'operation-mapping',
    title: 'Operation group and type mapping',
    sourceColumns: ['Source group', 'Source type'],
    targetColumns: ['Sandy group', 'Sandy type'],
    rows: [
      {
        id: 'op-1',
        source: ['Crop protection', 'Fungicides'],
        options: OPERATION_OPTIONS,
        prediction: { value: 'crop-protection-fungicides', confidence: 'High' },
        affects: 84,
      },
      {
        id: 'op-2',
        source: ['Crop protection', 'Herbicides'],
        options: OPERATION_OPTIONS,
        prediction: { value: 'crop-protection-herbicides', confidence: 'High' },
        affects: 51,
      },
      {
        id: 'op-3',
        source: ['Nutrition', 'Manufactured fertiliser'],
        options: OPERATION_OPTIONS,
        prediction: { value: 'nutrition-manufactured', confidence: 'High' },
        affects: 240,
      },
    ],
  },
  {
    id: 'iss-tillage',
    type: 'tillage-mapping',
    title: 'Tillage method mapping',
    sourceColumns: ['Source method', ''],
    targetColumns: ['Sandy method', ''],
    rows: [
      {
        id: 'ti-1',
        source: ['Strip till', ''],
        options: TILLAGE_OPTIONS,
        prediction: { value: 'strip-till', confidence: 'High' },
        affects: 18,
      },
      {
        id: 'ti-2',
        source: ['Min-till', ''],
        options: TILLAGE_OPTIONS,
        prediction: { value: 'min-till', confidence: 'Medium' },
      },
    ],
  },
]
