import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { CompletenessModal, type CompletenessTable } from './CompletenessModal'
import { CompletenessSummary } from './CompletenessSummary'
import type { CompletenessImprovement } from './completeness-summary'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Completeness is opt-in — every gap Sandy spots can either be filled with
 * an estimate or left alone. We don't grade them as blocking/warning here;
 * instead we bucket them by how much downstream accuracy they affect.
 */
type Tier = 'required' | 'encouraged' | 'optional'

type Resolution = 'pending' | 'accepted' | 'skipped'

type CompletenessIssue = {
  id: string
  /** Short headline — what's missing, in plain language. */
  title: string
  /** One-line summary of the affected record(s). */
  detail: string
  /** Plain-language summary of Sandy's proposed fix. */
  recommendation: string
  tier: Tier
  /**
   * Optional rich preview. When set, the View button opens a modal that
   * shows the full table-level changes Sandy will apply, with provenance.
   * Issues without a preview just expose the short recommendation copy.
   */
  preview?: {
    explanation: string
    sources: string[]
    tables: CompletenessTable[]
  }
  /**
   * Improvements this issue contributes to the completeness summary when
   * accepted. Each entry says: "accepting me raises {nodeId}.{dimension}
   * by N percentage points". The summary panel applies these and rolls
   * them up through their parent summary rows.
   */
  improvements?: CompletenessImprovement[]
}

const TIER_ORDER: Tier[] = ['required', 'encouraged', 'optional']

const TIER_LABEL: Record<Tier, string> = {
  required: 'Required',
  encouraged: 'Encouraged',
  optional: 'Optional',
}

const TIER_DESCRIPTION: Record<Tier, string> = {
  required:
    'Sandy needs these to land the upload. Each one materially affects downstream reports.',
  encouraged:
    'Strongly recommended — improves report accuracy. Sandy can fill most of these in.',
  optional: 'Adds polish or extra detail. Skip without consequence.',
}

