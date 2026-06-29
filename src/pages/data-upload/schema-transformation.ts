/* -------------------------------------------------------------------------- */
/* Schema transformation — model + fixture                                     */
/* -------------------------------------------------------------------------- */

/**
 * The schema-transformation issue surfaces when Sandy can't directly map a
 * file's columns onto the canonical schema. The resolver lets the user
 * compose a small visual rule program — per canonical field, what column /
 * lookup / constant fills it — modelled on the example prompt in
 * `data-category-operations.md`.
 *
 * The full programming environment is large; this fixture covers the v1
 * primitives needed to demo the experience:
 *   - Column           — pick a column from the active sheet
 *   - Join             — match against another sheet to look up a value
 *   - Constant         — literal value
 *   - Strip            — strip characters from a string
 * The dispatcher renders one canonical field at a time inside the modal.
 */

/* -------------------------------------------------------------------------- */
/* Mock workbook fixture                                                       */
/* -------------------------------------------------------------------------- */

export type SheetColumn = {
  /** Header label — what shows up in the file's header row. */
  name: string
  /** Free-text "Numbers / Text / Codes / Date" hint surfaced in the picker. */
  kind: 'text' | 'number' | 'date' | 'code' | 'boolean'
}

export type SheetRow = Record<string, string>

export type Sheet = {
  /** Sheet/tab name. */
  name: string
  columns: SheetColumn[]
  /** A handful of sample rows used by the snippet preview. Kept short on
   *  purpose — the preview fades after 5 rows. */
  sampleRows: SheetRow[]
}

export type Workbook = {
  /** Filename (matches an UploadedFile.name when surfaced as an issue). */
  filename: string
  sheets: Sheet[]
}

/* -------------------------------------------------------------------------- */
/* Sample-row helpers                                                          */
/* -------------------------------------------------------------------------- */

// Field ids that bridge the Fertilizers / Chemicals sheets to Fields_Crops —
// the same ids appear in all three sheets so join lookups resolve cleanly.
const SAMPLE_FIELD_IDS = [
  'F-1024',
  'F-1031',
  'F-1042',
  'F-1055',
  'F-1062',
  'F-1078',
  'F-1084',
  'F-1091',
]

const SAMPLE_FIELD_NAMES = [
  'Long Bottom',
  'Top East',
  'Stone Pightle',
  'Saltway',
  'Millpond',
  'Orchard Fold',
  "Cobbett's Hollow",
  'Mill Lane',
]

const FARM_NAMES = [
  "['Brookside Leys']",
  "['Brookside Leys']",
  "['Foxglove Hill']",
  "['Foxglove Hill']",
  "['Amber Harvest Farm']",
  "['Amber Harvest Farm']",
  "['Heron Lea']",
  "['Heron Lea']",
]

const CROP_CODES = ['341', '341', '120', '120', '212', '212', '198', '198']
const VARIETY_CODES = ['8', '8', '17', '17', '21', '21', '4', '4']
const COMMODITY_NAMES = [
  'Winter wheat',
  'Winter wheat',
  'Oilseed rape',
  'Oilseed rape',
  'Spring barley',
  'Spring barley',
  'Sugar beet',
  'Sugar beet',
]
const VARIETY_NAMES = [
  'Skyfall',
  'Skyfall',
  'Aurelia',
  'Aurelia',
  'Laureate',
  'Laureate',
  'Maverick',
  'Maverick',
]

/** Used as the prodActivity short codes farmers tend to type — wired into
 *  the value-mapping issue so the demo has real synonyms to resolve. */
const FERT_OPERATIONS = ['WW', 'OSR', 'SB', 'SB', 'WW', 'OSR', 'SB', 'WW']
const CHEM_OPERATIONS = [
  'Spray',
  'Spray',
  'Drench',
  'Spray',
  'Spray',
  'Drench',
  'Spray',
  'Spray',
]

