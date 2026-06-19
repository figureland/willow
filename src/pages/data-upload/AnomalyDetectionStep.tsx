import clsx from 'clsx'
import { Badge, Card } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

type AnomalyMetric = {
  id: string
  /** Short, conversational headline shown on the card. */
  label: string
  /** Unit string for value formatting (e.g. "t/ha", "kgN/ha"). */
  unit: string
  /** Brief sentence shown beneath the metric label. */
  description: string
  /** Inclusive [min, max] of the typical range for this region/enterprise. */
  typicalRange: [number, number]
  /** Headline regional average — drawn as a tick on the chart. */
  regionalAverage: number
  /** Absolute axis bounds for the chart (a touch wider than the range). */
  axisRange: [number, number]
  /** Farm-level samples to plot against the range. */
  samples: AnomalySample[]
}

type AnomalySample = {
  id: string
  farmName: string
  value: number
}

const METRICS: AnomalyMetric[] = [
  {
    id: 'yield-winter-wheat',
    label: 'How does your winter wheat yield compare?',
    unit: 't/ha',
    description:
      'Comparing your reported yields against typical winter wheat farms in your region.',
    typicalRange: [7.5, 11.5],
    regionalAverage: 9.4,
    axisRange: [4, 16],
    samples: [
      { id: 'a-1', farmName: 'Brookside Leys', value: 9.4 },
      { id: 'a-2', farmName: 'Foxglove Hill', value: 5.2 },
      { id: 'a-3', farmName: 'Amber Harvest', value: 14.6 },
      { id: 'a-4', farmName: 'Heron Lea', value: 8.7 },
    ],
  },
  {
    id: 'nitrogen-application',
    label: 'Is your nitrogen use about right?',
    unit: 'kgN/ha',
    description:
      'Seasonal nitrogen totals across the rotation. Values far outside the typical band sometimes point to a unit mix-up.',
    typicalRange: [140, 250],
    regionalAverage: 195,
    axisRange: [40, 360],
    samples: [
      { id: 'b-1', farmName: 'Brookside Leys', value: 198 },
      { id: 'b-2', farmName: 'Foxglove Hill', value: 312 },
      { id: 'b-3', farmName: 'Amber Harvest', value: 165 },
      { id: 'b-4', farmName: 'Heron Lea', value: 72 },
    ],
  },
  {
    id: 'soc',
    label: 'How healthy is your soil carbon?',
    unit: '% SOC',
    description:
      'Topsoil organic carbon, compared to similar soils in the region. Very low values are worth a sampling-depth check.',
    typicalRange: [1.6, 3.4],
    regionalAverage: 2.5,
    axisRange: [0.5, 5.5],
    samples: [
      { id: 'c-1', farmName: 'Brookside Leys', value: 2.3 },
      { id: 'c-2', farmName: 'Foxglove Hill', value: 0.9 },
      { id: 'c-3', farmName: 'Amber Harvest', value: 3.1 },
      { id: 'c-4', farmName: 'Heron Lea', value: 4.7 },
    ],
  },
]

const isOutlier = (value: number, [lo, hi]: [number, number]) =>
  value < lo || value > hi

