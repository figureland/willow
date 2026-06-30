import type { DataCategory, ResolutionAction, ValidationError } from './types'

/* -------------------------------------------------------------------------- */
/* Validation catalogue                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Single source of truth for every validation Sandy can raise during data
 * onboarding.
 *
 * Each entry pairs the rule spec with the resolution actions available to
 * the user. The /validation-errors reference page renders this directly;
 * the data-upload Refine and Fix steps project from it to drive their UI.
 */

/* -------------------------------------------------------------------------- */
/* Action helpers — keep entry copy terse                                     */
/* -------------------------------------------------------------------------- */

const action = (
  kind: ResolutionAction['kind'],
  label: string,
  outcome: string,
  resolves = true,
): ResolutionAction => ({ kind, label, outcome, resolves })

/* -------------------------------------------------------------------------- */
/* Refinement — per data category, per canonical property                      */
/* -------------------------------------------------------------------------- */

/**
 * Refinement entries describe the two interactive sub-tasks Sandy and the
 * user collaborate on for every canonical property:
 *
 *   1. Schema transformation: where does this property live in the upload?
 *      (Which column, on which sheet, with which joins or derivations?)
 *   2. Value mapping: only for controlled-vocabulary properties. Translate
 *      the source values (e.g. "WW") into Sandy's reference vocabulary
 *      (e.g. "Winter wheat").
 *
 * A property may have one task or both. Numeric / date properties only
 * need schema. Identity properties (farm name, field name) only need
 * schema — the matching against existing Sandy records happens at a
 * separate stage. Controlled-vocab properties (crop type, crop variety,
 * operation type, unit, …) need both.
 */

type RefinementPropertyDef = {
  /** Slug used in the property list. */
  property: string
  /** Friendly label. */
  label: string
  /** Whether Sandy needs this property to land the upload. */
  required: boolean
  /** Optional one-line note (where it usually lives, how it's derived, …). */
  schemaNote?: string
  /** Set when this property has a controlled vocabulary and needs value mapping. */
  valueMappingNote?: string
}

const CATEGORY_SCOPE: Record<DataCategory, ValidationError['scope']> = {
  operations: 'operations',
  cropping: 'cropping',
  'soil-sampling': 'soil',
}

const DATA_CATEGORY_LABEL_FOR_TITLE: Record<DataCategory, string> = {
  operations: 'Operations',
  cropping: 'Cropping',
  'soil-sampling': 'Soil sampling',
}

/* -- Identity tasks (step 1, 2) — shared across all data categories ------ */

const ALL_DATA_CATEGORIES: DataCategory[] = [
  'operations',
  'cropping',
  'soil-sampling',
]

const MATCH_FARMS_ENTRY: ValidationError = {
  code: 'refinement.match-farms',
  area: 'refinement',
  uxKind: 'validation',
  dataCategories: ALL_DATA_CATEGORIES,
  refinementTask: 'identity',
  step: 1,
  type: 'identity',
  severity: 'blocking',
  scope: 'farm',
  title: 'Match farms',
  messageTemplate: '',
  uxCopy:
    'For every farm name in the upload, find the matching Sandy farm or create a new one. Actions below apply to one farm or many farms at a time.',
  trigger:
    'A farm name in the upload that does not match an existing Sandy farm under this organisation.',
  actions: [
    action(
      'accept-suggestion',
      'Match to suggested farm',
      "Connects the source farm to Sandy's suggested existing farm. Applies to every row that uses this farm name.",
    ),
    action(
      'choose-alternative',
      'Choose a different existing farm',
      'Picks an existing Sandy farm for the source name.',
    ),
    action(
      'create-new',
      'Create a new farm',
      "Adds the source farm to this organisation's farm list.",
    ),
    action(
      'exclude',
      'Exclude this farm',
      'Drops every row that references this farm name from the upload.',
    ),
  ],
}