const fertilizerRows: SheetRow[] = SAMPLE_FIELD_IDS.map((id, i) => ({
  field: id,
  fieldName: SAMPLE_FIELD_NAMES[i],
  fieldSize: (5 + i * 2.4).toFixed(1),
  crop: CROP_CODES[i],
  variety: VARIETY_CODES[i],
  coverCrop: i % 4 === 3 ? 'TRUE' : 'FALSE',
  cropSize: (4.2 + i * 1.8).toFixed(1),
  cropYear: '2026',
  activity_date: `2026-03-${(10 + i).toString().padStart(2, '0')}`,
  w_ha: (180 + i * 4).toString(),
  prodActivity: FERT_OPERATIONS[i],
  prodName: [
    'Nitram',
    'Nitram',
    'Yara Mila',
    'DAP 18-46',
    'CAN 27',
    'Nitram',
    'Yara Mila',
    'DAP 18-46',
  ][i],
  dose: (180 + i * 12).toString(),
  doseUnit: 'kg/ha',
  done: i === 2 ? 'FALSE' : 'TRUE',
}))

const chemicalRows: SheetRow[] = SAMPLE_FIELD_IDS.map((id, i) => ({
  field: id,
  fieldName: SAMPLE_FIELD_NAMES[i],
  fieldSize: (5 + i * 2.4).toFixed(1),
  crop: CROP_CODES[i],
  variety: VARIETY_CODES[i],
  coverCrop: i % 4 === 3 ? 'TRUE' : 'FALSE',
  cropSize: (4.2 + i * 1.8).toFixed(1),
  cropYear: '2026',
  activity_date: `2026-04-${(2 + i).toString().padStart(2, '0')}`,
  w_ha: (180 + i * 4).toString(),
  prodActivity: CHEM_OPERATIONS[i],
  prodName: [
    'Roundup Flex',
    'Atlantis Star',
    'Aviator Xpro',
    'Karate Zeon',
    'Roundup Flex',
    'Atlantis Star',
    'Aviator Xpro',
    'Karate Zeon',
  ][i],
  dose: (1.5 + i * 0.1).toFixed(1),
  doseUnit: 'L/ha',
  done: i === 5 ? 'FALSE' : 'TRUE',
}))

const fieldsCropsRows: SheetRow[] = SAMPLE_FIELD_IDS.map((id, i) => ({
  field: id,
  intrafarm: FARM_NAMES[i],
  commodityName: COMMODITY_NAMES[i],
  varietyName: VARIETY_NAMES[i],
  crop: CROP_CODES[i],
  variety: VARIETY_CODES[i],
}))

