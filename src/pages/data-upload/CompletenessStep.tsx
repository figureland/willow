import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  DataTable,
  type GridColDef,
  IconArrowLeft,
  IconArrowRight,
} from '../../components/ui'
import { CompletenessSummary } from './CompletenessSummary'
import type { CompletenessImprovement } from './completeness-summary'
import type { CompletenessTable } from './completeness-table'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

type Tier = 'required' | 'encouraged' | 'optional'

type Resolution = 'pending' | 'accepted' | 'skipped'

type CompletenessIssue = {
  id: string
  title: string
  detail: string
  recommendation: string
  tier: Tier
  preview?: {
    headline?: string
    /** Plain-English description of the gap Sandy spotted. */
    problem?: string
    /** Plain-English description of Sandy's proposed fix. */
    fix?: string
    /** Field names Sandy will touch — surfaced inline on the Accept CTA. */
    fields?: string[]
    explanation: string
    sources: string[]
    tables: CompletenessTable[]
  }
  improvements?: CompletenessImprovement[]
}

const TIER_ORDER: Tier[] = ['required', 'encouraged', 'optional']

const TIER_LABEL: Record<Tier, string> = {
  required: 'Required',
  encouraged: 'Encouraged',
  optional: 'Optional',
}

const TIER_DESCRIPTION: Record<Tier, string> = {
  required: 'Required to complete and submit your data to Sandy.',
  encouraged: 'Changes we recommend to make your reports more accurate.',
  optional:
    'Smaller changes that can help your improve the quality of data in your organisation.',
}

const ISSUES: CompletenessIssue[] = [
  // Important — high-impact gaps
  {
    id: 'mf-1',
    title: 'Add placeholder nitrogen records to 4 fields',
    detail: 'Long Bottom · winter wheat 2024',
    recommendation:
      'Estimate 120 kgN/ha based on yield and your 2023 farm average.',
    tier: 'required',
    preview: {
      headline:
        'We can infer missing values in your data to improve the quality of your results.',
      problem:
        '4 fields are missing total nitrogen applied. This will affect the quality of reports you can generate in Sandy.',
      fix: 'Sandy can use your data and information from your region to create highly accurate estimated imputed data.',
      fields: ['Long Bottom', 'Top East', 'Saltway', 'Stone Pightle'],
      explanation:
        "Sandy didn't find any nitrogen applications on Long Bottom for winter wheat 2024. Based on your yields and the field's location, Sandy estimates 120 kgN/ha.",
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
      { nodeId: 'carbon-operations', dimension: 'required', deltaPct: 0 },
      { nodeId: 'carbon-input-mf', dimension: 'required', deltaPct: 76 },
      { nodeId: 'carbon-input-mf', dimension: 'encouraged', deltaPct: 77 },
      { nodeId: 'wn-input-mf', dimension: 'required', deltaPct: 76 },
      { nodeId: 'wn-input-mf', dimension: 'encouraged', deltaPct: 80 },
    ],
  },
  {
    id: 'cp-1',
    title: 'Add missing crops for 1 field',
    detail: 'Oats COVER · Long Bottom',
    recommendation: 'Map to "Cover crop (oats)".',
    tier: 'required',
  },
  {
    id: 'mf-2',
    title: 'Create spring nitrogen split for 1 field',
    detail: 'Long Bottom · single 220 kgN/ha pass',
    recommendation: 'Prefill a 60/40 split (Mar/Apr).',
    tier: 'required',
  },

  // Recommended — useful fills with good defaults
  {
    id: 'cr-1',
    title: 'Fill in planting and harvest dates for 4 fields',
    detail: 'Cropping · 4 fields · winter wheat 2024',
    recommendation:
      'Impute planting and harvest dates from your historical cropping records.',
    tier: 'encouraged',
    preview: {
      headline:
        'We can infer missing planting and harvest dates from your own history.',
      problem:
        '4 fields are missing planting and harvest dates. This will affect the quality of reports you can generate in Sandy.',
      fix: 'Sandy can use your 2020–2023 cropping records on these fields, plus regional sowing-window data, to fill the dates in.',
      fields: ['Long Bottom', 'Top East', 'Saltway', 'Stone Pightle'],
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
      { nodeId: 'carbon-cropping', dimension: 'required', deltaPct: 22 },
      { nodeId: 'wn-cropping', dimension: 'required', deltaPct: 18 },
    ],
  },
  {
    id: 'of-1',
    title: 'Add dry-matter percentages for 3 slurry applications',
    detail: 'Saltway · 3 slurry applications',
    recommendation: 'Default to 6% (NRM 2023).',
    tier: 'encouraged',
  },
  {
    id: 'mf-3',
    title: 'Convert 1 product unit to kg/ha',
    detail: 'Yara Mila Actyva S · litres/ha',
    recommendation: 'Convert to kg/ha at 1.05 g/cm³.',
    tier: 'encouraged',
  },
  {
    id: 'cp-3',
    title: 'Map 1 unregistered product to the closest match',
    detail: 'RoundUp Flex Plus',
    recommendation: 'Map to Roundup Flex.',
    tier: 'encouraged',
  },

  // Nice to have — polish
  {
    id: 'of-2',
    title: 'Prefill nutrient analysis for 12 fields',
    detail: 'Compost · 12 fields',
    recommendation: 'Prefill from RB209 typicals.',
    tier: 'optional',
  },
  {
    id: 'cp-2',
    title: 'Auto-generate application notes for 14 records',
    detail: 'Crop protection · 14 applications',
    recommendation: 'Leave blank or auto-generate from product + crop.',
    tier: 'optional',
  },
]

