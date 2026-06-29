import { EXAMPLE_WORKBOOK, type Expression } from '../schema-transformation'

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

/* -------------------------------------------------------------------------- */
/* "Found vs missing" classification — drives the Describe + Map UIs          */
/* -------------------------------------------------------------------------- */

export type PropertyPresence = 'found' | 'missing'

export type PropertyStatus = {
  property: string
  label: string
  presence: PropertyPresence
  /** Sheet the value was found on, if any. */
  sheet?: string
  /** Column name on that sheet, if any. */
  column?: string
}

/**
 * Decide whether each expected property can be sourced from the supplied
 * sheet directly. A property counts as `found` when its default expression
 * resolves to a column that actually exists on either the operations sheet
 * or the lookup sheet referenced by a join. Everything else lands as
 * `missing` so the Describe + Map UIs can highlight the gaps to the user.
 *
 * This is intentionally heuristic — the goal is to surface a realistic
 * mixture of "we found it" / "you need to tell us" for the demo.
 */
export const buildPropertyStatuses = (
  sourceSheet: string,
): PropertyStatus[] => {
  const props = operationsPropertiesForSheet(sourceSheet)
  const knownColumnsBySheet = new Map<string, Set<string>>()
  for (const sheet of EXAMPLE_WORKBOOK.sheets) {
    knownColumnsBySheet.set(
      sheet.name,
      new Set(sheet.columns.map((c) => c.name)),
    )
  }
  const has = (sheet: string, column: string) =>
    knownColumnsBySheet.get(sheet)?.has(column) ?? false

  // Properties Sandy intentionally leaves blank are forced into "missing" —
  // and a few common ones masquerade as missing so the demo always shows a
  // believable mix. Source-of-truth for the demo, not the production system.
  const forcedMissing = new Set([
    'cropVariety',
    'cropId',
    'cropType',
    'fieldSize',
  ])

  return props.map<PropertyStatus>((p) => {
    if (forcedMissing.has(p.property)) {
      return { property: p.property, label: p.label, presence: 'missing' }
    }
    const expr = p.defaultExpression
    if (!expr) {
      return { property: p.property, label: p.label, presence: 'missing' }
    }
    if (expr.kind === 'column' && has(expr.sheet, expr.column)) {
      return {
        property: p.property,
        label: p.label,
        presence: 'found',
        sheet: expr.sheet,
        column: expr.column,
      }
    }
    if (
      expr.kind === 'join' &&
      has(expr.sourceSheet, expr.sourceMatchColumn) &&
      has(expr.lookupSheet, expr.lookupReturnColumn)
    ) {
      return {
        property: p.property,
        label: p.label,
        presence: 'found',
        sheet: expr.lookupSheet,
        column: expr.lookupReturnColumn,
      }
    }
    if (expr.kind === 'constant') {
      return { property: p.property, label: p.label, presence: 'found' }
    }
    return { property: p.property, label: p.label, presence: 'missing' }
  })
}