/** One reusable fixture roughly matching the example prompt. */
export const EXAMPLE_WORKBOOK: Workbook = {
  filename: 'xfarm-operations-export.xlsx',
  sheets: [
    {
      name: 'PRD_Fertilizers',
      columns: [
        { name: 'field', kind: 'code' },
        { name: 'fieldName', kind: 'text' },
        { name: 'fieldSize', kind: 'number' },
        { name: 'crop', kind: 'code' },
        { name: 'variety', kind: 'code' },
        { name: 'coverCrop', kind: 'boolean' },
        { name: 'cropSize', kind: 'number' },
        { name: 'cropYear', kind: 'number' },
        { name: 'activity_date', kind: 'date' },
        { name: 'w_ha', kind: 'number' },
        { name: 'prodActivity', kind: 'text' },
        { name: 'prodName', kind: 'text' },
        { name: 'dose', kind: 'number' },
        { name: 'doseUnit', kind: 'text' },
        { name: 'done', kind: 'boolean' },
      ],
      sampleRows: fertilizerRows,
    },
    {
      name: 'PRD_Chemicals',
      columns: [
        { name: 'field', kind: 'code' },
        { name: 'fieldName', kind: 'text' },
        { name: 'fieldSize', kind: 'number' },
        { name: 'crop', kind: 'code' },
        { name: 'variety', kind: 'code' },
        { name: 'coverCrop', kind: 'boolean' },
        { name: 'cropSize', kind: 'number' },
        { name: 'cropYear', kind: 'number' },
        { name: 'activity_date', kind: 'date' },
        { name: 'w_ha', kind: 'number' },
        { name: 'prodActivity', kind: 'text' },
        { name: 'prodName', kind: 'text' },
        { name: 'dose', kind: 'number' },
        { name: 'doseUnit', kind: 'text' },
        { name: 'done', kind: 'boolean' },
      ],
      sampleRows: chemicalRows,
    },
    {
      name: 'Fields_Crops',
      columns: [
        { name: 'field', kind: 'code' },
        { name: 'intrafarm', kind: 'text' },
        { name: 'commodityName', kind: 'text' },
        { name: 'varietyName', kind: 'text' },
        { name: 'crop', kind: 'code' },
        { name: 'variety', kind: 'code' },
      ],
      sampleRows: fieldsCropsRows,
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Canonical schema — what we're mapping into                                  */
/* -------------------------------------------------------------------------- */

export type CanonicalField = {
  id: string
  label: string
}

/**
 * Trimmed list keyed off the example prompt. Farm name + field name are
 * intentionally omitted — they're resolved upstream by the farm-missing /
 * field-missing issues, so asking again here would be redundant.
 */
export const OPERATION_CANONICAL_FIELDS: CanonicalField[] = [
  { id: 'cropName', label: 'crop name' },
  { id: 'cropType', label: 'crop type' },
  { id: 'workingArea', label: 'working area' },
  { id: 'operationGroup', label: 'operation group' },
  { id: 'operationType', label: 'operation type' },
  { id: 'productName', label: 'product name' },
  { id: 'quantity', label: 'quantity' },
  { id: 'unit', label: 'unit' },
]

/* -------------------------------------------------------------------------- */
/* Expression model                                                            */
/* -------------------------------------------------------------------------- */

export type Expression =
  /** Unfilled — renders as a "Pick…" placeholder pill. */
  | { kind: 'empty' }
  /** Constant literal. */
  | { kind: 'constant'; value: string }
  /** Read a value from a column of the active sheet. */
  | { kind: 'column'; sheet: string; column: string }
  /**
   * Look up a value in another sheet by matching keys.
   *   source.sheet.matchColumn === lookup.sheet.matchColumn
   * Return the corresponding lookup.returnColumn for that row.
   */
  | {
      kind: 'join'
      /** Sheet we're driving from (usually the active sheet). */
      sourceSheet: string
      sourceMatchColumn: string
      /** Sheet we're looking up into. */
      lookupSheet: string
      lookupMatchColumn: string
      lookupReturnColumn: string
    }
  /** Wrap another expression and strip the given characters. */
  | { kind: 'strip'; chars: string; inner: Expression }

/* -------------------------------------------------------------------------- */
/* Resolution shape                                                            */
/* -------------------------------------------------------------------------- */

export type SchemaRuleProgram = {
  /** Active sheet the rules apply to. */
  sheetName: string
  /** Per-canonical-field expression. */
  rules: Record<string, Expression>
  /**
   * Where the program came from — drives the review-panel title so the user
   * can tell "Sandy's AI proposal" apart from "your manual mapping".
   * Optional for backwards compatibility with already-committed states.
   */
  source?: 'ai' | 'manual'
}

/** Empty starter program for a given sheet. */
export const emptyProgramForSheet = (sheetName: string): SchemaRuleProgram => ({
  sheetName,
  rules: {},
})

/* -------------------------------------------------------------------------- */
/* Smart auto-suggestion                                                       */
/* -------------------------------------------------------------------------- */

const normalise = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Pick the column whose name most resembles the canonical field id/label.
 *  Used to seed the rule program so obvious 1:1 column maps appear pre-filled. */
const suggestColumnForField = (
  field: CanonicalField,
  sheet: Sheet,
): string | undefined => {
  const targets = [normalise(field.id), normalise(field.label)]
  for (const col of sheet.columns) {
    const n = normalise(col.name)
    if (targets.some((t) => n === t)) return col.name
  }
  for (const col of sheet.columns) {
    const n = normalise(col.name)
    if (targets.some((t) => n.includes(t) || t.includes(n))) return col.name
  }
  return undefined
}

/**
 * Build a starter program with column-rules pre-filled wherever there's an
 * obvious 1:1 between a canonical field and a column on the sheet. The
 * editor still lets the user override every rule — this is just a "we
 * already guessed half of these for you" head start.
 */
export const suggestedProgramForSheet = (
  sheetName: string,
  fields: CanonicalField[] = OPERATION_CANONICAL_FIELDS,
): SchemaRuleProgram => {
  const sheet = EXAMPLE_WORKBOOK.sheets.find((s) => s.name === sheetName)
  if (!sheet) return emptyProgramForSheet(sheetName)
  const rules: Record<string, Expression> = {}
  for (const field of fields) {
    const column = suggestColumnForField(field, sheet)
    if (column) rules[field.id] = { kind: 'column', sheet: sheet.name, column }
  }
  return { sheetName, rules }
}

/* -------------------------------------------------------------------------- */
/* Plain-English rendering — used by the modal's "View as text" toggle        */
/* -------------------------------------------------------------------------- */

export const describeExpression = (expr: Expression): string => {
  switch (expr.kind) {
    case 'empty':
      return '(not set yet)'
    case 'constant':
      return `the value "${expr.value}"`
    case 'column':
      return `the "${expr.column}" column on ${expr.sheet}`
    case 'join':
      return `the "${expr.lookupReturnColumn}" column on ${expr.lookupSheet}, matched by ${expr.sourceMatchColumn} = ${expr.lookupMatchColumn}`
    case 'strip':
      return `${describeExpression(expr.inner)}, with "${expr.chars}" stripped out`
  }
}

/**
 * Compute which sheet+column pairs are visually referenced by an expression
 * — used by the snippet to highlight cells the active rule touches. The
 * "role" hints the highlighter which tint to apply (source vs lookup-return).
 */
export type HighlightRef = {
  sheet: string
  column: string
  role: 'source' | 'lookup-return'
}

export const referencedColumns = (expr: Expression): HighlightRef[] => {
  switch (expr.kind) {
    case 'empty':
    case 'constant':
      return []
    case 'column':
      return [{ sheet: expr.sheet, column: expr.column, role: 'source' }]
    case 'join':
      return (
        [
          {
            sheet: expr.sourceSheet,
            column: expr.sourceMatchColumn,
            role: 'source',
          },
          {
            sheet: expr.lookupSheet,
            column: expr.lookupMatchColumn,
            role: 'source',
          },
          {
            sheet: expr.lookupSheet,
            column: expr.lookupReturnColumn,
            role: 'lookup-return',
          },
        ] satisfies HighlightRef[]
      ).filter((r) => r.column)
    case 'strip':
      return referencedColumns(expr.inner)
  }
}

/**
 * Resolve an expression against a single sample row from a workbook. Used to
 * show a "resolves to X" preview alongside the snippet. Returns null when
 * the expression can't be resolved (e.g. unfilled, or a join with no match).
 */
export const resolveExpression = (
  expr: Expression,
  row: SheetRow,
  workbook: Workbook,
): string | null => {
  switch (expr.kind) {
    case 'empty':
      return null
    case 'constant':
      return expr.value || null
    case 'column':
      return row[expr.column] ?? null
    case 'join': {
      const sourceValue = row[expr.sourceMatchColumn]
      if (sourceValue === undefined) return null
      const lookupSheet = workbook.sheets.find(
        (s) => s.name === expr.lookupSheet,
      )
      if (!lookupSheet) return null
      const match = lookupSheet.sampleRows.find(
        (r) => r[expr.lookupMatchColumn] === sourceValue,
      )
      return match?.[expr.lookupReturnColumn] ?? null
    }
    case 'strip': {
      const inner = resolveExpression(expr.inner, row, workbook)
      if (inner == null) return null
      const stripChars = new Set(expr.chars.split(''))
      return inner
        .split('')
        .filter((c) => !stripChars.has(c))
        .join('')
    }
  }
}

export const describeProgram = (
  program: SchemaRuleProgram,
  fields: CanonicalField[],
): string => {
  const lines: string[] = [`Source sheet: ${program.sheetName}`, '']
  for (const f of fields) {
    const expr = program.rules[f.id] ?? { kind: 'empty' as const }
    lines.push(`- ${f.label}: ${describeExpression(expr)}`)
  }
  return lines.join('\n')
}
