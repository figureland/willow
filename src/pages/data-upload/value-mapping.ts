/* -------------------------------------------------------------------------- */
/* Value mapping — model, vocab + fixtures                                     */
/* -------------------------------------------------------------------------- */

/**
 * Value-mapping issues surface when Sandy spots column values that don't
 * match any known synonym in the canonical vocab. The user resolves them
 * one source value at a time — either picking the matching known value or
 * adding the unknown one as a new rule.
 *
 * Rules are scoped by data category (Operations / Cropping / Soil sampling)
 * so a mapping the user creates for an Operations file is reused next time
 * any Operations file is ingested. The data model below keys resolutions
 * by `(category, sourceValue)` so that scope is captured.
 */

export type DataCategory = 'operational' | 'cropping' | 'soil-sampling'

export const DATA_CATEGORY_LABEL: Record<DataCategory, string> = {
  operational: 'Operations',
  cropping: 'Cropping',
  'soil-sampling': 'Soil sampling',
}

/** A canonical value in our vocabulary (e.g. "Winter wheat"). */
export type CanonicalValue = {
  value: string
  label: string
}

/** Known canonical values per category, surfaced as Select options. */
export const CANONICAL_VOCAB: Record<DataCategory, CanonicalValue[]> = {
  operational: [
    { value: 'spraying', label: 'Spraying' },
    { value: 'fertilising', label: 'Fertilising' },
    { value: 'drilling', label: 'Drilling' },
    { value: 'cultivation', label: 'Cultivation' },
    { value: 'harvest', label: 'Harvest' },
    { value: 'drenching', label: 'Drenching' },
  ],
  cropping: [
    { value: 'winter-wheat', label: 'Winter wheat' },
    { value: 'spring-wheat', label: 'Spring wheat' },
    { value: 'winter-barley', label: 'Winter barley' },
    { value: 'spring-barley', label: 'Spring barley' },
    { value: 'oilseed-rape', label: 'Oilseed rape' },
    { value: 'winter-oats', label: 'Winter oats' },
    { value: 'spring-oats', label: 'Spring oats' },
    { value: 'sugar-beet', label: 'Sugar beet' },
    { value: 'maize', label: 'Maize' },
    { value: 'spring-beans', label: 'Spring beans' },
    { value: 'winter-beans', label: 'Winter beans' },
    { value: 'peas', label: 'Peas' },
    { value: 'potatoes-maincrop', label: 'Potatoes maincrop' },
    { value: 'potatoes-seed', label: 'Potatoes seed' },
    { value: 'grass-ley', label: 'Grass ley' },
    { value: 'permanent-pasture', label: 'Permanent pasture' },
    { value: 'cover-crop', label: 'Cover crop' },
  ],
  'soil-sampling': [
    { value: 'walkley-black', label: 'Walkley-Black' },
    { value: 'dumas-combustion', label: 'Dumas combustion' },
    { value: 'loss-on-ignition', label: 'Loss on ignition' },
  ],
}

/* -------------------------------------------------------------------------- */
/* Per-issue payload                                                           */
/* -------------------------------------------------------------------------- */

export type SourceValue = {
  /** Raw value as it appeared in the user's spreadsheet. */
  value: string
  /** How many rows in the upload carry this value — drives the "applies to
   *  N rows" hint so the user knows the blast radius of their decision. */
  occurrences: number
  /** Sandy's best guess at a canonical match (id from CANONICAL_VOCAB). */
  suggestion?: string
}

/* -------------------------------------------------------------------------- */
/* Resolution state for a single source value                                  */
/* -------------------------------------------------------------------------- */

export type ValueMappingDecision =
  /** Map this source value onto an existing canonical value. */
  | { kind: 'map'; canonicalValue: string }
  /** Add the source value as a brand-new canonical value (the user types a
   *  human label that will become part of the vocab going forward). */
  | { kind: 'create'; label: string }
  /** Skip — leave this source value unmapped for now. */
  | { kind: 'skip' }

/** Map keyed by sourceValue. Owns the per-row decisions inside an issue. */
export type ValueMappingDecisions = Record<string, ValueMappingDecision>

/* -------------------------------------------------------------------------- */
/* Mock seed payloads — one per (category, column)                             */
/* -------------------------------------------------------------------------- */

export type ValueMappingFixture = {
  category: DataCategory
  /** Filename the unknown values were detected in. */
  filename: string
  /** Sheet within the workbook. */
  sheetName: string
  /** Column name as it appears in the source file. */
  sourceColumn: string
  /** Human-friendly label for the canonical target field. */
  targetLabel: string
  /** Detected unknown values + suggestions. */
  values: SourceValue[]
}

export const MOCK_VALUE_MAPPING_FIXTURES: ValueMappingFixture[] = [
  {
    category: 'operational',
    filename: 'xfarm-operations-export.xlsx',
    sheetName: 'PRD_Fertilizers',
    sourceColumn: 'prodActivity',
    targetLabel: 'Operation type',
    values: [
      { value: 'Spray', occurrences: 320, suggestion: 'spraying' },
      { value: 'Fert', occurrences: 184, suggestion: 'fertilising' },
      { value: 'Drill', occurrences: 92, suggestion: 'drilling' },
      { value: 'Cult', occurrences: 64, suggestion: 'cultivation' },
      { value: 'Drench', occurrences: 18, suggestion: 'drenching' },
    ],
  },
  {
    category: 'cropping',
    filename: 'arable-2024-cropping-plan.xlsx',
    sheetName: 'PRD_Cropping',
    sourceColumn: 'commodityName',
    targetLabel: 'Crop name',
    values: [
      { value: 'WW', occurrences: 184, suggestion: 'winter-wheat' },
      { value: 'OSR', occurrences: 92, suggestion: 'oilseed-rape' },
      { value: 'SB', occurrences: 48, suggestion: 'spring-barley' },
      { value: 'WB', occurrences: 36, suggestion: 'winter-barley' },
      { value: 'Beans', occurrences: 24, suggestion: 'spring-beans' },
      { value: 'Mz', occurrences: 36, suggestion: 'maize' },
      { value: 'PMC', occurrences: 14, suggestion: 'potatoes-maincrop' },
    ],
  },
]
