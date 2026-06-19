import clsx from 'clsx'
import { type ReactNode, useMemo } from 'react'
import { Badge, Card } from '../../components/ui'
import { FarmsFieldsCard, TotalRecordsCard, YearsCard } from './SummaryCards'

/* -------------------------------------------------------------------------- */
/* Mock detection results                                                      */
/* -------------------------------------------------------------------------- */

type DetectionSummary = {
  farms: { matched: number; unrecognised: number; total: number }
  fields: { matched: number; unrecognised: number; total: number }
  crops: { name: string; areaHa: number }[]
  operations: string[]
  soilSamples: number | null
  /** Discrete years observed in the data, ascending. */
  years: number[]
  /** Total individual records (operations, observations, samples, etc.) discovered. */
  totalRecords: number
}

const CROP_POOL = [
  'Winter wheat',
  'Oilseed rape',
  'Spring barley',
  'Grass ley',
  'Spring beans',
  'Winter oats',
  'Sugar beet',
  'Maize',
  'Permanent pasture',
  'Cover crop (clover)',
]

const OPERATION_POOL = [
  'Fertilization',
  'Seeding',
  'Defense + Fertilization',
  'Deep plowing',
  'Herbicides',
  'Pesticides',
  'Cultivation',
  'Drilling',
  'Spraying',
  'Harvest',
]

const pickRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const pickRandomCrops = (count: number) => {
  const shuffled = [...CROP_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map((name) => ({
    name,
    areaHa: pickRandomInt(15, 140),
  }))
}

const generateSummary = (): DetectionSummary => {
  const totalFarms = pickRandomInt(2, 6)
  const matchedFarms = pickRandomInt(1, totalFarms - 1)
  const unrecognisedFarms = totalFarms - matchedFarms

  const totalFields = pickRandomInt(18, 64)
  // Field matching usually trails farm matching — aim for ~70-95% matched.
  const matchedFields = Math.round(totalFields * (0.7 + Math.random() * 0.25))
  const unrecognisedFields = totalFields - matchedFields

  const crops = pickRandomCrops(pickRandomInt(4, 6)).sort(
    (a, b) => b.areaHa - a.areaHa,
  )

  const opsCount = pickRandomInt(4, OPERATION_POOL.length)
  const operations = [...OPERATION_POOL]
    .sort(() => Math.random() - 0.5)
    .slice(0, opsCount)

  // Soil sampling shows up about 70% of the time in the mock data.
  const soilSamples = Math.random() < 0.7 ? pickRandomInt(8, 120) : null

  const years = [2024, 2025, 2026]
  // Plausible record count: a handful per (field × year × operation), plus
  // the soil samples. Lands in the low-thousands for typical uploads.
  const totalRecords =
    totalFields * years.length * operations.length * pickRandomInt(2, 5) +
    (soilSamples ?? 0)

  return {
    farms: {
      matched: matchedFarms,
      unrecognised: unrecognisedFarms,
      total: totalFarms,
    },
    fields: {
      matched: matchedFields,
      unrecognised: unrecognisedFields,
      total: totalFields,
    },
    crops,
    operations,
    soilSamples,
    years,
    totalRecords,
  }
}

/* -------------------------------------------------------------------------- */
/* Shared panel chrome                                                         */
/* -------------------------------------------------------------------------- */

const SectionHeader = ({
  title,
  trailing,
}: {
  title: string
  trailing?: ReactNode
}) => (
  <header className="flex items-start justify-between gap-4">
    <h3 className="text-2xl font-semibold leading-9 text-text-primary">
      {title}
    </h3>
    {trailing ? <div className="shrink-0">{trailing}</div> : null}
  </header>
)

/* -------------------------------------------------------------------------- */
/* Crops card with minimal distribution bar                                    */
/* -------------------------------------------------------------------------- */

const CROP_PALETTE = [
  'bg-sandy-600',
  'bg-sandy-400',
  'bg-bayer-600',
  'bg-bayer-400',
  'bg-amber-600',
  'bg-orange-600',
]

const CropsCard = ({ crops }: { crops: DetectionSummary['crops'] }) => {
  const totalArea = crops.reduce((acc, c) => acc + c.areaHa, 0)
  return (
    <Card className="flex flex-col gap-4">
      <SectionHeader
        title={`${crops.length} crop types`}
        trailing={
          <span className="text-md font-semibold tabular-nums text-text-secondary">
            {Math.round(totalArea)} HA
          </span>
        }
      />

      {/* Minimal stacked-bar chart — each crop's slice is sized by its share */}
      <div
        aria-hidden="true"
        className="flex h-3 w-full overflow-hidden rounded-pill bg-bg-tertiary"
      >
        {crops.map((crop, i) => (
          <span
            key={crop.name}
            className={clsx('h-full', CROP_PALETTE[i % CROP_PALETTE.length])}
            style={{ width: `${(crop.areaHa / totalArea) * 100}%` }}
          />
        ))}
      </div>

      <ul className="flex flex-col divide-y-2 divide-border-tertiary">
        {crops.map((crop, i) => {
          const share = Math.round((crop.areaHa / totalArea) * 100)
          return (
            <li
              key={crop.name}
              className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'size-3 shrink-0 rounded-sm',
                  CROP_PALETTE[i % CROP_PALETTE.length],
                )}
              />
              <span className="flex-1 truncate text-md font-medium text-text-primary">
                {crop.name}
              </span>
              <span className="text-sm tabular-nums text-text-secondary">
                {crop.areaHa} HA · {share}%
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Operations / soil sampling / years cards                                    */
/* -------------------------------------------------------------------------- */

const OperationsCard = ({ operations }: { operations: string[] }) => (
  <Card className="flex flex-col gap-4">
    <SectionHeader title={`${operations.length} operation types`} />
    <ul className="flex flex-wrap gap-2">
      {operations.map((op) => (
        <li key={op}>
          <Badge tone="neutral" size="md">
            {op}
          </Badge>
        </li>
      ))}
    </ul>
  </Card>
)

const SoilSamplingCard = ({ count }: { count: number | null }) => (
  <Card className="flex flex-col gap-3">
    <SectionHeader
      title={
        count === null
          ? 'No soil sampling records'
          : `${count} soil sampling records`
      }
    />
    {count === null ? (
      <p className="text-md text-text-secondary">
        No soil sampling records were detected in this upload.
      </p>
    ) : (
      <p className="text-md text-text-secondary">
        Linked to fields across the dataset.
      </p>
    )}
  </Card>
)

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const ReviewStep = () => {
  // Generate the summary once per mount so re-renders don't reshuffle the
  // numbers on every keystroke / state change.
  const summary = useMemo(() => generateSummary(), [])

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold leading-9 text-text-primary">
        What we found in your data
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <TotalRecordsCard count={summary.totalRecords} />
        <YearsCard years={summary.years} />
        <FarmsFieldsCard
          farms={{
            noun: 'farm',
            unrecognised: summary.farms.unrecognised,
            total: summary.farms.total,
          }}
          fields={{
            noun: 'field',
            unrecognised: summary.fields.unrecognised,
            total: summary.fields.total,
          }}
        />
      </div>

      {/* Crops / Operations / Soil sampling share a 7-col row in a 3:2:2 split */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-7">
        <div className="xl:col-span-3">
          <CropsCard crops={summary.crops} />
        </div>
        <div className="xl:col-span-2">
          <OperationsCard operations={summary.operations} />
        </div>
        <div className="xl:col-span-2">
          <SoilSamplingCard count={summary.soilSamples} />
        </div>
      </div>
    </div>
  )
}