const issuesByTier: Record<Tier, CompletenessIssue[]> = {
  required: ISSUES.filter((i) => i.tier === 'required'),
  encouraged: ISSUES.filter((i) => i.tier === 'encouraged'),
  optional: ISSUES.filter((i) => i.tier === 'optional'),
}

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const CompletenessStep = () => {
  const navigate = useNavigate()
  const { panelId } = useParams<{ panelId?: string }>()

  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(
    () => {
      const seed: Record<string, Resolution> = {}
      for (const issue of ISSUES) seed[issue.id] = 'pending'
      return seed
    },
  )
  const setResolution = (id: string, next: Resolution) =>
    setResolutions((curr) => ({ ...curr, [id]: next }))

  const appliedImprovements: CompletenessImprovement[] = useMemo(() => {
    const out: CompletenessImprovement[] = []
    for (const issue of ISSUES) {
      if (resolutions[issue.id] !== 'accepted') continue
      if (issue.improvements) out.push(...issue.improvements)
    }
    return out
  }, [resolutions])

  const activeIssue = panelId
    ? (ISSUES.find((i) => i.id === panelId) ?? null)
    : null

  // Navigation is plain history — the detail page is a real route at
  // /data-upload/completeness/:panelId. Cards link to it (so middle-click /
  // cmd-click / Back all work); accept and skip pop the history entry so
  // the back button still feels natural after committing a decision.
  const closeDetail = () => navigate(-1)

  if (activeIssue) {
    return (
      <CompletenessDetail
        issue={activeIssue}
        resolution={resolutions[activeIssue.id]}
        onAccept={() => {
          setResolution(activeIssue.id, 'accepted')
          closeDetail()
        }}
        onSkip={() => {
          setResolution(activeIssue.id, 'skipped')
          closeDetail()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Full-bleed header band — matches the green hero on the detail page
          in shape (edge-to-edge), but stays neutral here so the brand
          treatment is reserved for the moment the user is making a call. */}
      <section className="bg-bg-tertiary">
        <div className="mx-auto w-full max-w-[1400px] px-8 py-10">
          <h1 className="text-3xl font-semibold text-text-primary">
            Our recommended changes
          </h1>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-8 pt-8">
        <CompletenessSummary appliedImprovements={appliedImprovements} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIER_ORDER.map((tier) => {
            const pool = issuesByTier[tier]
            return (
              <section
                key={tier}
                className="flex flex-col gap-3 rounded-xl bg-bg-secondary p-4"
              >
                {/* Fixed-height header — keeps the first card row aligned
                    across the three tiers, regardless of body length. */}
                <header className="flex h-20 flex-col gap-1.5">
                  <h2 className="text-xl font-semibold text-text-primary">
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
                        />
                      </li>
                    ))
                  )}
                </ol>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Card — mirrors the Fix step's IssuesView card structure, in column width    */
/* -------------------------------------------------------------------------- */

const resolvedLabelFor = (r: Resolution): string | null => {
  if (r === 'accepted') return 'Accepted'
  if (r === 'skipped') return 'Skipped'
  return null
}

const isResolved = (r: Resolution) => r !== 'pending'

type TierTone = {
  /** Card surface + the matching full-page hero band. */
  surface: string
  text: string
  body: string
  titleResolved: string
  arrowBg: string
  arrowFg: string
  /** Eyebrow / accent text used in the detail hero (Problem / Fix labels,
   *  Resolved pill, "Why this matters"). */
  accent: string
  /** Stat-column inset surface — sits on top of the hero band. */
  statBg: string
  /** Back-to-list chip in the detail hero. */
  backChip: string
  /** Focus ring colour to use on the detail-hero back chip. */
  backChipRing: string
}

const TIER_CARD: Record<Tier, TierTone> = {
  required: {
    surface: 'bg-sandy-900',
    text: 'text-text-primary-inverse',
    body: 'text-text-primary-inverse/80',
    titleResolved: 'text-sandy-300',
    arrowBg: 'bg-sandy-800',
    arrowFg: 'text-text-primary-inverse',
    accent: 'text-sandy-300',
    statBg: 'bg-sandy-800/60',
    backChip: 'bg-sandy-800/60 text-text-primary-inverse/90 hover:bg-sandy-800',
    backChipRing: 'focus-visible:ring-sandy-300/60',
  },
  encouraged: {
    surface: 'bg-bayer-200',
    text: 'text-bayer-950',
    body: 'text-bayer-900/80',
    titleResolved: 'text-bayer-800',
    arrowBg: 'bg-bayer-400',
    arrowFg: 'text-bayer-950',
    accent: 'text-bayer-800',
    statBg: 'bg-bayer-300/70',
    backChip: 'bg-bayer-300/70 text-bayer-950 hover:bg-bayer-300',
    backChipRing: 'focus-visible:ring-bayer-700/40',
  },
  optional: {
    surface: 'bg-sandy-100',
    text: 'text-text-primary',
    body: 'text-text-secondary',
    titleResolved: 'text-text-secondary',
    arrowBg: 'bg-sandy-200',
    arrowFg: 'text-text-primary',
    accent: 'text-text-brand-dark',
    statBg: 'bg-sandy-200/70',
    backChip: 'bg-sandy-200/70 text-text-primary hover:bg-sandy-200',
    backChipRing: 'focus-visible:ring-sandy-600/40',
  },
}

const CompletenessCard = ({
  issue,
  resolution,
}: {
  issue: CompletenessIssue
  resolution: Resolution
}) => {
  const resolved = isResolved(resolution)
  const resolvedLabel = resolvedLabelFor(resolution)
  const tone = TIER_CARD[issue.tier]

  return (
    <Link
      to={`/data-upload/completeness/${issue.id}`}
      className={clsx(
        'group relative flex h-44 w-full flex-col gap-2 overflow-hidden rounded-xl px-5 py-4 text-left',
        'transition-all duration-200 ease-out will-change-transform',
        'shadow-none hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
        tone.surface,
        tone.text,
        resolved && 'opacity-70',
      )}
    >
      <p className="text-lg font-semibold leading-snug">{issue.title}</p>
      <p className={clsx('text-md leading-snug', tone.body)}>{issue.detail}</p>
      {resolvedLabel ? (
        <p
          className={clsx(
            'mt-1 text-sm font-semibold uppercase tracking-wide',
            tone.titleResolved,
          )}
        >
          {resolvedLabel}
        </p>
      ) : null}
      {/* Hover affordance — arrow fades in bottom-right, mirrors the card's
          tone so it's legible on both light and dark surfaces. */}
      <span
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute bottom-3 right-3 grid size-8 place-items-center rounded-full',
          'opacity-0 translate-y-1 transition-all duration-200 ease-out',
          'group-hover:opacity-100 group-hover:translate-y-0',
          tone.arrowBg,
          tone.arrowFg,
        )}
      >
        <IconArrowRight size={16} />
      </span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Detail page                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Headline stat shown next to Problem/Fix. Required issues frame as "needed
 * to complete your upload"; everything else frames as the (capped) quality
 * lift Sandy would apply if accepted, drawn from the `improvements` payload.
 */
const headlineStatFor = (
  issue: CompletenessIssue,
): { value: string; label: string } => {
  if (issue.tier === 'required') {
    return { value: 'Required', label: 'to complete your data upload' }
  }
  const totalRequired =
    issue.improvements
      ?.filter((i) => i.dimension === 'required')
      .reduce((acc, i) => acc + i.deltaPct, 0) ?? 0
  // Average across the leaves we touch so the headline reads as an org-level
  // delta rather than a raw sum.
  const leafCount = new Set(issue.improvements?.map((i) => i.nodeId)).size || 1
  const lift = Math.max(1, Math.round(totalRequired / leafCount))
  return {
    value: `+${lift}%`,
    label: 'improvement to your data quality',
  }
}

type PreviewRow = {
  id: string
  isNew: boolean
  [key: string]: string | boolean
}

/**
 * Flatten a CompletenessTable into rows the design-system DataTable can
 * render: existing rows patched with cell-level edits, then newly added
 * rows appended.
 */
const flattenTable = (table: CompletenessTable): PreviewRow[] => {
  const existing: PreviewRow[] = table.rows.map((row) => {
    const cells: Record<string, string> = { ...row.cells }
    for (const change of table.changes) {
      if (change.kind === 'add-cell' && change.rowId === row.id) {
        cells[change.column] = change.value
      } else if (change.kind === 'edit-cell' && change.rowId === row.id) {
        cells[change.column] = change.newValue
      }
    }
    return { id: row.id, isNew: false, ...cells }
  })
  const added: PreviewRow[] = table.changes
    .filter(
      (
        c,
      ): c is {
        kind: 'add-row'
        rowId: string
        cells: Record<string, string>
      } => c.kind === 'add-row',
    )
    .map((c) => ({ id: c.rowId, isNew: true, ...c.cells }))
  return [...existing, ...added]
}

const buildColumns = (table: CompletenessTable): GridColDef<PreviewRow>[] =>
  table.columns.map((col) => ({
    field: col.key,
    headerName: col.label,
    flex: 1,
    minWidth: 130,
    type: col.numeric ? 'number' : 'string',
    sortable: false,
    renderCell: ({ row }) => {
      const value = row[col.key]
      if (typeof value !== 'string' || value === '') {
        return <span className="text-text-secondary">—</span>
      }
      return (
        <span className={clsx(col.numeric && 'tabular-nums')}>{value}</span>
      )
    },
  }))

const PreviewTable = ({ table }: { table: CompletenessTable }) => {
  const rows = useMemo(() => flattenTable(table), [table])
  const columns = useMemo(() => buildColumns(table), [table])
  if (rows.length === 0) return null
  const newIds = new Set(rows.filter((r) => r.isNew).map((r) => r.id))
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-text-primary">{table.title}</h3>
      <DataTable<PreviewRow>
        rows={rows}
        columns={columns}
        selectable={false}
        defaultPageSize={25}
        pageSizeOptions={[25, 50, 100]}
        getRowClassName={({ row }) =>
          newIds.has(String(row.id)) ? 'row-issue-warning' : ''
        }
        className="border-2 border-border-tertiary"
      />
    </div>
  )
}

const CompletenessDetail = ({
  issue,
  resolution,
  onAccept,
  onSkip,
}: {
  issue: CompletenessIssue
  resolution: Resolution
  onAccept: () => void
  onSkip: () => void
}) => {
  const preview = issue.preview
  const problem =
    preview?.problem ??
    'Sandy spotted a gap in your records. Accepting fills it with an estimate.'
  const fix =
    preview?.fix ??
    'Sandy can use your data and information from your region to create highly accurate estimated imputed data.'
  const stat = headlineStatFor(issue)
  const resolvedLabel = resolvedLabelFor(resolution)
  const tone = TIER_CARD[issue.tier]
  // Tables that only add new rows get a "we'll create these new records"
  // framing; tables that patch existing rows get a plain title.
  const addsNewRows = preview?.tables.some((t) =>
    t.changes.some((c) => c.kind === 'add-row'),
  )

  return (
    <div className="flex flex-col gap-10 pb-24">
      {/* Full-bleed tier hero — the same surface colour the card used on the
          list view carries through, so the user keeps a visual through-line
          from "I picked the required card" to "I'm on the required page". */}
      <section className={clsx(tone.surface, tone.text)}>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-8 py-10">
          <div className="self-start">
            <Link
              to="/data-upload/completeness"
              className={clsx(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold',
                tone.backChip,
                'focus-visible:outline-none focus-visible:ring-2',
                tone.backChipRing,
              )}
            >
              <IconArrowLeft size={16} />
              Back to recommendations
            </Link>
          </div>
          <header className="flex flex-col gap-2">
            <h1
              className={clsx(
                'max-w-[820px] text-3xl font-semibold leading-tight',
                tone.text,
              )}
            >
              {issue.title}
            </h1>
            {resolvedLabel ? (
              <p
                className={clsx(
                  'text-sm font-semibold uppercase tracking-wide',
                  tone.accent,
                )}
              >
                {resolvedLabel}
              </p>
            ) : null}
          </header>

          {/* Problem · Fix · Stat — three columns reading left → right. */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <DetailColumn label="Problem" body={problem} tone={tone} />
            <DetailColumn label="Fix" body={fix} tone={tone} />
            <StatColumn value={stat.value} label={stat.label} tone={tone} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-8">
        {preview ? (
          <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-text-primary">
                {addsNewRows
                  ? "We'll create these new records"
                  : "We'll update these records"}
              </h2>
            </header>
            <div className="flex flex-col gap-8">
              {preview.tables.map((table) => (
                <PreviewTable key={table.title} table={table} />
              ))}
            </div>
          </section>
        ) : null}

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t-2 border-border-tertiary pt-6">
          <Button variant="secondary" onClick={onSkip}>
            Skip
          </Button>
          <Button variant="primary" onClick={onAccept}>
            Add data
          </Button>
        </footer>
      </div>
    </div>
  )
}

const DetailColumn = ({
  label,
  body,
  tone,
}: {
  label: string
  body: string
  tone: TierTone
}) => (
  <div className="flex flex-col gap-2">
    <p
      className={clsx(
        'text-xs font-semibold uppercase tracking-wide',
        tone.accent,
      )}
    >
      {label}
    </p>
    <p className={clsx('text-md leading-snug', tone.body)}>{body}</p>
  </div>
)

const StatColumn = ({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone: TierTone
}) => (
  <div className={clsx('flex flex-col gap-2 rounded-xl p-4', tone.statBg)}>
    <p
      className={clsx(
        'text-xs font-semibold uppercase tracking-wide',
        tone.accent,
      )}
    >
      Why this matters
    </p>
    <div className="flex flex-col gap-1">
      <span className={clsx('text-3xl font-semibold leading-none', tone.text)}>
        {value}
      </span>
      <span className={clsx('text-sm', tone.body)}>{label}</span>
    </div>
  </div>
)
