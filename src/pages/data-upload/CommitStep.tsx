import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge, Button, Card } from '../../components/ui'
import { FarmsTable, SummaryBar } from './SummaryCards'

/* -------------------------------------------------------------------------- */
/* Mock commit summary                                                         */
/* -------------------------------------------------------------------------- */

const COMMIT_SUMMARY = {
  totalRecords: 2_184,
  years: [2024, 2025, 2026],
  farms: { total: 4, unrecognised: 1 },
  fields: { total: 42, unrecognised: 3 },
  farmRows: [
    {
      id: 'farm-1',
      name: 'Brookside Leys',
      fieldCount: 14,
      enterprises: ['Arable'],
      cropTypes: ['Winter wheat', 'Spring barley', 'Oilseed rape'],
    },
    {
      id: 'farm-2',
      name: 'Foxglove Hill',
      fieldCount: 11,
      enterprises: ['Arable', 'Mixed'],
      cropTypes: ['Winter wheat', 'Grass ley'],
    },
    {
      id: 'farm-3',
      name: 'Amber Harvest Farm',
      fieldCount: 9,
      enterprises: ['Perennial'],
      cropTypes: ['Cider apples'],
    },
    {
      id: 'farm-4',
      name: 'Heron Lea',
      fieldCount: 8,
      enterprises: ['Permanent grassland'],
      cropTypes: ['Permanent pasture'],
    },
  ],
  confirmed: {
    count: 1_847,
    description:
      'Records you reviewed and confirmed as-is during the earlier steps.',
    samples: [
      'Winter wheat yield · Brookside Leys · 9.4 t/ha',
      'N application · Amber Harvest · 165 kgN/ha',
      'Soil sampling · Saltway · 2.3% SOC',
    ],
  },
  prefilled: {
    count: 218,
    description:
      'Records Sandy filled in for you. Each prefill was previewed before you accepted it.',
    samples: [
      'Slurry DM% defaulted to 6% on Saltway (NRM 2023 typical).',
      'Spring N split rebalanced 60/40 on Long Bottom.',
      'Compost N analysis filled from RB209 (12 fields).',
    ],
  },
  skipped: {
    count: 119,
    description:
      "Records you chose to skip. These won't be saved — you can come back and import them later.",
    samples: [
      '12 operations with future-dated applications.',
      '8 cropping records with no Sandy crop match.',
      'Working-area mismatches on 6 fields.',
    ],
  },
}

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const CommitStep = () => {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    // Fake the network round-trip. Real implementation would POST the
    // accepted/prefilled batch to the backend and then either navigate to
    // a confirmation route or surface an error.
    setTimeout(() => {
      setSaving(false)
      toast.success('Saved to Sandy', {
        description: `${(
          COMMIT_SUMMARY.confirmed.count + COMMIT_SUMMARY.prefilled.count
        ).toLocaleString()} records committed to your farm records.`,
      })
      navigate('/')
    }, 900)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold leading-9 text-text-primary">
          Commit
        </h2>
        <p className="text-md text-text-secondary max-w-2xl">
          Pre-commit summary showing exactly what will be saved — confirmed
          records, prefilled records and skipped items. Nothing in your live
          farm record changes until you press Save to Sandy.
        </p>
      </header>

      {/* Headline bar, reused from the Review step. */}
      <SummaryBar
        totalRecords={
          COMMIT_SUMMARY.confirmed.count + COMMIT_SUMMARY.prefilled.count
        }
        years={COMMIT_SUMMARY.years}
      />

      <FarmsTable farms={COMMIT_SUMMARY.farmRows} showWarnings={false} />

      {/* Confirmed / Prefilled / Skipped breakdown. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard
          tone="green"
          title="Confirmed records"
          count={COMMIT_SUMMARY.confirmed.count}
          description={COMMIT_SUMMARY.confirmed.description}
          samples={COMMIT_SUMMARY.confirmed.samples}
        />
        <BreakdownCard
          tone="green"
          title="Prefilled by Sandy"
          count={COMMIT_SUMMARY.prefilled.count}
          description={COMMIT_SUMMARY.prefilled.description}
          samples={COMMIT_SUMMARY.prefilled.samples}
        />
        <BreakdownCard
          tone="neutral"
          title="Skipped items"
          count={COMMIT_SUMMARY.skipped.count}
          description={COMMIT_SUMMARY.skipped.description}
          samples={COMMIT_SUMMARY.skipped.samples}
        />
      </div>

      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between bg-sandy-50">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-text-brand-dark">
            Ready to commit?
          </p>
          <p className="text-md text-text-secondary">
            {(
              COMMIT_SUMMARY.confirmed.count + COMMIT_SUMMARY.prefilled.count
            ).toLocaleString()}{' '}
            records will be saved to your live farm record.{' '}
            {COMMIT_SUMMARY.skipped.count.toLocaleString()} skipped items stay
            out.
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          Save to Sandy
        </Button>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Breakdown card                                                              */
/* -------------------------------------------------------------------------- */

const BreakdownCard = ({
  tone,
  title,
  count,
  description,
  samples,
}: {
  tone: 'green' | 'neutral'
  title: string
  count: number
  description: string
  samples: string[]
}) => (
  <Card className="flex flex-col gap-3">
    <header className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text-secondary">{title}</p>
        <p className="text-2xl font-semibold leading-9 text-text-primary tabular-nums">
          {count.toLocaleString()}
        </p>
      </div>
      <Badge tone={tone} size="sm">
        {tone === 'green' ? 'Will save' : "Won't save"}
      </Badge>
    </header>
    <p className="text-md text-text-secondary">{description}</p>
    <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
      {samples.map((line) => (
        <li key={line} className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-2 size-1 shrink-0 rounded-pill bg-text-secondary"
          />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  </Card>
)
