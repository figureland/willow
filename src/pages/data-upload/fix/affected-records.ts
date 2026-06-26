/* -------------------------------------------------------------------------- */
/* Affected-records fixtures                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Per-issue affected-record snapshots. Each issue carries a `before` table
 * (current data, with the problem) and an `after` table (what Sandy would
 * write if the suggestion is accepted). The modal renders both side-by-side
 * and lets the user exclude individual rows from the fix.
 *
 * Both tables share the same column set so headers align; columns are picked
 * to surface the field driving the issue (working area, dates, yields, …).
 */

export type Cell = string | number | null

export type AffectedColumn = {
  key: string
  label: string
  /** Right-align numeric columns. */
  numeric?: boolean
}

export type AffectedRow = {
  id: string
  /** Cells keyed by column.key. */
  cells: Record<string, Cell>
  /** Optional list of column keys that should be highlighted as "the field
   *  that's wrong" / "the field that's changing". */
  highlight?: string[]
}

export type AffectedRecords = {
  columns: AffectedColumn[]
  /** Rows in their current (problematic) state. */
  before: AffectedRow[]
  /** Rows after the suggested fix is applied. Row ids match `before` so the
   *  exclude-toggle can map between snapshots. */
  after: AffectedRow[]
}

/* -------------------------------------------------------------------------- */
/* Column presets — most issues live in one of three table types               */
/* -------------------------------------------------------------------------- */

const CROPPING_COLS: AffectedColumn[] = [
  { key: 'field', label: 'Field' },
  { key: 'crop', label: 'Crop' },
  { key: 'year', label: 'Year', numeric: true },
  { key: 'workingArea', label: 'Working area (ha)', numeric: true },
  { key: 'yield', label: 'Yield (t/ha)', numeric: true },
  { key: 'plantingDate', label: 'Planting date' },
  { key: 'harvestDate', label: 'Harvest date' },
]

const OPERATION_COLS: AffectedColumn[] = [
  { key: 'field', label: 'Field' },
  { key: 'year', label: 'Year', numeric: true },
  { key: 'group', label: 'Group' },
  { key: 'product', label: 'Product' },
  { key: 'quantity', label: 'Quantity', numeric: true },
  { key: 'unit', label: 'Unit' },
  { key: 'date', label: 'Date' },
]

const SOIL_COLS: AffectedColumn[] = [
  { key: 'field', label: 'Field' },
  { key: 'date', label: 'Test date' },
  { key: 'depth', label: 'Depth (cm)', numeric: true },
  { key: 'ph', label: 'pH', numeric: true },
  { key: 'soc', label: 'SOC (%)', numeric: true },
]

/* -------------------------------------------------------------------------- */
/* Affected-record map — keyed by issue id (matches EXAMPLES in FixIssuesPage)*/
/* -------------------------------------------------------------------------- */