const positionPct = (value: number, [lo, hi]: [number, number]) => {
  const t = (value - lo) / (hi - lo)
  return Math.max(0, Math.min(1, t)) * 100
}

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const AnomalyDetectionStep = () => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold leading-9 text-text-primary">
        Anomaly detection
      </h2>
      <p className="text-md text-text-secondary max-w-2xl">
        A quick sanity check against the typical range for your region. Sandy
        flags values that look unusual so you can decide whether anything needs
        a second look — not to make decisions on your behalf.
      </p>
    </div>

    <div className="flex flex-col gap-4">
      {METRICS.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Metric card                                                                 */
/* -------------------------------------------------------------------------- */

const MetricCard = ({ metric }: { metric: AnomalyMetric }) => {
  const outlierCount = metric.samples.filter((s) =>
    isOutlier(s.value, metric.typicalRange),
  ).length

  return (
    <Card className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-text-primary">
            {metric.label}
          </h3>
          <p className="text-sm text-text-secondary max-w-2xl">
            {metric.description}
          </p>
        </div>
        <Badge tone={outlierCount > 0 ? 'orange' : 'green'} size="sm">
          {outlierCount > 0
            ? `${outlierCount} outlier${outlierCount === 1 ? '' : 's'}`
            : 'All in range'}
        </Badge>
      </header>

      <DistributionChart metric={metric} />
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Distribution chart                                                          */
/* -------------------------------------------------------------------------- */

const DistributionChart = ({ metric }: { metric: AnomalyMetric }) => {
  const [lo, hi] = metric.typicalRange
  const left = positionPct(lo, metric.axisRange)
  const right = positionPct(hi, metric.axisRange)
  const width = right - left
  const avgX = positionPct(metric.regionalAverage, metric.axisRange)

  // Distribute farm labels above / below the line so they don't collide. Sort
  // by axis position so neighbours alternate sides predictably.
  const positioned: (AnomalySample & { x: number; side: 'above' | 'below' })[] =
    metric.samples
      .map((s) => ({ ...s, x: positionPct(s.value, metric.axisRange) }))
      .sort((a, b) => a.x - b.x)
      .map((s, i) => ({ ...s, side: i % 2 === 0 ? 'above' : 'below' }))

  return (
    <div className="flex flex-col gap-3">
      {/* Distribution */}
      <div className="relative h-[140px] w-full">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-pill bg-bg-tertiary" />
        {/* Typical-range band */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-pill bg-sandy-200"
          style={{ left: `${left}%`, width: `${width}%` }}
        />

        {/* Regional-average tick — taller than the dots, centred */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: `${avgX}%` }}
        >
          <span className="h-8 w-0.5 rounded-sm bg-text-primary" />
        </div>
        <div
          className="absolute -translate-x-1/2 top-1/2 mt-5 flex flex-col items-center gap-0.5 whitespace-nowrap"
          style={{ left: `${avgX}%` }}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Regional average
          </span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">
            {metric.regionalAverage} {metric.unit}
          </span>
        </div>

        {/* Sample markers */}
        {positioned.map((s) => {
          const flagged = isOutlier(s.value, metric.typicalRange)
          return (
            <FarmMarker
              key={s.id}
              x={s.x}
              side={s.side}
              farmName={s.farmName}
              value={s.value}
              unit={metric.unit}
              flagged={flagged}
            />
          )
        })}
      </div>

      {/* Axis end labels + typical-range key */}
      <div className="flex justify-between text-xs font-medium tabular-nums text-text-secondary">
        <span>
          {metric.axisRange[0]} {metric.unit}
        </span>
        <span>
          Typical {lo}–{hi} {metric.unit}
        </span>
        <span>
          {metric.axisRange[1]} {metric.unit}
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Farm marker                                                                 */
/* -------------------------------------------------------------------------- */

const FarmMarker = ({
  x,
  side,
  farmName,
  value,
  unit,
  flagged,
}: {
  x: number
  side: 'above' | 'below'
  farmName: string
  value: number
  unit: string
  flagged: boolean
}) => {
  const lineColour = flagged ? 'bg-support-fg-amber' : 'bg-bg-brand-primary'
  const dotColour = flagged ? 'bg-support-fg-amber' : 'bg-bg-brand-primary'
  const valueColour = flagged ? 'text-support-fg-amber' : 'text-text-secondary'

  return (
    <>
      {/* Dot — sits on the line. */}
      <span
        role="img"
        aria-label={`${farmName}: ${value} ${unit}`}
        className={clsx(
          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3.5 rounded-pill border-2 border-bg-primary',
          dotColour,
        )}
        style={{ left: `${x}%` }}
      />

      {/* Label — anchored to the line edge, growing outwards. */}
      <div
        className={clsx(
          'absolute -translate-x-1/2 flex flex-col items-center whitespace-nowrap pointer-events-none',
          side === 'above' ? 'bottom-1/2 mb-2 gap-0.5' : 'top-1/2 mt-2 gap-0.5',
        )}
        style={{ left: `${x}%` }}
      >
        {side === 'above' ? (
          <>
            <span className="text-sm font-semibold text-text-primary">
              {farmName}
            </span>
            <span
              className={clsx(
                'text-xs font-semibold tabular-nums',
                valueColour,
              )}
            >
              {value} {unit}
            </span>
            <span aria-hidden="true" className={clsx('h-3 w-px', lineColour)} />
          </>
        ) : (
          <>
            <span aria-hidden="true" className={clsx('h-3 w-px', lineColour)} />
            <span className="text-sm font-semibold text-text-primary">
              {farmName}
            </span>
            <span
              className={clsx(
                'text-xs font-semibold tabular-nums',
                valueColour,
              )}
            >
              {value} {unit}
            </span>
          </>
        )}
      </div>
    </>
  )
}