const MATCH_FIELDS_ENTRY: ValidationError = {
  code: 'refinement.match-fields',
  area: 'refinement',
  uxKind: 'validation',
  dataCategories: ALL_DATA_CATEGORIES,
  refinementTask: 'identity',
  step: 2,
  type: 'identity',
  severity: 'blocking',
  scope: 'field',
  title: 'Match fields',
  messageTemplate: '',
  uxCopy:
    'For every field name in the upload, find the matching field on its (already resolved) farm or create a new one. Actions below apply to one field or many fields at a time.',
  trigger:
    'A field name in the upload that does not match an existing field on its resolved farm.',
  actions: [
    action(
      'accept-suggestion',
      'Match to suggested field',
      "Connects the source field to Sandy's suggested existing field. Applies to every row that uses this field name.",
    ),
    action(
      'choose-alternative',
      'Choose a different existing field',
      'Picks an existing field on the resolved farm.',
    ),
    action(
      'create-new',
      'Create a new field',
      'Adds the source field to its resolved farm.',
    ),
    action(
      'exclude',
      'Exclude this field',
      'Drops every row that references this field name from the upload.',
    ),
  ],
}

/* -- Schema transformation (step 3) -------------------------------------- */

const schemaTransformationEntry = (
  category: DataCategory,
  defs: RefinementPropertyDef[],
): ValidationError => ({
  code: `refinement.${category}.schema-transformation`,
  area: 'refinement',
  uxKind: 'validation',
  dataCategories: [category],
  refinementTask: 'schema-transformation',
  step: 3,
  type: 'structural',
  severity: 'blocking',
  scope: CATEGORY_SCOPE[category],
  title: `${DATA_CATEGORY_LABEL_FOR_TITLE[category]} schema transformation`,
  messageTemplate: '',
  uxCopy: `Tell Sandy where each canonical ${DATA_CATEGORY_LABEL_FOR_TITLE[category].toLowerCase()} property lives in the upload. Sandy proposes a column for every property; the user confirms or points at a different column.`,
  trigger: `Sandy needs to know where each canonical ${DATA_CATEGORY_LABEL_FOR_TITLE[category].toLowerCase()} property lives in the upload so it can extract values for every row.`,
  actions: [
    action(
      'accept-suggestion',
      'Confirm all suggested columns',
      "Locks in Sandy's suggested column for every property in the list.",
    ),
    action(
      'override-recipe',
      'Override individual properties',
      'Lets the user point Sandy at a different column for any property whose default is wrong.',
    ),
    action(
      'exclude',
      'Skip this data category',
      `Drops the entire ${DATA_CATEGORY_LABEL_FOR_TITLE[category].toLowerCase()} extraction for this upload.`,
    ),
  ],
  properties: defs.map((d) => ({
    property: d.property,
    label: d.label,
    required: d.required,
    note: d.schemaNote,
  })),
})

/* -- Value mapping (step 4) ---------------------------------------------- */

const valueMappingEntry = (
  category: DataCategory,
  defs: RefinementPropertyDef[],
): ValidationError | null => {
  const vocab = defs.filter((d) => d.valueMappingNote)
  if (vocab.length === 0) return null
  return {
    code: `refinement.${category}.value-mapping`,
    area: 'refinement',
    uxKind: 'validation',
    dataCategories: [category],
    refinementTask: 'value-mapping',
    step: 4,
    type: 'reference',
    severity: 'blocking',
    scope: CATEGORY_SCOPE[category],
    title: `${DATA_CATEGORY_LABEL_FOR_TITLE[category]} value mapping`,
    messageTemplate: '',
    uxCopy:
      "Translate source values into Sandy's reference vocabularies for the controlled-vocab properties in this category.",
    trigger:
      "Source values that don't match Sandy's reference vocabulary for the listed properties.",
    actions: [
      action(
        'accept-suggestion',
        'Accept suggested mappings',
        "Confirms Sandy's best-guess mapping for every source value across the listed properties.",
      ),
      action(
        'map-values',
        'Map each value manually',
        'Opens a per-value picker so the user matches each source value to a Sandy reference value.',
      ),
      action(
        'create-new',
        'Save unmatched values as new',
        "Adds unrecognised values to the organisation's custom reference lists.",
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row that uses an unmapped source value.',
      ),
    ],
    properties: vocab.map((d) => ({
      property: d.property,
      label: d.label,
      required: d.required,
      note: d.valueMappingNote,
    })),
  }
}

