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

/**
 * Paired crop + variety options — used by the "Crop and variety" fixture
 * where each source row carries both a crop name and a variety. The value
 * encodes both halves; the label is human-friendly with a separator.
 */
export const CROP_VARIETY_PAIR_OPTIONS: CanonicalValue[] = [
  { value: 'winter-wheat|skyfall', label: 'Winter wheat · Skyfall' },
  { value: 'winter-wheat|extase', label: 'Winter wheat · Extase' },
  { value: 'winter-wheat|crusoe', label: 'Winter wheat · Crusoe' },
  { value: 'spring-barley|laureate', label: 'Spring barley · Laureate' },
  { value: 'spring-barley|planet', label: 'Spring barley · Planet' },
  { value: 'oilseed-rape|aurelia', label: 'Oilseed rape · Aurelia' },
  { value: 'oilseed-rape|aviator', label: 'Oilseed rape · Aviator' },
  { value: 'sugar-beet|magpie', label: 'Sugar beet · Magpie' },
  { value: 'sugar-beet|katja', label: 'Sugar beet · Katja' },
  {
    value: 'potatoes-maincrop|maris-piper',
    label: 'Potatoes maincrop · Maris Piper',
  },
  {
    value: 'potatoes-maincrop|king-edward',
    label: 'Potatoes maincrop · King Edward',
  },
  { value: 'maize|forage-mix', label: 'Maize · Forage mix' },
  { value: 'cover-crop|mustard-vetch', label: 'Cover crop · Mustard / Vetch' },
]

/** Operation-type vocabulary — wider list to drive a richer Operations example. */
export const OPERATION_TYPE_OPTIONS: CanonicalValue[] = [
  { value: 'spraying-pre-emergence', label: 'Spraying · Pre-emergence' },
  { value: 'spraying-fungicide', label: 'Spraying · Fungicide' },
  { value: 'spraying-herbicide', label: 'Spraying · Herbicide' },
  { value: 'spraying-insecticide', label: 'Spraying · Insecticide' },
  { value: 'fertilising-broadcast', label: 'Fertilising · Broadcast' },
  { value: 'fertilising-precision', label: 'Fertilising · Precision' },
  { value: 'drilling-direct', label: 'Drilling · Direct' },
  { value: 'cultivation-shallow', label: 'Cultivation · Shallow' },
  { value: 'cultivation-deep', label: 'Cultivation · Deep plough' },
  { value: 'harvest-combine', label: 'Harvest · Combine' },
]

/** Unit vocabulary — covers liquid, solid + ratio forms. */
export const UNIT_OPTIONS: CanonicalValue[] = [
  { value: 'l-ha', label: 'L/ha' },
  { value: 'kg-ha', label: 'kg/ha' },
  { value: 'g-ha', label: 'g/ha' },
  { value: 't-ha', label: 't/ha' },
  { value: 'units-ha', label: 'units/ha' },
  { value: 'ml-ha', label: 'mL/ha' },
]

/** Tillage method vocabulary. */
export const TILLAGE_METHOD_OPTIONS: CanonicalValue[] = [
  { value: 'conventional', label: 'Conventional tillage' },
  { value: 'min-till', label: 'Min-till' },
  { value: 'no-till', label: 'No-till' },
  { value: 'strip-till', label: 'Strip-till' },
  { value: 'direct-drill', label: 'Direct drill' },
]

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
  /**
   * Optional secondary raw value paired with the primary one — used when a
   * canonical option lives at the intersection of two columns (e.g. crop
   * name + variety). The pair is treated as one decision: pick a single
   * canonical option that captures both.
   */
  secondary?: string
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
  /**
   * Optional secondary column when the issue is a paired lookup (e.g.
   * crop + variety). When present each source value carries a `secondary`
   * entry alongside the primary, and the canonical options encode both.
   */
  secondaryColumn?: string
  /** Human-friendly label for the canonical target field. */
  targetLabel: string
  /** Override the canonical vocabulary for this fixture (used for paired
   *  options where the value is the concatenated id). */
  canonicalOverride?: { value: string; label: string }[]
  /** Detected unknown values + suggestions. */
  values: SourceValue[]
}

