/* -------------------------------------------------------------------------- */
/* Normalised validation-error catalogue                                       */
/* -------------------------------------------------------------------------- */

/**
 * Single source of truth for every validation Sandy can raise during data
 * onboarding. One record per error code; the UI table and (eventually) the
 * Fix-issues flow both read from this catalogue.
 */

export type ValidationSeverity = 'blocking' | 'warning'

/**
 * Top-level area of Sandy's onboarding flow this validation belongs to.
 * Each area maps onto a step in the data-upload wizard:
 *   - `refinement`  — Refine step (file structure, value mapping, unknown
 *                     farms/fields).
 *   - `fixes`       — Fix-issues step (row-level attribute, cross-field and
 *                     cross-record rules — what this catalogue grew out of).
 *   - `completeness`— Completeness step (missing optional data Sandy will
 *                     otherwise have to assume).
 *   - `anomalies`   — Anomaly-detection step (statistical / outlier checks
 *                     against historical baselines).
 */
export type ValidationArea =
  | 'refinement'
  | 'fixes'
  | 'completeness'
  | 'anomalies'

export const VALIDATION_AREA_ORDER: ValidationArea[] = [
  'refinement',
  'fixes',
  'completeness',
  'anomalies',
]

export const VALIDATION_AREA_LABEL: Record<ValidationArea, string> = {
  refinement: 'Refinement',
  fixes: 'Fixes',
  completeness: 'Completeness',
  anomalies: 'Anomalies',
}

/**
 * Where in Sandy's validation stack the rule lives. Mirrors Milad's
 * "business validation" vs "data point validation" qualification from the
 * brief, with a third bucket for purely structural / attribute checks.
 */
export type ValidationType =
  | 'attribute' // Cell-level: required, max length, valid year/date.
  | 'reference' // FK-style: value must exist in a reference table.
  | 'data-point' // Single-record numeric/date sanity (range, > 0, …).
  | 'cross-field' // Two fields on the same record compared.
  | 'business' // Cross-record / cross-entity rules (dupes, orphans).

/**
 * Which table the rule fires on. `general` covers attribute checks shared
 * across every entity (required, max-length, year-format).
 */
export type ValidationScope =
  | 'general'
  | 'farm'
  | 'field'
  | 'cropping'
  | 'operations'
  | 'fertiliser'
  | 'soil'

/**
 * Action the user can take from an issue card / row. Keep this list short —
 * UI components branch on `kind` to render the right control.
 */
export type ValidationAction =
  | { kind: 'edit-value'; label: string }
  | { kind: 'map-value'; label: string }
  | { kind: 'exclude-row'; label: string }
  | { kind: 'merge'; label: string }
  | { kind: 'remove-from-file'; label: string }
  | { kind: 'acknowledge'; label: string }
  | { kind: 'contact-support'; label: string }

export type ValidationError = {
  /** Stable code — `<scope>.<rule>` so they're greppable and sortable. */
  code: string
  /** Wizard area the validation lives in. Omit to default to `'fixes'`. */
  area?: ValidationArea
  type: ValidationType
  severity: ValidationSeverity
  scope: ValidationScope
  /** Short title shown at the top of an issue card. */
  title: string
  /**
   * Sandy's raw error template with `{placeholder}` slots, e.g.
   * `'{column} is required.'`. Stable across releases so server-side
   * messages can map onto it.
   */
  messageTemplate: string
  /** Human, friendly version of the message — what we render in the UI. */
  uxCopy: string
  /** Plain-English description of when this fires (the trigger). */
  trigger: string
  /** Optional concrete example to anchor the rule. */
  example?: string
  /** Suggested user actions, in priority order. */
  actions: ValidationAction[]
  /** Tags useful for filtering ("duplicate", "orphan", "loose", …). */
  tags?: string[]
}

/* -------------------------------------------------------------------------- */
/* Reusable action presets                                                     */
/* -------------------------------------------------------------------------- */

const editValue = (label = 'Edit value'): ValidationAction => ({
  kind: 'edit-value',
  label,
})
const excludeRow = (label = 'Exclude row'): ValidationAction => ({
  kind: 'exclude-row',
  label,
})
const mapValue = (label = 'Map to existing value'): ValidationAction => ({
  kind: 'map-value',
  label,
})
const merge = (label = 'Merge with existing'): ValidationAction => ({
  kind: 'merge',
  label,
})
const removeFromFile = (label = 'Remove from file'): ValidationAction => ({
  kind: 'remove-from-file',
  label,
})
const acknowledge = (label = 'Acknowledge'): ValidationAction => ({
  kind: 'acknowledge',
  label,
})
const contactSupport = (label = 'Contact support'): ValidationAction => ({
  kind: 'contact-support',
  label,
})

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