const refinementFor = (
  category: DataCategory,
  defs: RefinementPropertyDef[],
): ValidationError[] => {
  const out: ValidationError[] = [schemaTransformationEntry(category, defs)]
  const vm = valueMappingEntry(category, defs)
  if (vm) out.push(vm)
  return out
}

/* -- Operations --------------------------------------------------------- */

const OPERATIONS_PROPERTIES: RefinementPropertyDef[] = [
  {
    property: 'farm-name',
    label: 'Farm name',
    required: true,
    schemaNote:
      'In most exports the farm name lives on a related sheet and joins back via a field id.',
  },
  {
    property: 'field-name',
    label: 'Field name',
    required: true,
    schemaNote:
      'Usually a dedicated field-name column on the operations sheet.',
  },
  {
    property: 'field-size',
    label: 'Field size',
    required: true,
    schemaNote:
      'Usually a dedicated field-size column on the operations sheet.',
  },
  {
    property: 'crop-name',
    label: 'Crop name',
    required: true,
    schemaNote:
      'Often a numeric crop id on the operations sheet that joins to a master crops table for the human-readable name.',
    valueMappingNote:
      'Translate source crop names into Sandy crop catalogue entries.',
  },
  {
    property: 'crop-variety',
    label: 'Crop variety',
    required: true,
    schemaNote:
      'Often a numeric variety id on the operations sheet that joins to a master varieties table.',
    valueMappingNote:
      'Translate source variety values into Sandy variety catalogue entries, for example "WW" becomes "Winter wheat".',
  },
  {
    property: 'crop-id',
    label: 'Crop ID',
    required: true,
    schemaNote:
      'Usually not provided directly; derived by prefixing the source crop id, e.g. "ID-123".',
  },
  {
    property: 'crop-type',
    label: 'Crop type',
    required: true,
    schemaNote:
      'Often derived from a boolean cover-crop column on the operations sheet.',
    valueMappingNote:
      "Translate source crop type values into Sandy's reference set (main, cover crop).",
  },
  {
    property: 'working-area',
    label: 'Working area',
    required: true,
    schemaNote:
      'Usually a dedicated working-area column on the operations sheet.',
  },
  {
    property: 'harvest-year',
    label: 'Harvest year',
    required: true,
    schemaNote:
      'Usually a dedicated harvest-year column on the operations sheet.',
  },
  {
    property: 'operation-date',
    label: 'Operation date',
    required: true,
    schemaNote:
      'Usually a dedicated activity-date column on the operations sheet.',
  },
  {
    property: 'applied-area',
    label: 'Applied area',
    required: true,
    schemaNote:
      'Usually a dedicated applied-area column on the operations sheet.',
  },
  {
    property: 'operation-group',
    label: 'Operation group',
    required: true,
    schemaNote:
      'Often inferred from the source sheet (one sheet per group) rather than a column.',
    valueMappingNote:
      "Translate source group values into Sandy's reference set (Nutrition, Crop Protection, Cultivation, Establishment).",
  },
  {
    property: 'operation-type',
    label: 'Operation type',
    required: true,
    schemaNote: 'Usually a dedicated activity column on the operations sheet.',
    valueMappingNote:
      "Translate source operation type values into Sandy's reference set (Fungicides, Herbicides, Fertilising, …).",
  },
  {
    property: 'product-name',
    label: 'Product name',
    required: true,
    schemaNote: 'Usually a dedicated product column on the operations sheet.',
    valueMappingNote:
      "Translate source product names into Sandy's product catalogue, per operation group.",
  },
  {
    property: 'quantity',
    label: 'Quantity',
    required: true,
    schemaNote: 'Usually a dedicated dose column on the operations sheet.',
  },
  {
    property: 'unit',
    label: 'Unit',
    required: true,
    schemaNote: 'Usually a dedicated dose-unit column on the operations sheet.',
    valueMappingNote:
      'Translate source unit values into Sandy\'s unit vocabulary, for example "L/acre" becomes "L/ha".',
  },
]

/* -- Cropping ----------------------------------------------------------- */

