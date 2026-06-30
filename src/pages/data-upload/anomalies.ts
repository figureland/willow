/* -------------------------------------------------------------------------- */
/* Anomalies — three kinds of "worth a look" findings on the upload            */
/* -------------------------------------------------------------------------- */

/**
 * Anomalies are NOT errors. They surface values that read as unusual against
 * either neighbouring rows, the user's own history, or a regional reference.
 * Every anomaly carries the same knock-on copy so the user understands the
 * downstream cost of leaving it as-is.
 */

export const ANOMALY_KNOCK_ON =
  'This will affect the accuracy of carbon calculations and other reports generated on the Sandy platform.'

export type AnomalyKind = 'spot' | 'trend' | 'regional'

type CommonAnomaly = {
  id: string
  kind: AnomalyKind
  /** One-line headline shown on the card. */
  title: string
  /** Sub-line under the title — typically the scope (farm/field/year). */
  scope: string
}

/* -------------------------------------------------------------------------- */
/* Spot anomaly — a single suspect cell with an inline correction               */
/* -------------------------------------------------------------------------- */

/**
 * Spot anomalies highlight one (or a small handful of) row(s) where a value
 * stands out against its neighbours — e.g. `1000` next to `1.000`. The user
 * resolves it inline: accept Sandy's correction, or edit the value manually.
 */
export type SpotAnomaly = CommonAnomaly & {
  kind: 'spot'
  /** Short paragraph explaining what Sandy spotted. */
  observation: string
  /** Description of the suggested correction. */
  suggestion: string
  /** The column being corrected — used for the cell highlight. */
  columnKey: string
  /** Human-readable column label for the suggestion summary. */
  columnLabel: string
  /** The rows in question, with original + Sandy's suggested value. */
  rows: SpotAnomalyRow[]
}

export type SpotAnomalyRow = {
  id: string
  /** Cells to display in the inline grid, keyed by column. */
  cells: Record<string, string | number>
  /** Sandy's suggested value for the highlighted column. */
  suggestedValue: string | number
}

/* -------------------------------------------------------------------------- */
/* Comparison anomalies — drill into a scoped field-style page                */
/* -------------------------------------------------------------------------- */

/**
 * Comparison anomalies present an aggregate deviation: a field, crop, or farm
 * is materially different from a baseline. The detail page renders a small
 * comparison chart + the in-scope records in a DataTable; the user reviews
 * via batch select + edit.
 */
type ComparisonAnomalyBase = CommonAnomaly & {
  observation: string
  /** Unit string for the metric (e.g. "t/ha", "kgN/ha"). */
  unit: string
  /** Records the user can review in the detail page. */
  rows: ComparisonRow[]
  /** Labelled value pairs — used to render the comparison chart. */
  series: ComparisonPoint[]
  /** Index in `series` of the bar that should read as "the current value". */
  currentIndex: number
}

export type ComparisonPoint = {
  /** Axis label, e.g. "2024/25", "2025/26", "East of England avg." */
  label: string
  value: number
}

export type ComparisonRow = {
  id: string
  cells: Record<string, string | number>
}

/**
 * Trend anomalies compare the current season against the user's own prior
 * year(s). The series has at least two points — historical reference(s) and
 * the current value flagged via `currentIndex`.
 */
export type TrendAnomaly = ComparisonAnomalyBase & {
  kind: 'trend'
  /** Headline framing for the chart — "vs. previous year", "vs. 5-yr avg." */
  comparisonLabel: string
}

/**
 * Regional anomalies compare the user's reported value against a regional
 * reference (e.g. "East of England").
 */
export type RegionalAnomaly = ComparisonAnomalyBase & {
  kind: 'regional'
  /** Name of the region the comparison is drawn against. */
  region: string
}

export type Anomaly = SpotAnomaly | TrendAnomaly | RegionalAnomaly

/* -------------------------------------------------------------------------- */
/* Column hints — drive grid headers in the inline + detail views              */
/* -------------------------------------------------------------------------- */