const ISSUES: CompletenessIssue[] = [
  // Important — high-impact gaps
  {
    id: 'mf-1',
    title: 'Missing total nitrogen applied',
    detail: 'Long Bottom · winter wheat 2024',
    recommendation:
      'Estimate 120 kgN/ha based on yield and your 2023 farm average.',
    tier: 'required',
    preview: {
      explanation:
        "Sandy didn't find any nitrogen applications on Long Bottom for winter wheat 2024. Based on your yields and the field's location, Sandy estimates 120 kgN/ha. Accepting this creates a single dummy operation row (dated to the first day of the harvest year) plus a matching dummy product in your manufactured fertiliser table.",
      sources: [
        "Sandy's regional dataset — 2023 winter wheat applications within ~25 km of Long Bottom.",
        'Your previous Long Bottom yields (2020–2023) used to anchor the rate.',
        'RB209 typical N percentages for the closest matching fertiliser product.',
      ],
      tables: [
        {
          title: 'Operations · Long Bottom · 2024',
          columns: [
            { key: 'field', label: 'Field' },
            { key: 'date', label: 'Date' },
            { key: 'product', label: 'Product' },
            { key: 'qty', label: 'Qty', numeric: true },
            { key: 'unit', label: 'Unit' },
          ],
          // No existing nitrogen rows — Sandy is reconstructing the whole
          // application from scratch.
          rows: [],
          changes: [
            {
              kind: 'add-row',
              rowId: 'op-dummy-n',
              cells: {
                field: 'Long Bottom',
                date: '01 Jan 2024',
                product: 'Estimated nitrogen (Sandy)',
                qty: '120',
                unit: 'kgN/ha',
              },
            },
          ],
        },
        {
          title: 'Manufactured fertiliser products',
          columns: [
            { key: 'product', label: 'Product' },
            { key: 'n', label: 'N %', numeric: true },
            { key: 'source', label: 'Source' },
          ],
          rows: [],
          changes: [
            {
              kind: 'add-row',
              rowId: 'product-dummy-n',
              cells: {
                product: 'Estimated nitrogen (Sandy)',
                n: '27%',
                source: 'Closest match to your prior data',
              },
            },
          ],
        },
      ],
    },
    improvements: [
      // The new operation row fills Required on Carbon Operations.
      { nodeId: 'carbon-operations', dimension: 'required', deltaPct: 0 },
      // The dummy fertiliser product fills Required and Encouraged on the
      // Manufactured fertiliser leaf (large jump because we're going from
      // 12 / 9 to ~88 / 86 once a real product row exists).
      { nodeId: 'carbon-input-mf', dimension: 'required', deltaPct: 76 },
      { nodeId: 'carbon-input-mf', dimension: 'encouraged', deltaPct: 77 },
      { nodeId: 'wn-input-mf', dimension: 'required', deltaPct: 76 },
      { nodeId: 'wn-input-mf', dimension: 'encouraged', deltaPct: 80 },
    ],
  },
  {
    id: 'cp-1',
    title: 'No Sandy match for crop',
    detail: 'Oats COVER · Long Bottom',
    recommendation: 'Map to "Cover crop (oats)".',
    tier: 'required',
  },
  {
    id: 'mf-2',
    title: 'Missing spring N split',
    detail: 'Long Bottom · single 220 kgN/ha pass',
    recommendation: 'Prefill a 60/40 split (Mar/Apr).',
    tier: 'required',
  },

  // Recommended — useful fills with good defaults
  {
    id: 'cr-1',
    title: 'Missing planting & harvest dates',
    detail: 'Cropping · 4 fields · winter wheat 2024',
    recommendation:
      'Impute planting and harvest dates from your historical cropping records.',
    tier: 'encouraged',
    preview: {
      explanation:
        'Four winter wheat rows have empty planting and harvest dates. Sandy can fill them in directly from your 2020–2023 cropping records on the same fields — this only changes the cropping table, no extra rows.',
      sources: [
        'Your own cropping table — 2020–2023 winter wheat planting and harvest dates on the same fields.',
        'Regional sowing-window dataset for the field cluster.',
      ],
      tables: [
        {
          title: 'Cropping · winter wheat 2024',
          columns: [
            { key: 'field', label: 'Field' },
            { key: 'crop', label: 'Crop' },
            { key: 'planting', label: 'Planting date' },
            { key: 'harvest', label: 'Harvest date' },
          ],
          rows: [
            {
              id: 'crop-1',
              cells: {
                field: 'Long Bottom',
                crop: 'Winter wheat',
                planting: '',
                harvest: '',
              },
            },
            {
              id: 'crop-2',
              cells: {
                field: 'Top East',
                crop: 'Winter wheat',
                planting: '',
                harvest: '',
              },
            },
            {
              id: 'crop-3',
              cells: {
                field: 'Saltway',
                crop: 'Winter wheat',
                planting: '',
                harvest: '12 Aug 2024',
              },
            },
            {
              id: 'crop-4',
              cells: {
                field: 'Stone Pightle',
                crop: 'Winter wheat',
                planting: '14 Oct 2023',
                harvest: '',
              },
            },
          ],
          changes: [
            {
              kind: 'add-cell',
              rowId: 'crop-1',
              column: 'planting',
              value: '12 Oct 2023',
            },
            {
              kind: 'add-cell',
              rowId: 'crop-1',
              column: 'harvest',
              value: '08 Aug 2024',
            },
            {
              kind: 'add-cell',
              rowId: 'crop-2',
              column: 'planting',
              value: '15 Oct 2023',
            },
            {
              kind: 'add-cell',
              rowId: 'crop-2',
              column: 'harvest',
              value: '10 Aug 2024',
            },
            {
              kind: 'add-cell',
              rowId: 'crop-3',
              column: 'planting',
              value: '08 Oct 2023',
            },
            {
              kind: 'add-cell',
              rowId: 'crop-4',
              column: 'harvest',
              value: '14 Aug 2024',
            },
          ],
        },
      ],
    },
    improvements: [
      // Filling planting/harvest dates lifts the Cropping leaf for both
      // standards (Carbon + Water & Nitrogen). The deltas are sized so the
      // rollup shifts visibly without saturating.
      { nodeId: 'carbon-cropping', dimension: 'required', deltaPct: 22 },
      { nodeId: 'wn-cropping', dimension: 'required', deltaPct: 18 },
    ],
  },
  {
    id: 'of-1',
    title: 'No dry-matter percentage',
    detail: 'Saltway · 3 slurry applications',
    recommendation: 'Default to 6% (NRM 2023).',
    tier: 'encouraged',
  },
  {
    id: 'mf-3',
    title: 'Unusual product unit',
    detail: 'Yara Mila Actyva S · litres/ha',
    recommendation: 'Convert to kg/ha at 1.05 g/cm³.',
    tier: 'encouraged',
  },
  {
    id: 'cp-3',
    title: 'Product not in registered list',
    detail: 'RoundUp Flex Plus',
    recommendation: 'Map to Roundup Flex.',
    tier: 'encouraged',
  },

  // Nice to have — polish
  {
    id: 'of-2',
    title: 'No nutrient analysis',
    detail: 'Compost · 12 fields',
    recommendation: 'Prefill from RB209 typicals.',
    tier: 'optional',
  },
  {
    id: 'cp-2',
    title: 'Application notes empty',
    detail: 'Crop protection · 14 applications',
    recommendation: 'Leave blank or auto-generate from product + crop.',
    tier: 'optional',
  },
]

const totalIssues = ISSUES.length

