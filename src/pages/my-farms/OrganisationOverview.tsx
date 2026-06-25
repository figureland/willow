import { Link, useParams } from 'react-router-dom'
import { Badge, type BadgeTone, Card } from '../../components/ui'
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

/** Per-service readiness chip. Uses the design-system `<Badge>` with the
 *  tier-tone mapping so it stays visually paired with the average-score
 *  badge at the row end and elsewhere on the page. */
const ScoreTile = ({ score }: { score: number }) => (
  <Badge tone={TIER_BADGE[tierForScore(score)]} size="sm">
    <span className="tabular-nums">{score}%</span>
  </Badge>
)