const CROPPING_PROPERTIES: RefinementPropertyDef[] = [
  {
    property: 'farm-name',
    label: 'Farm name',
    required: true,
    schemaNote:
      'Usually a dedicated column on the cropping sheet, sometimes wrapped in brackets or quotes that need stripping.',
  },
  {
    property: 'field-name',
    label: 'Field name',
    required: true,
    schemaNote: 'Usually a dedicated field-name column on the cropping sheet.',
  },
  {
    property: 'harvest-year',
    label: 'Harvest year',
    required: true,
    schemaNote:
      'Usually a dedicated harvest-year column on the cropping sheet.',
  },
  {
    property: 'crop-name',
    label: 'Crop name',
    required: true,
    schemaNote:
      'Usually a dedicated commodity-name column on the cropping sheet.',
    valueMappingNote:
      'Translate source crop names into Sandy crop catalogue entries.',
  },
  {
    property: 'crop-type',
    label: 'Crop type',
    required: true,
    schemaNote:
      'Often derived from a boolean cover-crop column on the cropping sheet.',
    valueMappingNote:
      "Translate source crop type values into Sandy's reference set (main, cover crop).",
  },
  {
    property: 'crop-variety',
    label: 'Crop variety',
    required: true,
    schemaNote:
      'Usually a dedicated variety-name column on the cropping sheet.',
    valueMappingNote:
      'Translate source variety values into Sandy variety catalogue entries.',
  },
  {
    property: 'crop-id',
    label: 'Crop ID',
    required: true,
    schemaNote:
      'Usually not provided directly; derived by prefixing the source crop id, e.g. "ID-123".',
  },
  {
    property: 'working-area',
    label: 'Working area',
    required: true,
    schemaNote:
      'Usually a dedicated crop-size column on the cropping sheet. May be capped at field area when over.',
  },
  {
    property: 'crop-residue-management',
    label: 'Crop residue management',
    required: true,
    schemaNote:
      'Usually a dedicated cultivation-type column on the cropping sheet.',
    valueMappingNote:
      "Translate source residue management values into Sandy's reference set.",
  },
]

const REFINEMENT_ENTRIES: ValidationError[] = [
  MATCH_FARMS_ENTRY,
  MATCH_FIELDS_ENTRY,
  ...refinementFor('operations', OPERATIONS_PROPERTIES),
  ...refinementFor('cropping', CROPPING_PROPERTIES),
]

/* -------------------------------------------------------------------------- */
/* Fixes — row-level rule failures Sandy already knows about                   */
/* -------------------------------------------------------------------------- */