export type AnomalyColumn = {
  key: string
  label: string
  numeric?: boolean
  /** Optional unit suffix shown in the cell (e.g. "t/ha"). */
  unit?: string
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

export const SPOT_ANOMALIES: SpotAnomaly[] = [
  {
    id: 'spot-decimal-nitrogen',
    kind: 'spot',
    title: 'A nitrogen value looks 1,000× higher than its neighbours',
    scope: 'Foxglove Hill · field "Top East" · 2025 spring application',
    observation:
      'Sandy noticed one nitrogen application reading at 1000 kgN/ha while every other row on this field reads around 1.0 kgN/ha. This is the typical signature of a decimal separator being lost when the spreadsheet was exported.',
    suggestion:
      'Change the value to 1.000 kgN/ha so it lines up with the rest of the field.',
    columnKey: 'quantity',
    columnLabel: 'Quantity',
    rows: [
      {
        id: 'spot-decimal-nitrogen-r1',
        cells: {
          field: 'Top East',
          date: '14 Mar 2025',
          product: 'Liquid UAN 30',
          quantity: 1000,
          unit: 'kgN/ha',
        },
        suggestedValue: 1.0,
      },
    ],
  },
  {
    id: 'spot-yield-unit-mixup',
    kind: 'spot',
    title: 'A yield value reads in kg/ha instead of t/ha',
    scope: 'Brookside Leys · field "Long Bottom" · winter wheat 2025/26',
    observation:
      'One winter wheat yield was recorded at 9,420 against neighbouring values around 9.4. The order of magnitude matches the difference between kg/ha and t/ha — the row was likely imported in the wrong unit.',
    suggestion:
      'Divide the value by 1,000 so it reads as 9.42 t/ha, matching the rest of the cropping table.',
    columnKey: 'yield',
    columnLabel: 'Yield',
    rows: [
      {
        id: 'spot-yield-unit-mixup-r1',
        cells: {
          field: 'Long Bottom',
          crop: 'Winter wheat',
          season: '2025/26',
          yield: 9420,
          unit: 't/ha',
        },
        suggestedValue: 9.42,
      },
    ],
  },
]

export const TREND_ANOMALIES: TrendAnomaly[] = [
  {
    id: 'trend-yield-5x',
    kind: 'trend',
    title: 'Winter wheat yield on Saltway is 5.2× last year',
    scope: 'Amber Harvest Farm · field "Saltway"',
    observation:
      "Saltway's reported 2025/26 winter wheat yield is 48.6 t/ha, against 9.3 t/ha for the 2024/25 season. A jump this size is usually an input error rather than a real outcome — worth checking the source spreadsheet.",
    unit: 't/ha',
    comparisonLabel: 'vs. 2024/25 season',
    series: [
      { label: '2024/25', value: 9.3 },
      { label: '2025/26', value: 48.6 },
    ],
    currentIndex: 1,
    rows: [
      {
        id: 'trend-yield-5x-r1',
        cells: {
          field: 'Saltway',
          crop: 'Winter wheat',
          season: '2025/26',
          area: 24.6,
          yield: 48.6,
          totalYield: 1195.6,
        },
      },
    ],
  },
  {
    id: 'trend-fertiliser-low',
    kind: 'trend',
    title: 'Fertiliser use is 18% of the 2020–2024 average',
    scope: 'Foxglove Hill · all fields · spring 2025/26',
    observation:
      "Total spring nitrogen applied on Foxglove Hill this season is 31 kgN/ha — well below the 175 kgN/ha you've averaged across 2020–2024. If a fertiliser pass is missing from your records, applications are likely undercounted.",
    unit: 'kgN/ha',
    comparisonLabel: 'vs. 2020–2024 average',
    series: [
      { label: '2020', value: 168 },
      { label: '2021', value: 182 },
      { label: '2022', value: 174 },
      { label: '2023', value: 188 },
      { label: '2024', value: 163 },
      { label: '2025', value: 31 },
    ],
    currentIndex: 5,
    rows: [
      {
        id: 'trend-fert-low-r1',
        cells: {
          field: 'Far Acre',
          crop: 'Winter wheat',
          season: '2025/26',
          appliedN: 28,
          passes: 1,
        },
      },
      {
        id: 'trend-fert-low-r2',
        cells: {
          field: 'Top East',
          crop: 'Winter wheat',
          season: '2025/26',
          appliedN: 34,
          passes: 1,
        },
      },
      {
        id: 'trend-fert-low-r3',
        cells: {
          field: 'Mill Pightle',
          crop: 'Winter barley',
          season: '2025/26',
          appliedN: 30,
          passes: 1,
        },
      },
    ],
  },
]

export const REGIONAL_ANOMALIES: RegionalAnomaly[] = [
  {
    id: 'regional-yield-low',
    kind: 'regional',
    title:
      'Brookside Leys winter wheat yield is 38% below the regional average',
    scope: 'Brookside Leys · all winter wheat fields · 2025/26',
    observation:
      'Your reported winter wheat yield averaged 5.8 t/ha against an East of England benchmark of 9.4 t/ha. Yields can swing meaningfully season to season, but a gap this size is worth a sanity check against the original harvest records.',
    unit: 't/ha',
    region: 'East of England',
    series: [
      { label: 'Brookside Leys', value: 5.8 },
      { label: 'Foxglove Hill', value: 8.9 },
      { label: 'Amber Harvest', value: 9.1 },
      { label: 'East of England avg.', value: 9.4 },
    ],
    currentIndex: 0,
    rows: [
      {
        id: 'regional-yield-low-r1',
        cells: {
          field: 'Long Bottom',
          crop: 'Winter wheat',
          season: '2025/26',
          area: 18.4,
          yield: 5.6,
        },
      },
      {
        id: 'regional-yield-low-r2',
        cells: {
          field: 'Stone Pightle',
          crop: 'Winter wheat',
          season: '2025/26',
          area: 12.1,
          yield: 6.0,
        },
      },
      {
        id: 'regional-yield-low-r3',
        cells: {
          field: 'Saltway',
          crop: 'Winter wheat',
          season: '2025/26',
          area: 9.7,
          yield: 5.9,
        },
      },
    ],
  },
]

export const ANOMALIES: Anomaly[] = [
  ...SPOT_ANOMALIES,
  ...TREND_ANOMALIES,
  ...REGIONAL_ANOMALIES,
]

/* -------------------------------------------------------------------------- */
/* Grid hints per anomaly — the row shape varies, so each fixture declares    */
/* the columns it wants rendered.                                              */
/* -------------------------------------------------------------------------- */

export const COLUMNS_FOR: Record<string, AnomalyColumn[]> = {
  'spot-decimal-nitrogen': [
    { key: 'field', label: 'Field' },
    { key: 'date', label: 'Date' },
    { key: 'product', label: 'Product' },
    { key: 'quantity', label: 'Quantity', numeric: true },
    { key: 'unit', label: 'Unit' },
  ],
  'spot-yield-unit-mixup': [
    { key: 'field', label: 'Field' },
    { key: 'crop', label: 'Crop' },
    { key: 'season', label: 'Season' },
    { key: 'yield', label: 'Yield', numeric: true },
    { key: 'unit', label: 'Unit' },
  ],
  'trend-yield-5x': [
    { key: 'field', label: 'Field' },
    { key: 'crop', label: 'Crop' },
    { key: 'season', label: 'Season' },
    { key: 'area', label: 'Area (ha)', numeric: true },
    { key: 'yield', label: 'Yield (t/ha)', numeric: true },
    { key: 'totalYield', label: 'Total (t)', numeric: true },
  ],
  'trend-fertiliser-low': [
    { key: 'field', label: 'Field' },
    { key: 'crop', label: 'Crop' },
    { key: 'season', label: 'Season' },
    { key: 'appliedN', label: 'Applied N (kgN/ha)', numeric: true },
    { key: 'passes', label: 'Passes', numeric: true },
  ],
  'regional-yield-low': [
    { key: 'field', label: 'Field' },
    { key: 'crop', label: 'Crop' },
    { key: 'season', label: 'Season' },
    { key: 'area', label: 'Area (ha)', numeric: true },
    { key: 'yield', label: 'Yield (t/ha)', numeric: true },
  ],
}

export const getAnomaly = (id: string): Anomaly | undefined =>
  ANOMALIES.find((a) => a.id === id)