export const AFFECTED_RECORDS: Record<string, AffectedRecords> = {
  'ex-required-missing': {
    columns: CROPPING_COLS,
    before: [
      {
        id: 'crop-4',
        cells: {
          field: 'Millpond',
          crop: 'Winter wheat',
          year: 2024,
          workingArea: null,
          yield: 8.2,
          plantingDate: '2023-10-04',
          harvestDate: '2024-08-12',
        },
        highlight: ['workingArea'],
      },
      {
        id: 'crop-11',
        cells: {
          field: 'Orchard Fold',
          crop: 'Spring barley',
          year: 2024,
          workingArea: null,
          yield: 6.4,
          plantingDate: '2024-03-12',
          harvestDate: '2024-08-20',
        },
        highlight: ['workingArea'],
      },
      {
        id: 'crop-18',
        cells: {
          field: 'Saltway',
          crop: 'Winter oilseed rape',
          year: 2024,
          workingArea: null,
          yield: 3.9,
          plantingDate: '2023-08-21',
          harvestDate: '2024-07-29',
        },
        highlight: ['workingArea'],
      },
      {
        id: 'crop-22',
        cells: {
          field: 'Long Acre',
          crop: 'Sugar beet',
          year: 2024,
          workingArea: null,
          yield: 64.1,
          plantingDate: '2024-04-02',
          harvestDate: '2024-10-15',
        },
        highlight: ['workingArea'],
      },
    ],
    after: [
      {
        id: 'crop-4',
        cells: {
          field: 'Millpond',
          crop: 'Winter wheat',
          year: 2024,
          workingArea: 12.4,
          yield: 8.2,
          plantingDate: '2023-10-04',
          harvestDate: '2024-08-12',
        },
        highlight: ['workingArea'],
      },
      {
        id: 'crop-11',
        cells: {
          field: 'Orchard Fold',
          crop: 'Spring barley',
          year: 2024,
          workingArea: 9.1,
          yield: 6.4,
          plantingDate: '2024-03-12',
          harvestDate: '2024-08-20',
        },
        highlight: ['workingArea'],
      },
      {
        id: 'crop-18',
        cells: {
          field: 'Saltway',
          crop: 'Winter oilseed rape',
          year: 2024,
          workingArea: 14.7,
          yield: 3.9,
          plantingDate: '2023-08-21',
          harvestDate: '2024-07-29',
        },
        highlight: ['workingArea'],
      },
      {
        id: 'crop-22',
        cells: {
          field: 'Long Acre',
          crop: 'Sugar beet',
          year: 2024,
          workingArea: 22.5,
          yield: 64.1,
          plantingDate: '2024-04-02',
          harvestDate: '2024-10-15',
        },
        highlight: ['workingArea'],
      },
    ],
  },

  'ex-max-length': {
    columns: [
      { key: 'field', label: 'Field' },
      { key: 'crop', label: 'Crop' },
      { key: 'variety', label: 'Variety' },
    ],
    before: [
      {
        id: 'crop-8',
        cells: {
          field: 'Saltway',
          crop: 'Maize',
          variety:
            'Hereford Single Cross Late Variety Long Name with Extra Marketing Suffix',
        },
        highlight: ['variety'],
      },
    ],
    after: [
      {
        id: 'crop-8',
        cells: {
          field: 'Saltway',
          crop: 'Maize',
          variety: 'Hereford Single Cross Late Variety Long Name',
        },
        highlight: ['variety'],
      },
    ],
  },

  'ex-year-invalid': {
    columns: OPERATION_COLS,
    before: [
      {
        id: 'op-12',
        cells: {
          field: 'Long Acre',
          year: 20245,
          group: 'Nutrition',
          product: 'Nitram',
          quantity: 180,
          unit: 'kg/ha',
          date: '2024-04-12',
        },
        highlight: ['year'],
      },
    ],
    after: [
      {
        id: 'op-12',
        cells: {
          field: 'Long Acre',
          year: 2024,
          group: 'Nutrition',
          product: 'Nitram',
          quantity: 180,
          unit: 'kg/ha',
          date: '2024-04-12',
        },
        highlight: ['year'],
      },
    ],
  },

  'ex-date-invalid': {
    columns: CROPPING_COLS,
    before: [
      {
        id: 'crop-7',
        cells: {
          field: 'Stone Pightle',
          crop: 'Winter wheat',
          year: 2024,
          workingArea: 18.2,
          yield: 7.8,
          plantingDate: '2024-02-31',
          harvestDate: '2024-08-14',
        },
        highlight: ['plantingDate'],
      },
    ],
    after: [
      {
        id: 'crop-7',
        cells: {
          field: 'Stone Pightle',
          crop: 'Winter wheat',
          year: 2024,
          workingArea: 18.2,
          yield: 7.8,
          plantingDate: '2024-02-28',
          harvestDate: '2024-08-14',
        },
        highlight: ['plantingDate'],
      },
    ],
  },

  'ex-positive-int': {
    columns: SOIL_COLS,
    before: [
      {
        id: 'soil-3',
        cells: {
          field: 'Mill Lane',
          date: '2024-03-09',
          depth: -15,
          ph: 6.8,
          soc: 2.4,
        },
        highlight: ['depth'],
      },
    ],
    after: [
      {
        id: 'soil-3',
        cells: {
          field: 'Mill Lane',
          date: '2024-03-09',
          depth: 15,
          ph: 6.8,
          soc: 2.4,
        },
        highlight: ['depth'],
      },
    ],
  },

  'ex-decimal-range': {
    columns: SOIL_COLS,
    before: [
      {
        id: 'soil-9',
        cells: {
          field: 'Hayrick',
          date: '2024-05-22',
          depth: 30,
          ph: 12.4,
          soc: 3.1,
        },
        highlight: ['ph'],
      },
    ],
    after: [
      {
        id: 'soil-9',
        cells: {
          field: 'Hayrick',
          date: '2024-05-22',
          depth: 30,
          ph: null,
          soc: 3.1,
        },
        highlight: ['ph'],
      },
    ],
  },

  'ex-crop-type-unknown': {
    columns: [
      { key: 'field', label: 'Field' },
      { key: 'sourceCrop', label: 'Source crop type' },
      { key: 'mappedCrop', label: 'Sandy crop type' },
      { key: 'year', label: 'Year', numeric: true },
    ],
    before: [
      {
        id: 'crop-2',
        cells: {
          field: 'Top Meadow',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: null,
          year: 2024,
        },
        highlight: ['sourceCrop', 'mappedCrop'],
      },
      {
        id: 'crop-5',
        cells: {
          field: 'Marlpit',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: null,
          year: 2024,
        },
        highlight: ['sourceCrop', 'mappedCrop'],
      },
      {
        id: 'crop-9',
        cells: {
          field: 'Spinney',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: null,
          year: 2024,
        },
        highlight: ['sourceCrop', 'mappedCrop'],
      },
      {
        id: 'crop-13',
        cells: {
          field: 'River Bend',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: null,
          year: 2025,
        },
        highlight: ['sourceCrop', 'mappedCrop'],
      },
      {
        id: 'crop-17',
        cells: {
          field: 'South Ridge',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: null,
          year: 2025,
        },
        highlight: ['sourceCrop', 'mappedCrop'],
      },
      {
        id: 'crop-21',
        cells: {
          field: 'Old Barn Field',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: null,
          year: 2025,
        },
        highlight: ['sourceCrop', 'mappedCrop'],
      },
    ],
    after: [
      {
        id: 'crop-2',
        cells: {
          field: 'Top Meadow',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: 'Winter oilseed rape',
          year: 2024,
        },
        highlight: ['mappedCrop'],
      },
      {
        id: 'crop-5',
        cells: {
          field: 'Marlpit',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: 'Winter oilseed rape',
          year: 2024,
        },
        highlight: ['mappedCrop'],
      },
      {
        id: 'crop-9',
        cells: {
          field: 'Spinney',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: 'Winter oilseed rape',
          year: 2024,
        },
        highlight: ['mappedCrop'],
      },
      {
        id: 'crop-13',
        cells: {
          field: 'River Bend',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: 'Winter oilseed rape',
          year: 2025,
        },
        highlight: ['mappedCrop'],
      },
      {
        id: 'crop-17',
        cells: {
          field: 'South Ridge',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: 'Winter oilseed rape',
          year: 2025,
        },
        highlight: ['mappedCrop'],
      },
      {
        id: 'crop-21',
        cells: {
          field: 'Old Barn Field',
          sourceCrop: 'Winter rapeseed',
          mappedCrop: 'Winter oilseed rape',
          year: 2025,
        },
        highlight: ['mappedCrop'],
      },
    ],
  },

  'ex-planting-after-harvest': {
    columns: CROPPING_COLS,
    before: [
      {
        id: 'crop-15',
        cells: {
          field: 'Top Meadow',
          crop: 'Spring barley',
          year: 2024,
          workingArea: 11.3,
          yield: 6.1,
          plantingDate: '2024-10-12',
          harvestDate: '2024-08-21',
        },
        highlight: ['plantingDate', 'harvestDate'],
      },
    ],
    after: [
      {
        id: 'crop-15',
        cells: {
          field: 'Top Meadow',
          crop: 'Spring barley',
          year: 2024,
          workingArea: 11.3,
          yield: 6.1,
          plantingDate: '2024-08-21',
          harvestDate: '2024-10-12',
        },
        highlight: ['plantingDate', 'harvestDate'],
      },
    ],
  },

  'ex-harvest-gt-total': {
    columns: [
      { key: 'field', label: 'Field' },
      { key: 'crop', label: 'Crop' },
      { key: 'year', label: 'Year', numeric: true },
      { key: 'totalYield', label: 'Total yield (t)', numeric: true },
      { key: 'harvestYield', label: 'Harvest yield (t)', numeric: true },
    ],
    before: [
      {
        id: 'crop-4',
        cells: {
          field: 'Spinney',
          crop: 'Winter wheat',
          year: 2024,
          totalYield: 22.0,
          harvestYield: 24.1,
        },
        highlight: ['harvestYield'],
      },
    ],
    after: [
      {
        id: 'crop-4',
        cells: {
          field: 'Spinney',
          crop: 'Winter wheat',
          year: 2024,
          totalYield: 22.0,
          harvestYield: 22.0,
        },
        highlight: ['harvestYield'],
      },
    ],
  },

  'ex-yield-zero': {
    columns: CROPPING_COLS,
    before: [
      {
        id: 'crop-3',
        cells: {
          field: 'Foxglove North',
          crop: 'Maize',
          year: 2024,
          workingArea: 14.8,
          yield: 0,
          plantingDate: '2024-04-12',
          harvestDate: '2024-10-04',
        },
        highlight: ['yield'],
      },
      {
        id: 'crop-12',
        cells: {
          field: 'Foxglove South',
          crop: 'Maize',
          year: 2024,
          workingArea: 9.2,
          yield: 0,
          plantingDate: '2024-04-14',
          harvestDate: '2024-10-04',
        },
        highlight: ['yield'],
      },
      {
        id: 'crop-20',
        cells: {
          field: 'Foxglove East',
          crop: 'Sugar beet',
          year: 2024,
          workingArea: 6.5,
          yield: 0,
          plantingDate: '2024-04-22',
          harvestDate: '2024-11-02',
        },
        highlight: ['yield'],
      },
    ],
    after: [
      {
        id: 'crop-3',
        cells: {
          field: 'Foxglove North',
          crop: 'Maize',
          year: 2024,
          workingArea: 14.8,
          yield: 0,
          plantingDate: '2024-04-12',
          harvestDate: '2024-10-04',
        },
        highlight: ['yield'],
      },
      {
        id: 'crop-12',
        cells: {
          field: 'Foxglove South',
          crop: 'Maize',
          year: 2024,
          workingArea: 9.2,
          yield: 0,
          plantingDate: '2024-04-14',
          harvestDate: '2024-10-04',
        },
        highlight: ['yield'],
      },
      {
        id: 'crop-20',
        cells: {
          field: 'Foxglove East',
          crop: 'Sugar beet',
          year: 2024,
          workingArea: 6.5,
          yield: 0,
          plantingDate: '2024-04-22',
          harvestDate: '2024-11-02',
        },
        highlight: ['yield'],
      },
    ],
  },

  'ex-crop-area': {
    columns: [
      { key: 'field', label: 'Field' },
      { key: 'fieldArea', label: 'Field area (ha)', numeric: true },
      { key: 'crop', label: 'Crop' },
      { key: 'cropArea', label: 'Crop area (ha)', numeric: true },
    ],
    before: [
      {
        id: 'crop-19',
        cells: {
          field: 'River Bend',
          fieldArea: 28.4,
          crop: 'Winter wheat',
          cropArea: 32.0,
        },
        highlight: ['cropArea'],
      },
    ],
    after: [
      {
        id: 'crop-19',
        cells: {
          field: 'River Bend',
          fieldArea: 28.4,
          crop: 'Winter wheat',
          cropArea: 28.4,
        },
        highlight: ['cropArea'],
      },
    ],
  },

  'ex-duplicate-cropping': {
    columns: CROPPING_COLS,
    before: [
      {
        id: 'crop-10',
        cells: {
          field: 'Marlpit',
          crop: 'Winter wheat',
          year: 2024,
          workingArea: 16.5,
          yield: 8.1,
          plantingDate: '2023-10-08',
          harvestDate: '2024-08-12',
        },
      },
      {
        id: 'crop-10-dup',
        cells: {
          field: 'Marlpit',
          crop: 'Winter wheat',
          year: 2024,
          workingArea: 16.5,
          yield: 8.1,
          plantingDate: '2023-10-08',
          harvestDate: '2024-08-12',
        },
        highlight: ['field', 'crop', 'year'],
      },
    ],
    after: [
      {
        id: 'crop-10',
        cells: {
          field: 'Marlpit',
          crop: 'Winter wheat',
          year: 2024,
          workingArea: 16.5,
          yield: 8.1,
          plantingDate: '2023-10-08',
          harvestDate: '2024-08-12',
        },
      },
    ],
  },

  'ex-duplicate-operation': {
    columns: OPERATION_COLS,
    before: [
      {
        id: 'op-7a',
        cells: {
          field: 'Old Barn Field',
          year: 2024,
          group: 'Crop Protection',
          product: 'Aviator Xpro',
          quantity: 1.25,
          unit: 'L/ha',
          date: '2024-05-12',
        },
      },
      {
        id: 'op-7b',
        cells: {
          field: 'Old Barn Field',
          year: 2024,
          group: 'Crop Protection',
          product: 'Aviator Xpro',
          quantity: 1.25,
          unit: 'L/ha',
          date: '2024-05-12',
        },
        highlight: ['date', 'product'],
      },
    ],
    after: [
      {
        id: 'op-7a',
        cells: {
          field: 'Old Barn Field',
          year: 2024,
          group: 'Crop Protection',
          product: 'Aviator Xpro',
          quantity: 1.25,
          unit: 'L/ha',
          date: '2024-05-12',
        },
      },
      {
        id: 'op-7b',
        cells: {
          field: 'Old Barn Field',
          year: 2024,
          group: 'Crop Protection',
          product: 'Aviator Xpro',
          quantity: 1.25,
          unit: 'L/ha',
          date: '2024-05-12',
        },
        highlight: ['date'],
      },
    ],
  },

  'ex-duplicate-fertiliser': {
    columns: OPERATION_COLS,
    before: [
      {
        id: 'op-14a',
        cells: {
          field: "Cobbett's Hollow",
          year: 2024,
          group: 'Nutrition',
          product: 'Nitram',
          quantity: 180,
          unit: 'kg/ha',
          date: '2024-03-14',
        },
      },
      {
        id: 'op-14b',
        cells: {
          field: "Cobbett's Hollow",
          year: 2024,
          group: 'Nutrition',
          product: 'Nitram',
          quantity: 180,
          unit: 'kg/ha',
          date: '2024-03-14',
        },
        highlight: ['product', 'quantity', 'date'],
      },
    ],
    after: [
      {
        id: 'op-14a',
        cells: {
          field: "Cobbett's Hollow",
          year: 2024,
          group: 'Nutrition',
          product: 'Nitram',
          quantity: 180,
          unit: 'kg/ha',
          date: '2024-03-14',
        },
      },
    ],
  },

  'ex-duplicate-farm': {
    columns: [
      { key: 'farm', label: 'Farm name' },
      { key: 'reference', label: 'Reference' },
      { key: 'fields', label: 'Fields', numeric: true },
      { key: 'status', label: 'Status' },
    ],
    before: [
      {
        id: 'farm-import',
        cells: {
          farm: 'Brookside Leys',
          reference: 'IMPORT-2026-06',
          fields: 9,
          status: 'New (incoming)',
        },
        highlight: ['farm', 'status'],
      },
      {
        id: 'farm-existing',
        cells: {
          farm: 'Brookside Leys',
          reference: 'SANDY-FARM-0042',
          fields: 11,
          status: 'Existing in Sandy',
        },
      },
    ],
    after: [
      {
        id: 'farm-existing',
        cells: {
          farm: 'Brookside Leys',
          reference: 'SANDY-FARM-0042',
          fields: 20,
          status: 'Merged',
        },
        highlight: ['fields', 'status'],
      },
    ],
  },

  'ex-orphan-operation': {
    columns: OPERATION_COLS,
    before: [
      {
        id: 'op-22',
        cells: {
          field: 'Hayrick',
          year: 2024,
          group: 'Crop Protection',
          product: 'Roundup Flex',
          quantity: 2.5,
          unit: 'L/ha',
          date: '2024-04-02',
        },
        highlight: ['field', 'date'],
      },
    ],
    after: [
      {
        id: 'op-22',
        cells: {
          field: 'Hayrick',
          year: 2024,
          group: 'Crop Protection',
          product: 'Roundup Flex',
          quantity: 2.5,
          unit: 'L/ha',
          date: '2024-04-02',
        },
        highlight: ['field'],
      },
    ],
  },

  'ex-deletion-not-allowed': {
    columns: [...OPERATION_COLS, { key: 'action', label: 'Action' }],
    before: [
      {
        id: 'op-31',
        cells: {
          field: 'Marlpit',
          year: 2024,
          group: 'Crop Protection',
          product: 'Karate Zeon',
          quantity: 0.075,
          unit: 'L/ha',
          date: '2024-06-18',
          action: 'Delete',
        },
        highlight: ['action'],
      },
    ],
    after: [],
  },
}
