import clsx from 'clsx'
import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Badge,
  type BadgeTone,
  Card,
  Select,
  Tab,
  TabBar,
  Tabs,
} from '../../components/ui'
import { getFarm } from '../../data'

/* -------------------------------------------------------------------------- */
/* Filter state                                                                */
/* -------------------------------------------------------------------------- */

type Enterprise = 'arable' | 'perennial' | 'grassland'

const ENTERPRISE_TABS: { value: Enterprise; label: string }[] = [
  { value: 'arable', label: 'Arable' },
  { value: 'perennial', label: 'Perennial' },
  { value: 'grassland', label: 'Permanent grasslands' },
]

const YEARS = ['2026', '2025', '2024', '2023'] as const
type Year = (typeof YEARS)[number]

const isEnterprise = (v: string | null): v is Enterprise =>
  v === 'arable' || v === 'perennial' || v === 'grassland'

const isYear = (v: string | null): v is Year =>
  v !== null && (YEARS as readonly string[]).includes(v)

/* -------------------------------------------------------------------------- */
/* Confidence model                                                            */
/* -------------------------------------------------------------------------- */

type ConfidenceTier = 'high' | 'medium' | 'low'

const CONFIDENCE_LABEL: Record<ConfidenceTier, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const CONFIDENCE_TONE: Record<ConfidenceTier, BadgeTone> = {
  high: 'green',
  medium: 'orange',
  low: 'red',
}

const tierForCompleteness = (pct: number): ConfidenceTier => {
  if (pct >= 80) return 'high'
  if (pct >= 50) return 'medium'
  return 'low'
}

/* -------------------------------------------------------------------------- */
/* Data shape                                                                  */
/* -------------------------------------------------------------------------- */

type ServiceRow = {
  id: string
  name: string
  completeness: number
  nextAction: string
}

type Provenance = 'verified' | 'prefill' | 'imported' | 'missing'

const PROVENANCE_LABEL: Record<Provenance, string> = {
  verified: 'Verified',
  prefill: 'Sandy prefill',
  imported: 'Imported',
  missing: 'Missing',
}

const PROVENANCE_TONE: Record<Provenance, BadgeTone> = {
  verified: 'green',
  prefill: 'orange',
  imported: 'neutral',
  missing: 'red',
}

type InventoryItem = {
  id: string
  label: string
  count: string
  provenance: Provenance
}

type Snapshot = {
  services: ServiceRow[]
  inventory: InventoryItem[]
}

/* -------------------------------------------------------------------------- */
/* Mock data per enterprise / year                                             */
/* -------------------------------------------------------------------------- */