const FIXES_ENTRIES: ValidationError[] = [
  /* -- General · Attribute-based validation -------------------------------- */
  {
    code: 'fixes.general.required',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'attribute',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Required value missing',
    messageTemplate: '{column} is required.',
    uxCopy: '{column} is required — fill it in or exclude the row.',
    trigger: 'A required field is null or empty.',
    example: '"Working area" is empty on 4 cropping rows.',
    actions: [
      action(
        'edit-value',
        'Add a value',
        'Inline edit each affected row so the required cell is populated.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row missing this value from the upload.',
      ),
    ],
  },
  {
    code: 'fixes.general.max-length',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'attribute',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Value too long',
    messageTemplate: '{column} max length {max}.',
    uxCopy: '{column} must be {max} characters or fewer.',
    trigger: 'Field length exceeds the maximum allowed.',
    example: '"Variety name" exceeds 60 characters.',
    actions: [
      action(
        'edit-value',
        'Shorten value',
        'Inline edit to bring the value under {max} characters.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row with an over-length value.',
      ),
    ],
  },
  {
    code: 'fixes.general.year-invalid',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'attribute',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Invalid year',
    messageTemplate: '{column} is invalid.',
    uxCopy: '{column} must be a 4-digit year.',
    trigger: 'Year field is not 4 digits or not a valid integer.',
    example: '"Harvest year" reads "20245".',
    actions: [
      action(
        'edit-value',
        'Set a valid year',
        'Inline edit each affected row to a real 4-digit year.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row with an invalid year.',
      ),
    ],
  },
  {
    code: 'fixes.general.date-invalid',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'attribute',
    type: 'attribute',
    severity: 'blocking',
    scope: 'general',
    title: 'Invalid date format',
    messageTemplate: '{column} must be a valid date.',
    uxCopy: '{column} must be a valid date in the format DD-MMM-YY.',
    trigger:
      'Field fails [NullableDateTimeValidation] — value is not a real date.',
    example: '"31-Feb-24" is not a real date.',
    actions: [
      action(
        'edit-value',
        'Choose a date',
        'Inline edit each affected row to a valid DD-MMM-YY date.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row with an invalid date.',
      ),
    ],
  },
  {
    code: 'fixes.field.positive-int',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'attribute',
    type: 'data-point',
    severity: 'blocking',
    scope: 'field',
    title: 'Number must be greater than 0',
    messageTemplate: '{column} should be a number greater than 0.',
    uxCopy: '{column} must be a whole number greater than 0.',
    trigger: 'Positive-integer field is ≤ 0 or not a valid integer.',
    example: '"Sampling depth" is -15 cm.',
    actions: [
      action(
        'edit-value',
        'Set a positive value',
        'Inline edit each affected row to a whole number greater than 0.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row with an invalid value.',
      ),
    ],
  },
  {
    code: 'fixes.field.decimal-range',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'attribute',
    type: 'data-point',
    severity: 'blocking',
    scope: 'field',
    title: 'Value out of allowed range',
    messageTemplate:
      '{column} should be a decimal value, more[or equal] {min} and less[or equal] {max}.',
    uxCopy: '{column} must be between {min} and {max}.',
    trigger: 'Decimal value is outside the allowed range.',
    example: 'pH value 12.4 is outside the 3–10 range.',
    actions: [
      action(
        'edit-value',
        'Adjust value',
        'Inline edit each affected row to a value inside the allowed range.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row with an out-of-range value.',
      ),
    ],
  },
  {
    code: 'fixes.cropping.crop-type-unknown',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'attribute',
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
    actions: [
      action(
        'map-values',
        'Map to Sandy crop type',
        'Picks an existing Sandy crop type for every row using the unrecognised value.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row that uses an unrecognised crop type.',
      ),
    ],
  },
  {
    code: 'fixes.cropping.planting-after-harvest',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-field',
    type: 'cross-field',
    severity: 'blocking',
    scope: 'cropping',
    title: 'Planting date after harvest',
    messageTemplate: '{planting} cannot be after {harvest}.',
    uxCopy:
      'Planting date is after the harvest date — swap the two or correct one.',
    trigger: 'PlantingDateValue > HarvestDateValue.',
    example: 'Planting 2024-10-12 vs harvest 2024-08-21.',
    actions: [
      action(
        'edit-value',
        'Fix the dates',
        'Inline edit so the planting date precedes the harvest date.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row with the inverted date pair.',
      ),
    ],
  },
  {
    code: 'fixes.cropping.harvest-gt-total',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-field',
    type: 'cross-field',
    severity: 'blocking',
    scope: 'cropping',
    title: 'Harvest yield greater than total',
    messageTemplate: '{harvestYield} cannot be more than {totalYield}.',
    uxCopy: 'Harvest yield cannot exceed total yield — reduce one to match.',
    trigger: 'HarvestYieldRaw > TotalYieldRaw.',
    example: 'Harvest 24.1 t vs total 22.0 t.',
    actions: [
      action(
        'edit-value',
        'Adjust yields',
        'Inline edit so harvest yield is at most equal to total yield.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops every row with mismatched yields.',
      ),
    ],
  },
  {
    code: 'fixes.cropping.yield-zero',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-field',
    type: 'data-point',
    severity: 'warning',
    scope: 'cropping',
    title: 'Yield recorded as zero',
    messageTemplate: '{column} is recorded as 0 — confirm or supply a value.',
    uxCopy:
      'Yield is recorded as zero — confirm it really was a failed crop or correct the value.',
    trigger: 'Yield value is 0.',
    actions: [
      action('acknowledge', 'Skip', 'Keeps the row as-is.'),
      action(
        'edit-value',
        'Set a yield value',
        'Replaces the 0 with a number you supply.',
      ),
      action(
        'exclude',
        'Exclude affected rows',
        'Drops the affected cropping rows from the upload.',
      ),
    ],
  },
  {
    code: 'fixes.cropping.area-exceeds-field',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-field',
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
    actions: [
      action(
        'edit-value',
        'Cap at field area',
        'Replaces the crop area with the recorded field area.',
      ),
      action('acknowledge', 'Skip', 'Keeps the record as-is.'),
    ],
  },
  {
    code: 'fixes.cropping.duplicate',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-record',
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
    actions: [
      action(
        'exclude',
        'Drop the duplicate',
        'Removes the duplicate row, keeping one record under the shared key.',
      ),
      action(
        'merge',
        'Merge into one',
        'Combines the rows into a single cropping record under the shared key.',
      ),
    ],
  },
  {
    code: 'fixes.operations.duplicate',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-record',
    type: 'business',
    severity: 'warning',
    scope: 'operations',
    title: 'Duplicate operation record',
    messageTemplate: 'Duplicate operation on {field} · {date}.',
    uxCopy:
      'Two operations recorded with the same key — operations duplicates are accepted but flagged.',
    trigger: 'Operations rows share the same record key. Allowed with warning.',
    actions: [
      action('acknowledge', 'Skip', 'Keeps both rows as-is.'),
      action(
        'exclude',
        'Drop one',
        'Removes the duplicate row from the upload.',
      ),
    ],
  },
  {
    code: 'fixes.fertiliser.duplicate',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-record',
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
    actions: [
      action('acknowledge', 'Skip', 'Keeps both rows as-is.'),
      action(
        'exclude',
        'Drop one',
        'Removes the duplicate fertiliser row from the upload.',
      ),
    ],
  },
  {
    code: 'fixes.farm.duplicate-sandy-id',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-record',
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
    actions: [
      action(
        'merge',
        'Merge with the existing farm',
        'Folds incoming data into the existing Sandy farm record.',
      ),
      action(
        'edit-value',
        'Rename the incoming farm',
        'Inline edit the name so it imports as a new farm.',
      ),
      action(
        'exclude',
        'Exclude from upload',
        'Drops every record that references the duplicate farm.',
      ),
    ],
  },
  {
    code: 'fixes.operations.orphan',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-record',
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
      action(
        'map-values',
        'Attach to existing cropping',
        'Picks an existing cropping record for the operation to attach to.',
      ),
      action(
        'exclude',
        'Exclude operation',
        'Drops the orphaned operation from the upload.',
      ),
    ],
  },
  {
    code: 'fixes.operations.deletion-not-allowed',
    area: 'fixes',
    uxKind: 'fix',
    subcategory: 'cross-record',
    type: 'business',
    severity: 'blocking',
    scope: 'operations',
    title: 'Deletion is not allowed',
    messageTemplate: 'Deletion is not allowed for {entity}.',
    uxCopy:
      'Crop protection records cannot be deleted via upload. Remove the deletion from the file.',
    trigger: 'Action is set to DELETE for crop-protection records.',
    actions: [
      action(
        'remove-from-file',
        'Remove from file',
        'Edit the source file to remove the deletion and re-upload.',
      ),
      action(
        'contact-support',
        'Contact support',
        'Escalates to Sandy support to delete the record manually.',
      ),
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Ingest — file-level acceptance gates the user sees on the Add files step    */
/* -------------------------------------------------------------------------- */

const INGEST_ENTRIES: ValidationError[] = [
  {
    code: 'ingest.file.type-supported',
    area: 'ingest',
    uxKind: 'validation',
    type: 'structural',
    severity: 'blocking',
    scope: 'file',
    title: 'File type is PDF, CSV or Excel',
    messageTemplate:
      'File type {extension} is not supported. Upload a PDF, CSV or Excel file.',
    uxCopy:
      'Sandy only ingests PDF, CSV or Excel files. Convert or replace the upload to continue.',
    trigger:
      'Uploaded file is not one of .pdf, .csv, .xls or .xlsx (checked by extension and mime type).',
    example: 'A .docx file dragged onto the Add files step.',
    actions: [
      action(
        'remove-from-file',
        'Replace with a supported file',
        'Drop the rejected file and upload the same data as a PDF, CSV or Excel.',
      ),
      action(
        'exclude',
        'Skip this file',
        'Removes the unsupported file from the upload set.',
      ),
    ],
  },
  {
    code: 'ingest.file.template-match',
    area: 'ingest',
    uxKind: 'validation',
    type: 'structural',
    severity: 'warning',
    scope: 'file',
    title: 'File matches a known template',
    messageTemplate:
      "We couldn't match this file to any built-in or saved template.",
    uxCopy:
      "Sandy didn't recognise this file's layout against any built-in or custom template — confirm a template or save this layout as a new one.",
    trigger:
      'Recognition completes with kind `unrecognised` (no Sandy template, FMS export or saved custom template matched).',
    example: 'A bespoke agronomist export Sandy has never seen before.',
    actions: [
      action(
        'choose-alternative',
        'Attach to an existing template',
        'Pick a built-in or saved custom template the file actually matches.',
      ),
      action(
        'create-new',
        'Save layout as a new template',
        'Promote this file to a new custom template the user can reuse on future uploads.',
      ),
      action(
        'exclude',
        'Skip this file',
        'Removes the file from the upload set.',
      ),
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Completeness — optional fields surfaced as recommendations                  */
/* -------------------------------------------------------------------------- */

/**
 * Sandy can land the upload without these, but supplying them lifts the
 * completeness percentages used by downstream sustainability reports.
 *
 * Each entry corresponds to a leaf node in `COMPLETENESS_SUMMARY` (the
 * per-area roll-up rendered on the Completeness step) and lists the action
 * the user takes to opt in.
 */
const completenessEntry = (
  slug: string,
  scope: ValidationError['scope'],
  title: string,
  uxCopy: string,
  example?: string,
): ValidationError => ({
  code: `completeness.${slug}`,
  area: 'completeness',
  uxKind: 'recommendation',
  type: 'attribute',
  severity: 'warning',
  scope,
  title,
  messageTemplate: '',
  uxCopy,
  trigger:
    'The field is empty across some or all of the affected records and is not strictly required to land the upload.',
  example,
  actions: [
    action(
      'edit-value',
      'Supply the missing values',
      'Inline edit each affected record so the optional field is populated.',
    ),
    action(
      'acknowledge',
      'Skip for now',
      "Leave the field empty — Sandy falls back to its default assumption and the completeness score doesn't move.",
    ),
  ],
})

const COMPLETENESS_ENTRIES: ValidationError[] = [
  completenessEntry(
    'farms.address',
    'farm',
    'Farm address',
    'Add the postal address for each farm so Sandy can attribute results to the right region.',
    'Brookside Leys has no address recorded.',
  ),
  completenessEntry(
    'fields.boundary',
    'field',
    'Field boundary',
    'Upload or draw a boundary for each field so Sandy can compute real areas instead of relying on declared size.',
  ),
  completenessEntry(
    'cropping.previous-crop',
    'cropping',
    'Previous crop',
    'Record the previous crop on each field — used in carbon and nitrogen calculations.',
  ),
  completenessEntry(
    'operations.application-method',
    'operations',
    'Application method',
    'Record how each fertiliser or crop-protection product was applied (broadcast, banded, foliar, …).',
  ),
  completenessEntry(
    'inputs.fertiliser.composition',
    'fertiliser',
    'Manufactured fertiliser composition',
    "Supply N/P/K composition for any manufactured fertiliser product Sandy doesn't already know about.",
  ),
  completenessEntry(
    'inputs.crop-protection.active-ingredient',
    'fertiliser',
    'Crop protection active ingredient',
    "Record the active ingredient and concentration for any crop-protection product that isn't in the Sandy catalogue.",
  ),
  completenessEntry(
    'soil.sampling-date',
    'soil',
    'Soil sampling date',
    'Add the sampling date so Sandy can locate the result in the right season.',
  ),
]

/* -------------------------------------------------------------------------- */
/* Anomalies — outlier checks surfaced on the Anomalies step                   */
/* -------------------------------------------------------------------------- */

/**
 * Anomalies come in three flavours (see `src/pages/data-upload/anomalies.ts`):
 *
 *   - spot anomalies → `uxKind: 'fix'` (Sandy has a concrete correction).
 *   - trend anomalies → `uxKind: 'information'` (compare against prior years
 *     — no recommended fix, the user sanity-checks).
 *   - regional anomalies → `uxKind: 'information'` (compare against region).
 */

const spotAnomalyEntry = (
  slug: string,
  title: string,
  uxCopy: string,
  example: string,
): ValidationError => ({
  code: `anomalies.spot.${slug}`,
  area: 'anomalies',
  uxKind: 'fix',
  type: 'data-point',
  severity: 'warning',
  scope: 'general',
  title,
  messageTemplate: '',
  uxCopy,
  trigger:
    'A value differs from its neighbours by an order of magnitude — usually the signature of a decimal slip or unit mix-up.',
  example,
  actions: [
    action(
      'accept-suggestion',
      'Apply suggested change',
      "Replaces the cell with Sandy's suggested value.",
    ),
    action(
      'edit-value',
      'Edit value manually',
      'Inline edit the cell to the value the user picks.',
    ),
    action('acknowledge', 'Leave as-is', 'Keeps the unusual value untouched.'),
  ],
})

const comparisonAnomalyEntry = (
  slug: string,
  kind: 'trend' | 'regional',
  title: string,
  uxCopy: string,
  example: string,
): ValidationError => ({
  code: `anomalies.${kind}.${slug}`,
  area: 'anomalies',
  uxKind: 'information',
  type: 'business',
  severity: 'warning',
  scope: 'general',
  title,
  messageTemplate: '',
  uxCopy,
  trigger:
    kind === 'trend'
      ? "An aggregate value (yield, applied N, …) differs materially from the user's own prior years for the same field or crop."
      : 'An aggregate value differs materially from the regional benchmark Sandy holds for the same crop and season.',
  example,
  actions: [
    action(
      'acknowledge',
      'Mark as reviewed',
      'Confirms the user has sanity-checked the figure and is happy to proceed.',
    ),
    action(
      'edit-value',
      'Adjust the underlying records',
      'Opens the affected rows in an editable grid so the user can correct any input mistakes.',
    ),
  ],
})

const ANOMALY_ENTRIES: ValidationError[] = [
  spotAnomalyEntry(
    'decimal-slip',
    'A value looks 1,000× higher than its neighbours',
    'Sandy spotted a single value that reads as a thousand-fold spike against the rows around it — the typical signature of a missing decimal separator.',
    'A nitrogen application of 1000 kgN/ha next to neighbours at 1.0 kgN/ha.',
  ),
  spotAnomalyEntry(
    'unit-mixup',
    'A yield value looks like it was recorded in the wrong unit',
    'Sandy spotted a row whose order of magnitude matches a unit mismatch (kg/ha vs t/ha) against its neighbours.',
    'A winter wheat yield of 9,420 next to neighbours around 9.4 t/ha.',
  ),
  comparisonAnomalyEntry(
    'yield-vs-prior-year',
    'trend',
    'A field yield is well outside its prior-year range',
    "Sandy noticed an aggregate yield that is several times larger or smaller than the user's own historical range for the same field and crop.",
    'Saltway winter wheat reads as 48.6 t/ha against 9.3 t/ha last season.',
  ),
  comparisonAnomalyEntry(
    'fertiliser-vs-prior-year',
    'trend',
    'Fertiliser use is well below the rolling average',
    "Sandy noticed total seasonal applications that are a small fraction of the user's historical average for the same farm and crop.",
    'Spring nitrogen of 31 kgN/ha against a 5-year average of 175 kgN/ha.',
  ),
  comparisonAnomalyEntry(
    'yield-vs-region',
    'regional',
    'A reported yield is well below the regional average',
    'Sandy noticed an aggregate yield that sits materially below the regional benchmark for the same crop and season.',
    'Brookside Leys winter wheat 5.8 t/ha against an East of England average of 9.4 t/ha.',
  ),
]

/* -------------------------------------------------------------------------- */
/* Exported catalogue + lookup helpers                                         */
/* -------------------------------------------------------------------------- */

export const VALIDATION_ERRORS: ValidationError[] = [
  ...INGEST_ENTRIES,
  ...REFINEMENT_ENTRIES,
  ...FIXES_ENTRIES,
  ...COMPLETENESS_ENTRIES,
  ...ANOMALY_ENTRIES,
]

export const VALIDATION_BY_CODE: Record<string, ValidationError> =
  Object.fromEntries(VALIDATION_ERRORS.map((e) => [e.code, e]))
