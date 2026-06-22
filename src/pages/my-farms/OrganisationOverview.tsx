import clsx from 'clsx'
import { Link, useParams } from 'react-router-dom'
import { Badge, type BadgeTone, Button, Card } from '../../components/ui'
import { getFarmsForOrganisation, getOrganisation } from '../../data'

/* -------------------------------------------------------------------------- */
/* Service taxonomy                                                            */
/* -------------------------------------------------------------------------- */

const SERVICES = [
  { id: 'carbon', label: 'Carbon' },
  { id: 'water-n', label: 'Water & N' },
  { id: 'soil', label: 'Soil health' },
  { id: 'biodiversity', label: 'Biodiversity' },
  { id: 'ncvm', label: 'NCVM' },
] as const

type ServiceId = (typeof SERVICES)[number]['id']

/* -------------------------------------------------------------------------- */
/* Readiness tier                                                              */
/* -------------------------------------------------------------------------- */

type Tier = 'green' | 'amber' | 'red'

const tierForScore = (pct: number): Tier => {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

const TIER_TILE: Record<Tier, string> = {
  green: 'bg-support-bg-green text-text-brand-dark',
  amber: 'bg-support-bg-amber text-support-fg-amber',
  red: 'bg-support-bg-red text-support-fg-red',
}

const TIER_BADGE: Record<Tier, BadgeTone> = {
  green: 'green',
  amber: 'orange',
  red: 'red',
}

/* -------------------------------------------------------------------------- */
/* Mock portfolio snapshot                                                     */
/* -------------------------------------------------------------------------- */

type FarmRow = {
  farmId: string
  scores: Record<ServiceId, number>
}

const FARM_SCORES: Record<string, Record<ServiceId, number>> = {
  'farm-brookside-leys': {
    carbon: 84,
    'water-n': 72,
    soil: 58,
    biodiversity: 41,
    ncvm: 66,
  },
  'farm-foxglove-hill': {
    carbon: 62,
    'water-n': 48,
    soil: 71,
    biodiversity: 32,
    ncvm: 55,
  },
  'farm-amber-harvest': {
    carbon: 92,
    'water-n': 81,
    soil: 88,
    biodiversity: 76,
    ncvm: 89,
  },
}

type AttentionAction = {
  id: string
  /** Farm + service context shown as an eyebrow. */
  context: string
  /** Plain-language "do this to get that" copy. */
  copy: string
  /** Short impact tag — drives the right-aligned badge. */
  impact: string
  /** CTA label + destination. */
  ctaLabel: string
  ctaHref: string
}

const ATTENTION_ACTIONS: AttentionAction[] = [
  {
    id: 'a-1',
    context: 'Foxglove Hill · Water & N',
    copy: 'Add your fertiliser operations to understand whether nitrogen inefficiency is driving this cost hotspot.',
    impact: 'Lifts Water & N from 48 → 71',
    ctaLabel: 'Add operations',
    ctaHref: '/my-farms',
  },
  {
    id: 'a-2',
    context: 'Brookside Leys · Carbon',
    copy: 'Confirming soil type on Field 7 would raise your Carbon confidence from initial estimate to Directional.',
    impact: 'Carbon confidence + 1 tier',
    ctaLabel: 'Confirm soil type',
    ctaHref: '/my-farms',
  },
  {
    id: 'a-3',
    context: 'Foxglove Hill · Biodiversity',
    copy: 'Map your hedgerow lengths and Sandy can score Biodiversity for this farm for the first time.',
    impact: 'Unlocks Biodiversity score',
    ctaLabel: 'Map hedgerows',
    ctaHref: '/my-farms',
  },
  {
    id: 'a-4',
    context: 'Brookside Leys · Soil health',
    copy: 'Upload your 2025 NRM sample results to move 6 fields from prefilled estimates to verified.',
    impact: 'Soil health 58 → 78',
    ctaLabel: 'Upload samples',
    ctaHref: '/my-farms',
  },
]

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export const OrganisationOverview = () => {
  const { orgId } = useParams<{ orgId: string }>()
  if (!orgId) return null

  const organisation = getOrganisation(orgId)
  if (!organisation) {
    return (
      <Card>
        <p className="text-text-secondary">Organisation not found.</p>
      </Card>
    )
  }

  const farms = getFarmsForOrganisation(orgId)
  const rows: (FarmRow & { farmName: string; avg: number })[] = farms.map(
    (farm) => {
      const scores = FARM_SCORES[farm.id] ?? {
        carbon: 50,
        'water-n': 50,
        soil: 50,
        biodiversity: 50,
        ncvm: 50,
      }
      const values = Object.values(scores)
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      return { farmId: farm.id, farmName: farm.name, scores, avg }
    },
  )

  const portfolioAvg = rows.length
    ? Math.round(rows.reduce((acc, r) => acc + r.avg, 0) / rows.length)
    : 0
  const blockingCount = rows.filter((r) =>
    Object.values(r.scores).some((s) => s < 50),
  ).length
  const reportReadyCount = rows.filter((r) => r.avg >= 80).length

  return (
    <div className="flex flex-col gap-6">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Farms" value={rows.length.toString()} />
        <StatCard label="Average completeness" value={`${portfolioAvg}%`} />
        <StatCard
          label="Needing attention"
          value={blockingCount.toString()}
          tone={blockingCount > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Report-ready"
          value={reportReadyCount.toString()}
          tone={reportReadyCount === rows.length ? 'green' : 'neutral'}
        />
      </div>

      {/* Completeness matrix */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Completeness matrix
        </h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border-tertiary">
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                  Farm
                </th>
                {SERVICES.map((s) => (
                  <th
                    key={s.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    {s.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-sm font-semibold text-text-secondary">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.farmId}
                  className="border-b-2 border-border-tertiary last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/my-farms/${orgId}/${row.farmId}`}
                      className="text-md font-semibold text-text-primary hover:text-text-brand"
                    >
                      {row.farmName}
                    </Link>
                  </td>
                  {SERVICES.map((s) => (
                    <td key={s.id} className="px-4 py-3">
                      <ScoreTile score={row.scores[s.id]} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <Badge tone={TIER_BADGE[tierForScore(row.avg)]} size="sm">
                      {row.avg}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Attention queue */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Attention queue
        </h2>
        <Card className="flex flex-col divide-y-2 divide-border-tertiary p-0">
          {ATTENTION_ACTIONS.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </Card>
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Headline stat                                                               */
/* -------------------------------------------------------------------------- */

const StatCard = ({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: BadgeTone
}) => (
  <Card className="flex flex-col gap-2">
    <p className="text-sm font-semibold text-text-secondary">{label}</p>
    <p className="text-2xl font-semibold leading-9 text-text-primary tabular-nums">
      {value}
    </p>
    {tone !== 'neutral' ? (
      <Badge tone={tone} size="sm">
        {tone === 'red' ? 'Action needed' : 'On track'}
      </Badge>
    ) : null}
  </Card>
)

/* -------------------------------------------------------------------------- */
/* Score tile                                                                  */
/* -------------------------------------------------------------------------- */

const ScoreTile = ({ score }: { score: number }) => {
  const tier = tierForScore(score)
  return (
    <span
      className={clsx(
        'inline-flex h-8 min-w-[56px] items-center justify-center rounded-md text-sm font-semibold tabular-nums',
        TIER_TILE[tier],
      )}
    >
      {score}%
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Attention queue row                                                         */
/* -------------------------------------------------------------------------- */

const ActionRow = ({ action }: { action: AttentionAction }) => (
  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
    <div className="flex flex-1 flex-col gap-1 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
        {action.context}
      </p>
      <p className="text-md text-text-primary">{action.copy}</p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <Badge tone="green" size="sm">
        {action.impact}
      </Badge>
      <Link to={action.ctaHref}>
        <Button variant="secondary">{action.ctaLabel}</Button>
      </Link>
    </div>
  </div>
)