export const VALIDATION_ERRORS: ValidationError[] = [
  /* -- General · Attribute-based validation -------------------------------- */
  {
    code: 'general.required',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Required value missing',
    messageTemplate: '{column} is required.',
    uxCopy: '{column} is required — fill it in or exclude the row.',
    trigger: 'A required field is null or empty.',
    example: '"Working area" is empty on 4 cropping rows.',
    actions: [editValue('Add value'), excludeRow()],
    tags: ['required'],
  },
  {
    code: 'general.max-length',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Value too long',
    messageTemplate: '{column} max length {max}.',
    uxCopy: '{column} must be {max} characters or fewer.',
    trigger: 'Field length exceeds the maximum allowed.',
    example: '"Variety name" exceeds 60 characters.',
    actions: [editValue('Truncate value'), excludeRow()],
    tags: ['length'],
  },
  {
    code: 'general.year-invalid',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Invalid year',
    messageTemplate: '{column} is invalid.',
    uxCopy: '{column} must be a 4-digit year.',
    trigger: 'Year field is not 4 digits or not a valid integer.',
    example: '"Harvest year" reads "20245".',
    actions: [editValue('Set year'), excludeRow()],
    tags: ['year', 'format'],
  },

  /* -- General · Datetime validation --------------------------------------- */
  {
    code: 'general.date-invalid',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Invalid date format',
    messageTemplate: '{column} must be a valid date.',
    uxCopy: '{column} must be a valid date in the format DD-MMM-YY.',
    trigger:
      'Field fails [NullableDateTimeValidation] — value is not a real date.',
    example: '"31-Feb-24" is not a real date.',
    actions: [editValue('Choose a date'), excludeRow()],
    tags: ['date', 'format'],
  },

  /* -- General · Duplicate validation -------------------------------------- */
  {
    code: 'general.duplicate-sandy-id',
    type: 'business',
    severity: 'blocking',
    scope: 'farm',
    title: 'Farm already exists',
    messageTemplate:
      'This {entity} already exists in Sandy for your organisation.',
    uxCopy:
      '"{entity}" already exists in Sandy — merge with the existing record or rename.',
    trigger: 'Multiple records share the same Sandy ID.',
    example: '"Brookside Leys" already exists under your organisation.',
    actions: [merge(), editValue('Rename'), excludeRow()],
    tags: ['duplicate'],
  },

  /* -- Field table --------------------------------------------------------- */
  {
    code: 'field.positive-int',
    type: 'data-point',
    severity: 'blocking',
    scope: 'field',
    title: 'Number must be greater than 0',
    messageTemplate: '{column} should be a number greater than 0.',
    uxCopy: '{column} must be a whole number greater than 0.',
    trigger: 'Positive-integer field is ≤ 0 or not a valid integer.',
    example: '"Sampling depth" is -15 cm.',
    actions: [editValue('Set value'), excludeRow()],
    tags: ['range'],
  },
  {
    code: 'field.decimal-range',
    type: 'data-point',
    severity: 'blocking',
    scope: 'field',
    title: 'Value out of allowed range',
    messageTemplate:
      '{column} should be a decimal value, more[or equal] {min} and less[or equal] {max}.',
    uxCopy: '{column} must be between {min} and {max}.',
    trigger: 'Decimal value is outside the allowed range.',
    example: 'pH value 12.4 is outside the 3–10 range.',
    actions: [editValue('Adjust value'), excludeRow()],
    tags: ['range'],
  },

  /* -- Cropping table ------------------------------------------------------ */
  {
    code: 'cropping.planting-after-harvest',
    type: 'cross-field',
    severity: 'blocking',
    scope: 'cropping',
    title: 'Planting date after harvest',
    messageTemplate: '{planting} cannot be after {harvest}.',
    uxCopy:
      'Planting date is after the harvest date — swap the two or correct one.',
    trigger: 'PlantingDateValue > HarvestDateValue.',
    example: 'Planting 2024-10-12 vs harvest 2024-08-21.',
    actions: [editValue('Fix dates'), excludeRow()],
    tags: ['date', 'cross-field'],
  },
  {
    code: 'cropping.harvest-gt-total',
    type: 'cross-field',
    severity: 'blocking',
    scope: 'cropping',
    title: 'Harvest yield greater than total',
    messageTemplate: '{harvestYield} cannot be more than {totalYield}.',
    uxCopy: 'Harvest yield cannot exceed total yield — reduce one to match.',
    trigger: 'HarvestYieldRaw > TotalYieldRaw.',
    example: 'Harvest 24.1 t vs total 22.0 t.',
    actions: [editValue('Adjust yields'), excludeRow()],
    tags: ['yield', 'cross-field'],
  },
  {
    code: 'cropping.crop-type-unknown',
    type: 'reference',
    severity: 'blocking',
    scope: 'cropping',
    title: 'Crop type not recognised',
    messageTemplate: '{column} is invalid.',
    uxCopy:
      'Crop type "{value}" is not in the Sandy reference list — map it to a known type.',
    trigger:
      'CropType is not found in MstCropTypes (non-deleted entries only).',
    example: '"Winter rapeseed" → suggested "Winter oilseed rape".',
    actions: [mapValue('Map to Sandy crop type'), excludeRow()],
    tags: ['reference', 'mapping'],
  },

  /* -- Deletion restriction ------------------------------------------------ */
  {
    code: 'operations.deletion-not-allowed',
    type: 'business',
    severity: 'blocking',
    scope: 'operations',
    title: 'Deletion is not allowed',
    messageTemplate: 'Deletion is not allowed for {entity}.',
    uxCopy:
      'Crop protection records cannot be deleted via upload. Remove the deletion from the file.',
    trigger: 'Action is set to DELETE for crop-protection records.',
    actions: [removeFromFile(), contactSupport()],
    tags: ['deletion'],
  },

  /* -- Loose / business-rule errors ---------------------------------------- */
  {
    code: 'cropping.area-exceeds-field',
    type: 'business',
    severity: 'warning',
    scope: 'cropping',
    title: 'Crop area exceeds field area',
    messageTemplate:
      'Crop area ({cropArea} ha) exceeds field area ({fieldArea} ha).',
    uxCopy:
      'A crop covers more ground than the field has — cap at the field area or split the record.',
    trigger: 'Sum of crop areas on a field exceeds the field boundary area.',
    example: 'Crop area 32 ha on a 28.4 ha field.',
    actions: [editValue('Cap at field area'), acknowledge()],
    tags: ['area', 'loose'],
  },
  {
    code: 'cropping.duplicate',
    type: 'business',
    severity: 'blocking',
    scope: 'cropping',
    title: 'Duplicate cropping record',
    messageTemplate: 'Duplicate cropping record on key {key}.',
    uxCopy:
      'This crop is already saved for the same field and year — keep one, drop the other.',
    trigger:
      'Two cropping rows share the key farm + field + year + crop type + name + variety + crop ID.',
    example: 'Winter wheat · Marlpit · 2024 appears twice.',
    actions: [excludeRow('Drop duplicate'), merge('Merge into one')],
    tags: ['duplicate', 'key'],
  },
  {
    code: 'cropping.yield-zero',
    type: 'data-point',
    severity: 'warning',
    scope: 'cropping',
    title: 'Yield recorded as zero',
    messageTemplate: '{column} is recorded as 0 — confirm or supply a value.',
    uxCopy:
      'Yield is recorded as zero — confirm it really was a failed crop or correct the value.',
    trigger: 'Yield value is 0.',
    actions: [acknowledge('Confirm zero'), editValue('Set value')],
    tags: ['yield', 'loose'],
  },
  {
    code: 'fertiliser.duplicate',
    type: 'business',
    severity: 'warning',
    scope: 'fertiliser',
    title: 'Duplicate fertiliser record',
    messageTemplate:
      'Identical fertiliser records detected for field {field}, crop {crop}, year {year}.',
    uxCopy:
      'Identical fertiliser records detected for the same field, crop and year — confirm both happened or de-duplicate.',
    trigger:
      'Two fertiliser rows share field + crop + year (product, rate and date may also match).',
    actions: [acknowledge('Confirm both'), excludeRow('Drop one')],
    tags: ['duplicate', 'loose'],
  },
  {
    code: 'operations.duplicate',
    type: 'business',
    severity: 'warning',
    scope: 'operations',
    title: 'Duplicate operation record',
    messageTemplate: 'Duplicate operation on {field} · {date}.',
    uxCopy:
      'Two operations recorded with the same key — operations duplicates are accepted but flagged.',
    trigger: 'Operations rows share the same record key. Allowed with warning.',
    actions: [acknowledge('Confirm both'), excludeRow('Drop one')],
    tags: ['duplicate'],
  },

  /* -- Business logic · cross-table dependency ----------------------------- */
  {
    code: 'operations.orphan',
    type: 'business',
    severity: 'blocking',
    scope: 'operations',
    title: 'Operation has no matching cropping record',
    messageTemplate:
      'Operation references cropping key {key} which does not exist.',
    uxCopy:
      'This operation has no matching cropping record (farm + field + year + crop type + name + variety + crop ID) — it cannot be tied to a crop.',
    trigger:
      'Operations row references a cropping key that is not in the upload or in Sandy.',
    example: 'Operation op-22 references CR-1183 which is not in this upload.',
    actions: [
      mapValue('Attach to existing cropping'),
      excludeRow('Exclude operation'),
    ],
    tags: ['orphan', 'business', 'key'],
  },
]

/* -------------------------------------------------------------------------- */
/* Lookup + filter helpers                                                     */
/* -------------------------------------------------------------------------- */

export const VALIDATION_BY_CODE: Record<string, ValidationError> =
  Object.fromEntries(VALIDATION_ERRORS.map((e) => [e.code, e]))

/** Resolved area for an error — defaults to `'fixes'` when omitted. */
export const areaOf = (error: ValidationError): ValidationArea =>
  error.area ?? 'fixes'

export const VALIDATION_TYPE_LABEL: Record<ValidationType, string> = {
  attribute: 'Attribute',
  reference: 'Reference table',
  'data-point': 'Data point',
  'cross-field': 'Cross-field',
  business: 'Business logic',
}

export const VALIDATION_SCOPE_LABEL: Record<ValidationScope, string> = {
  general: 'General',
  farm: 'Farm',
  field: 'Field',
  cropping: 'Cropping',
  operations: 'Operations',
  fertiliser: 'Fertiliser',
  soil: 'Soil',
}

export const VALIDATION_SEVERITY_LABEL: Record<ValidationSeverity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
}