export const MOCK_VALUE_MAPPING_FIXTURES: ValueMappingFixture[] = [
  {
    category: 'cropping',
    filename: 'arable-2024-cropping-plan.xlsx',
    sheetName: 'PRD_Cropping',
    sourceColumn: 'commodityName',
    secondaryColumn: 'variety',
    targetLabel: 'Crop and variety',
    canonicalOverride: CROP_VARIETY_PAIR_OPTIONS,
    values: [
      {
        value: 'WW',
        secondary: 'SKY',
        occurrences: 142,
        suggestion: 'winter-wheat|skyfall',
      },
      {
        value: 'WW',
        secondary: 'EXT',
        occurrences: 88,
        suggestion: 'winter-wheat|extase',
      },
      {
        value: 'OSR',
        secondary: 'AUR',
        occurrences: 64,
        suggestion: 'oilseed-rape|aurelia',
      },
      {
        value: 'SB',
        secondary: 'LAU',
        occurrences: 52,
        suggestion: 'spring-barley|laureate',
      },
      {
        value: 'PMC',
        secondary: 'MP',
        occurrences: 21,
        suggestion: 'potatoes-maincrop|maris-piper',
      },
      // Three unguessable rows so the user has work to do.
      { value: 'Mz', secondary: 'FM', occurrences: 18 },
      { value: 'SB-X', secondary: '', occurrences: 12 },
      { value: 'CC', secondary: 'MV', occurrences: 9 },
    ],
  },
  {
    category: 'operational',
    filename: 'xfarm-operations-export.xlsx',
    sheetName: 'PRD_Fertilizers',
    sourceColumn: 'prodActivity',
    targetLabel: 'Operation type',
    canonicalOverride: OPERATION_TYPE_OPTIONS,
    values: [
      {
        value: 'Spray-PreEm',
        occurrences: 184,
        suggestion: 'spraying-pre-emergence',
      },
      {
        value: 'Spray-Fung',
        occurrences: 120,
        suggestion: 'spraying-fungicide',
      },
      {
        value: 'Spray-Herb',
        occurrences: 72,
        suggestion: 'spraying-herbicide',
      },
      { value: 'Fert', occurrences: 184, suggestion: 'fertilising-broadcast' },
      {
        value: 'Fert-Prec',
        occurrences: 46,
        suggestion: 'fertilising-precision',
      },
      { value: 'Drill-Dir', occurrences: 92, suggestion: 'drilling-direct' },
      { value: 'Cult-S', occurrences: 38 },
      { value: 'Cult-D', occurrences: 22 },
      { value: 'Harv-Comb', occurrences: 18, suggestion: 'harvest-combine' },
    ],
  },
  {
    category: 'operational',
    filename: 'xfarm-operations-export.xlsx',
    sheetName: 'PRD_Chemicals',
    sourceColumn: 'doseUnit',
    targetLabel: 'Unit',
    canonicalOverride: UNIT_OPTIONS,
    values: [
      { value: 'l/ha', occurrences: 218, suggestion: 'l-ha' },
      { value: 'litres/ha', occurrences: 96, suggestion: 'l-ha' },
      { value: 'kg/ha', occurrences: 142, suggestion: 'kg-ha' },
      { value: 'g/ha', occurrences: 32, suggestion: 'g-ha' },
      { value: 'mL/ha', occurrences: 14, suggestion: 'ml-ha' },
      // Ambiguous shorthand that needs the user to pick.
      { value: 'u', occurrences: 7 },
      { value: 'lt/Ha', occurrences: 3 },
    ],
  },
  {
    category: 'cropping',
    filename: 'arable-2024-cropping-plan.xlsx',
    sheetName: 'PRD_Cropping',
    sourceColumn: 'tillageMethod',
    targetLabel: 'Tillage method',
    canonicalOverride: TILLAGE_METHOD_OPTIONS,
    values: [
      { value: 'Conv', occurrences: 76, suggestion: 'conventional' },
      { value: 'MT', occurrences: 48, suggestion: 'min-till' },
      { value: 'NT', occurrences: 36, suggestion: 'no-till' },
      { value: 'Strip', occurrences: 12, suggestion: 'strip-till' },
      { value: 'DD', occurrences: 8 },
    ],
  },
]