const SNAPSHOTS: Record<Enterprise, Snapshot> = {
  arable: {
    services: [
      {
        id: 'cropping',
        name: 'Cropping plan',
        completeness: 92,
        nextAction: 'Confirm variety for 3 winter wheat fields.',
      },
      {
        id: 'operations',
        name: 'Field operations',
        completeness: 71,
        nextAction: 'Fill in spring spray dates on Long Bottom.',
      },
      {
        id: 'inputs',
        name: 'Input applications',
        completeness: 64,
        nextAction: 'Add product codes for 12 fertiliser passes.',
      },
      {
        id: 'soil',
        name: 'Soil sampling',
        completeness: 48,
        nextAction: 'Upload 2025 lab results from NRM.',
      },
      {
        id: 'yield',
        name: 'Yield records',
        completeness: 35,
        nextAction: 'Connect Climate FieldView for combine data.',
      },
      {
        id: 'boundaries',
        name: 'Field boundaries',
        completeness: 100,
        nextAction: 'Up to date — re-check after RPA refresh.',
      },
    ],
    inventory: [
      { id: 'fields', label: 'Fields', count: '42', provenance: 'verified' },
      { id: 'crops', label: 'Crops', count: '6 types', provenance: 'verified' },
      {
        id: 'operations',
        label: 'Operations',
        count: '218',
        provenance: 'imported',
      },
      {
        id: 'products',
        label: 'Products',
        count: '34',
        provenance: 'prefill',
      },
      {
        id: 'yield',
        label: 'Yield',
        count: '11 of 42',
        provenance: 'missing',
      },
      {
        id: 'soil',
        label: 'Soil samples',
        count: '20',
        provenance: 'imported',
      },
    ],
  },
  perennial: {
    services: [
      {
        id: 'cropping',
        name: 'Orchard inventory',
        completeness: 80,
        nextAction: 'Confirm rootstock for 2 Cider apple blocks.',
      },
      {
        id: 'operations',
        name: 'Field operations',
        completeness: 55,
        nextAction: 'Add summer canopy management records.',
      },
      {
        id: 'inputs',
        name: 'Input applications',
        completeness: 60,
        nextAction: 'Map 4 fungicide products to UK register.',
      },
      {
        id: 'soil',
        name: 'Soil sampling',
        completeness: 30,
        nextAction: 'Schedule sampling for newly planted block.',
      },
      {
        id: 'yield',
        name: 'Yield records',
        completeness: 70,
        nextAction: 'Reconcile 2025 packhouse vs orchard totals.',
      },
      {
        id: 'boundaries',
        name: 'Block boundaries',
        completeness: 95,
        nextAction: 'Two blocks pending RPA update.',
      },
    ],
    inventory: [
      { id: 'blocks', label: 'Blocks', count: '8', provenance: 'verified' },
      {
        id: 'varieties',
        label: 'Varieties',
        count: '5',
        provenance: 'verified',
      },
      {
        id: 'operations',
        label: 'Operations',
        count: '92',
        provenance: 'imported',
      },
      {
        id: 'products',
        label: 'Products',
        count: '18',
        provenance: 'prefill',
      },
      {
        id: 'yield',
        label: 'Yield',
        count: '7 of 8',
        provenance: 'verified',
      },
      {
        id: 'soil',
        label: 'Soil samples',
        count: '4',
        provenance: 'missing',
      },
    ],
  },
  grassland: {
    services: [
      {
        id: 'cropping',
        name: 'Sward inventory',
        completeness: 88,
        nextAction: 'Confirm clover mix on 2 leys.',
      },
      {
        id: 'operations',
        name: 'Field operations',
        completeness: 62,
        nextAction: 'Fill in cutting dates for second silage cut.',
      },
      {
        id: 'inputs',
        name: 'Input applications',
        completeness: 45,
        nextAction: 'Add slurry DM% for 5 spring applications.',
      },
      {
        id: 'soil',
        name: 'Soil sampling',
        completeness: 38,
        nextAction: 'Upload pH results for 6 paddocks.',
      },
      {
        id: 'yield',
        name: 'Silage yields',
        completeness: 50,
        nextAction: 'Record 2025 second-cut tonnage.',
      },
      {
        id: 'boundaries',
        name: 'Field boundaries',
        completeness: 100,
        nextAction: 'Up to date.',
      },
    ],
    inventory: [
      {
        id: 'paddocks',
        label: 'Paddocks',
        count: '18',
        provenance: 'verified',
      },
      {
        id: 'swards',
        label: 'Sward types',
        count: '3',
        provenance: 'verified',
      },
      {
        id: 'operations',
        label: 'Operations',
        count: '64',
        provenance: 'imported',
      },
      {
        id: 'products',
        label: 'Products',
        count: '9',
        provenance: 'prefill',
      },
      {
        id: 'yield',
        label: 'Silage',
        count: '12 of 18',
        provenance: 'imported',
      },
      {
        id: 'soil',
        label: 'Soil samples',
        count: '6',
        provenance: 'missing',
      },
    ],
  },
}

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const FarmOverview = () => {
  const { farmId } = useParams<{ farmId: string }>()
  const farm = farmId ? getFarm(farmId) : undefined

  const [searchParams, setSearchParams] = useSearchParams()
  const enterprise: Enterprise = isEnterprise(searchParams.get('enterprise'))
    ? (searchParams.get('enterprise') as Enterprise)
    : 'arable'
  const year: Year = isYear(searchParams.get('year'))
    ? (searchParams.get('year') as Year)
    : '2025'

  const setEnterprise = (next: Enterprise) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'arable') p.delete('enterprise')
        else p.set('enterprise', next)
        return p
      },
      { replace: true },
    )
  }

  const setYear = (next: string | null) => {
    if (!next) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === '2025') p.delete('year')
        else p.set('year', next)
        return p
      },
      { replace: true },
    )
  }

  const snapshot = useMemo(() => SNAPSHOTS[enterprise], [enterprise])

  if (!farm) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[260px]">
          <Tabs<Enterprise> value={enterprise} onValueChange={setEnterprise}>
            <TabBar>
              {ENTERPRISE_TABS.map((t) => (
                <Tab key={t.value} value={t.value}>
                  {t.label}
                </Tab>
              ))}
            </TabBar>
          </Tabs>
        </div>
        <div className="w-[160px]">
          <Select
            aria-label="Reporting year"
            value={year}
            onValueChange={setYear}
            clearable={false}
            items={YEARS.map((y) => ({ value: y, label: y }))}
          />
        </div>
      </div>

      {/* Service completeness */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Service completeness
        </h2>
        <Card className="flex flex-col divide-y-2 divide-border-tertiary p-0">
          {snapshot.services.map((service) => (
            <ServiceRowItem key={service.id} service={service} />
          ))}
        </Card>
      </section>

      {/* Data inventory */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Data inventory
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {snapshot.inventory.map((item) => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Service completeness row                                                    */
/* -------------------------------------------------------------------------- */

const ServiceRowItem = ({ service }: { service: ServiceRow }) => {
  const tier = tierForCompleteness(service.completeness)
  return (
    <div className="grid grid-cols-1 items-center gap-3 px-5 py-4 lg:grid-cols-[180px_minmax(0,1fr)_120px_minmax(0,2fr)]">
      <p className="text-md font-semibold text-text-primary">{service.name}</p>

      <div className="flex items-center gap-3">
        <div className="relative h-2 flex-1 overflow-hidden rounded-pill bg-bg-tertiary">
          <span
            className={clsx(
              'absolute inset-y-0 left-0 rounded-pill',
              tier === 'high' && 'bg-bg-brand-primary',
              tier === 'medium' && 'bg-support-fg-amber',
              tier === 'low' && 'bg-support-fg-red',
            )}
            style={{ width: `${service.completeness}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-text-secondary w-[44px] text-right">
          {service.completeness}%
        </span>
      </div>

      <div>
        <Badge tone={CONFIDENCE_TONE[tier]} size="sm">
          {CONFIDENCE_LABEL[tier]} confidence
        </Badge>
      </div>

      <p className="text-sm text-text-secondary">{service.nextAction}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Data inventory card                                                         */
/* -------------------------------------------------------------------------- */

const InventoryCard = ({ item }: { item: InventoryItem }) => (
  <Card className="flex flex-col gap-2">
    <p className="text-sm font-semibold text-text-secondary">{item.label}</p>
    <p className="text-xl font-semibold leading-7 text-text-primary tabular-nums">
      {item.count}
    </p>
    <Badge tone={PROVENANCE_TONE[item.provenance]} size="sm">
      {PROVENANCE_LABEL[item.provenance]}
    </Badge>
  </Card>
)