const issuesByTier: Record<Tier, CompletenessIssue[]> = {
  required: ISSUES.filter((i) => i.tier === 'required'),
  encouraged: ISSUES.filter((i) => i.tier === 'encouraged'),
  optional: ISSUES.filter((i) => i.tier === 'optional'),
}

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const CompletenessStep = () => {
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(
    () => {
      const seed: Record<string, Resolution> = {}
      for (const issue of ISSUES) seed[issue.id] = 'pending'
      return seed
    },
  )
  const setResolution = (id: string, next: Resolution) =>
    setResolutions((curr) => ({ ...curr, [id]: next }))

  // Which issue is currently open in the View modal. `null` when no modal
  // is open. Accepting commits the fix and closes; closing leaves it pending.
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewingIssue = ISSUES.find((i) => i.id === viewingId) ?? null

  // Collect improvements from every accepted issue so the summary can
  // project the post-resolution rollup.
  const appliedImprovements: CompletenessImprovement[] = useMemo(() => {
    const out: CompletenessImprovement[] = []
    for (const issue of ISSUES) {
      if (resolutions[issue.id] !== 'accepted') continue
      if (issue.improvements) out.push(...issue.improvements)
    }
    return out
  }, [resolutions])

  return (
    <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-8 py-10 pb-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-text-primary">
          Completeness
        </h1>
        <p className="max-w-[820px] text-md text-text-secondary">
          Sandy can fill in {totalIssues} {totalIssues === 1 ? 'gap' : 'gaps'}{' '}
          using historic, regional or government data. Completeness is opt-in —
          accept the fix or leave it alone, on a per-item basis.
        </p>
      </header>

      <CompletenessSummary appliedImprovements={appliedImprovements} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const pool = issuesByTier[tier]
          return (
            <section
              key={tier}
              className="flex flex-col gap-3 rounded-xl bg-bg-secondary p-4"
            >
              <header className="flex flex-col gap-1">
                <h2 className="text-md font-semibold text-text-primary">
                  {TIER_LABEL[tier]}
                </h2>
                <p className="text-sm text-text-secondary">
                  {TIER_DESCRIPTION[tier]}
                </p>
              </header>

              <ol className="flex flex-col gap-2">
                {pool.length === 0 ? (
                  <li className="rounded-lg border-2 border-dashed border-border-tertiary px-4 py-6 text-center text-sm text-text-secondary">
                    Nothing here.
                  </li>
                ) : (
                  pool.map((issue) => (
                    <li key={issue.id}>
                      <CompletenessCard
                        issue={issue}
                        resolution={resolutions[issue.id]}
                        onView={() => setViewingId(issue.id)}
                      />
                    </li>
                  ))
                )}
              </ol>
            </section>
          )
        })}
      </div>

      {viewingIssue?.preview ? (
        <CompletenessModal
          open={viewingId !== null}
          onOpenChange={(open) => {
            if (!open) setViewingId(null)
          }}
          issue={{
            title: viewingIssue.title,
            explanation: viewingIssue.preview.explanation,
            sources: viewingIssue.preview.sources,
            tables: viewingIssue.preview.tables,
          }}
          onAccept={() => {
            setResolution(viewingIssue.id, 'accepted')
            setViewingId(null)
          }}
        />
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Card — mirrors the Fix step's IssuesView card structure, in column width    */
/* -------------------------------------------------------------------------- */

const StatusIndicator = ({ resolved }: { resolved: boolean }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors',
      resolved
        ? 'border-support-fg-green bg-support-fg-green text-text-primary-inverse'
        : 'border-border-secondary bg-bg-primary',
    )}
  >
    {resolved ? (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <title>Resolved</title>
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : null}
  </span>
)

const resolvedLabelFor = (r: Resolution): string | null => {
  if (r === 'accepted') return 'Accepted'
  if (r === 'skipped') return 'Skipped'
  return null
}

const isResolved = (r: Resolution) => r !== 'pending'

const CompletenessCard = ({
  issue,
  resolution,
  onView,
}: {
  issue: CompletenessIssue
  resolution: Resolution
  onView: () => void
}) => {
  const resolved = isResolved(resolution)
  const resolvedLabel = resolvedLabelFor(resolution)

  return (
    <button
      type="button"
      onClick={onView}
      className={clsx(
        'group flex w-full items-start gap-3 rounded-lg border-2 border-transparent bg-bg-primary p-4 text-left shadow-sm transition-all duration-200',
        'hover:border-border-tertiary hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
        resolved && 'opacity-70',
      )}
    >
      <StatusIndicator resolved={resolved} />
      <p className="flex-1 text-sm font-medium leading-snug text-text-primary">
        {issue.title}
      </p>
      {resolvedLabel ? (
        <span className="mt-0.5 text-xs font-semibold text-text-brand-dark">
          {resolvedLabel}
        </span>
      ) : null}
    </button>
  )
}
