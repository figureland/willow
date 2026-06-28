/* -------------------------------------------------------------------------- */
/* Completeness summary fixture                                                */
/* -------------------------------------------------------------------------- */

/**
 * Sandy's per-standard completeness rollup. Hand-encoded from the CSV the
 * Sandy team shared — one entry per row in the upload, nested by domain ->
 * standard -> section -> item.
 *
 * Each row has three percentages: Required, Encouraged, Optional. `null`
 * means the field was empty in the CSV (treated as "not measured"); `'na'`
 * means the source said N/A (not applicable to this standard / section).
 */

export type Pct = number | 'na' | null

export type Dimension = 'required' | 'encouraged' | 'optional'

export type CompletenessSummaryNode = {
  /** Stable id, used to key open/closed state. */
  id: string
  label: string
  pct: { required: Pct; encouraged: Pct; optional: Pct }
  /** True for rows that were `row_type=summary` in the CSV — i.e. they
   *  expand to reveal a breakdown. Data rows are leaves. */
  isSummary: boolean
  children: CompletenessSummaryNode[]
}

/**
 * A single improvement claim made by a completeness action: "accepting
 * this issue raises {nodeId}.{dimension} by deltaPct percentage points".
 * The summary panel applies these on top of the baseline rollup and rolls
 * the new values up through their parent summary rows.
 */
export type CompletenessImprovement = {
  nodeId: string
  dimension: Dimension
  /** Number of percentage points to add. Caps at 100. */
  deltaPct: number
}

const r = (
  required: Pct,
  encouraged: Pct,
  optional: Pct,
): CompletenessSummaryNode['pct'] => ({ required, encouraged, optional })

export const COMPLETENESS_SUMMARY: CompletenessSummaryNode = {
  id: 'arable-horticulture',
  label: 'Arable & Horticulture',
  pct: r(60, 10, 14),
  isSummary: true,
  children: [
    {
      id: 'carbon',
      label: 'Carbon',
      pct: r(54, 19, 25),
      isSummary: true,
      children: [
        {
          id: 'carbon-farms',
          label: 'Farms',
          pct: r(50, null, null),
          isSummary: false,
          children: [],
        },
        {
          id: 'carbon-fields',
          label: 'Fields',
          pct: r(25, null, null),
          isSummary: false,
          children: [],
        },
        {
          id: 'carbon-cropping',
          label: 'Cropping',
          pct: r(56, 0, 0),
          isSummary: false,
          children: [],
        },
        {
          id: 'carbon-operations',
          label: 'Operations',
          pct: r(100, null, 50),
          isSummary: false,
          children: [],
        },
        {
          id: 'carbon-input',
          label: 'Input',
          pct: r(40, 38, null),
          isSummary: true,
          children: [
            {
              id: 'carbon-input-mf',
              label: 'Manufactured fertiliser',
              pct: r(12, 9, null),
              isSummary: false,
              children: [],
            },
            {
              id: 'carbon-input-of',
              label: 'Organic fertiliser',
              pct: r('na', 'na', null),
              isSummary: false,
              children: [],
            },
            {
              id: 'carbon-input-cp',
              label: 'Crop protection',
              pct: r(71, 71, null),
              isSummary: false,
              children: [],
            },
          ],
        },
        {
          id: 'carbon-soil',
          label: 'Soil sampling',
          pct: r(null, 'na', null),
          isSummary: false,
          children: [],
        },
      ],
    },
    {
      id: 'water-nitrogen',
      label: 'Water & Nitrogen Management',
      pct: r(66, 0, 3),
      isSummary: true,
      children: [
        {
          id: 'wn-farms',
          label: 'Farms',
          pct: r(100, null, null),
          isSummary: false,
          children: [],
        },
        {
          id: 'wn-fields',
          label: 'Fields',
          pct: r(50, null, null),
          isSummary: false,
          children: [],
        },
        {
          id: 'wn-cropping',
          label: 'Cropping',
          pct: r(67, 0, 0),
          isSummary: false,
          children: [],
        },
        {
          id: 'wn-operations',
          label: 'Operations',
          pct: r(100, null, 0),
          isSummary: false,
          children: [],
        },
        {
          id: 'wn-input',
          label: 'Input',
          pct: r(12, 0, 10),
          isSummary: true,
          children: [
            {
              id: 'wn-input-mf',
              label: 'Manufactured fertiliser',
              pct: r(12, 0, 10),
              isSummary: false,
              children: [],
            },
            {
              id: 'wn-input-of',
              label: 'Organic fertiliser',
              pct: r('na', null, 'na'),
              isSummary: false,
              children: [],
            },
          ],
        },
        {
          id: 'wn-soil',
          label: 'Soil sampling',
          pct: r('na', 'na', null),
          isSummary: false,
          children: [],
        },
      ],
    },
  ],
}
