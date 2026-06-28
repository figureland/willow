import type { Expression } from '../schema-transformation'

/* -------------------------------------------------------------------------- */
/* Canonical property spec for the Operations data-category schema panel       */
/* -------------------------------------------------------------------------- */

/**
 * One row per canonical property Sandy needs to find on an Operations
 * upload. Mirrors the catalogue entry
 * `refinement.operations.schema-transformation`. `defaultExpression` is
 * Sandy's pre-filled guess for this property in the demo workbook; when
 * `null`, the property is left blank so the user has to pick.
 */
export type SchemaPropertySpec = {
  property: string
  label: string
  required: boolean
  /** Friendly note shown next to the row (where it usually lives). */
  note: string
  defaultExpression: Expression | null
}

const col = (sheet: string, column: string): Expression => ({
  kind: 'column',
  sheet,
  column,
})

const join = (
  sourceSheet: string,
  sourceMatchColumn: string,
  lookupSheet: string,
  lookupMatchColumn: string,
  lookupReturnColumn: string,
): Expression => ({
  kind: 'join',
  sourceSheet,
  sourceMatchColumn,
  lookupSheet,
  lookupMatchColumn,
  lookupReturnColumn,
})

/**
 * Build the Operations property spec scoped to a specific source sheet
 * (PRD_Fertilizers or PRD_Chemicals). Joins reach into `Fields_Crops` for
 * lookups, mirroring the example prompt.
 *
 * One property (`cropVariety`) is deliberately left null so the user is
 * asked to pick it from the dropdowns — this exercises the "needs input"
 * branch of the UI.
 */
export const operationsPropertiesForSheet = (
  sourceSheet: string,
): SchemaPropertySpec[] => [
  {
    property: 'farmName',
    label: 'Farm name',
    required: true,
    note: 'In most exports the farm name lives on a related sheet and joins back via a field id.',
    defaultExpression: {
      kind: 'strip',
      chars: "['] ",
      inner: join(sourceSheet, 'field', 'Fields_Crops', 'field', 'intrafarm'),
    },
  },
  {
    property: 'fieldName',
    label: 'Field name',
    required: true,
    note: 'Usually a dedicated field-name column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'fieldName'),
  },
  {
    property: 'fieldSize',
    label: 'Field size',
    required: true,
    note: 'Usually a dedicated field-size column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'fieldSize'),
  },
  {
    property: 'cropName',
    label: 'Crop name',
    required: true,
    note: 'Often a numeric crop id on the operations sheet that joins to a master crops table for the human-readable name.',
    defaultExpression: join(
      sourceSheet,
      'crop',
      'Fields_Crops',
      'crop',
      'commodityName',
    ),
  },
  {
    property: 'cropVariety',
    label: 'Crop variety',
    required: true,
    note: 'Often a numeric variety id on the operations sheet that joins to a master varieties table.',
    // Deliberately left blank — user must pick.
    defaultExpression: null,
  },
  {
    property: 'cropId',
    label: 'Crop ID',
    required: true,
    note: 'Usually not provided directly; derived by prefixing the source crop id, e.g. "ID-123".',
    defaultExpression: col(sourceSheet, 'crop'),
  },
  {
    property: 'cropType',
    label: 'Crop type',
    required: true,
    note: 'Often derived from a boolean cover-crop column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'coverCrop'),
  },
  {
    property: 'workingArea',
    label: 'Working area',
    required: true,
    note: 'Usually a dedicated working-area column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'cropSize'),
  },
  {
    property: 'harvestYear',
    label: 'Harvest year',
    required: true,
    note: 'Usually a dedicated harvest-year column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'cropYear'),
  },
  {
    property: 'operationDate',
    label: 'Operation date',
    required: true,
    note: 'Usually a dedicated activity-date column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'activity_date'),
  },
  {
    property: 'appliedArea',
    label: 'Applied area',
    required: true,
    note: 'Usually a dedicated applied-area column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'w_ha'),
  },
  {
    property: 'operationGroup',
    label: 'Operation group',
    required: true,
    note: 'Often inferred from the source sheet (one sheet per group) rather than a column.',
    defaultExpression: {
      kind: 'constant',
      value:
        sourceSheet === 'PRD_Fertilizers' ? 'Nutrition' : 'Crop Protection',
    },
  },
  {
    property: 'operationType',
    label: 'Operation type',
    required: true,
    note: 'Usually a dedicated activity column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'prodActivity'),
  },
  {
    property: 'productName',
    label: 'Product name',
    required: true,
    note: 'Usually a dedicated product column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'prodName'),
  },
  {
    property: 'quantity',
    label: 'Quantity',
    required: true,
    note: 'Usually a dedicated dose column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'dose'),
  },
  {
    property: 'unit',
    label: 'Unit',
    required: true,
    note: 'Usually a dedicated dose-unit column on the operations sheet.',
    defaultExpression: col(sourceSheet, 'doseUnit'),
  },
]
