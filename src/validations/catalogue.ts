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
/* Exported catalogue + lookup helpers                                         */
/* -------------------------------------------------------------------------- */

export const VALIDATION_ERRORS: ValidationError[] = [
  ...REFINEMENT_ENTRIES,
  ...FIXES_ENTRIES,
]

export const VALIDATION_BY_CODE: Record<string, ValidationError> =
  Object.fromEntries(VALIDATION_ERRORS.map((e) => [e.code, e]))
