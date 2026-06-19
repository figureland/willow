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
 * Generic mapping issue used for 3–7. The source values are what the import
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

export type Issue = FarmMissingIssue | FieldMissingIssue | MappingIssue

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What the resolver starts with. Mapping issues default to accepting Sandy's
 * prediction (when supplied), which feels right for the "happy path" — the
 * user just clicks through. Farm/field issues start `pending` because the
 * choice between remove/create/match is meaningful.
 */
export const defaultResolutionForIssue = (issue: Issue): Resolution => {
  if (issue.type === 'farm-missing' || issue.type === 'field-missing') {
    return { kind: 'pending' }
  }
  return { kind: 'pending' }
}

/* -------------------------------------------------------------------------- */
/* Mock data                                                                   */
/* -------------------------------------------------------------------------- */

const EXISTING_FARMS = [
  { value: 'farm-brookside-leys', label: 'Brookside Leys' },
  { value: 'farm-foxglove-hill', label: 'Foxglove Hill' },
  { value: 'farm-amber-harvest', label: 'Amber Harvest Farm' },
]

const EXISTING_FIELDS = [
  { value: 'field-millpond', label: 'Millpond' },
  { value: 'field-orchard-fold', label: 'Orchard Fold' },
  { value: 'field-mill-lane', label: 'Mill Lane' },
  { value: 'field-saltway', label: 'Saltway' },
  { value: 'field-stone-pightle', label: 'Stone Pightle' },
]

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
