import clsx from 'clsx'
import { Badge, Card, Tooltip } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Shared headline cards used by Review + Commit steps                         */
/* -------------------------------------------------------------------------- */

export type MatchStat = {
  unrecognised: number
  total: number
  /** Singular noun used in the headline + unrecognised line. */
  noun: string
}

const pluralise = (n: number, noun: string) => (n === 1 ? noun : `${noun}s`)

const MatchStatBlock = ({
  unrecognised,
  total,
  noun,
  showWarnings,
}: MatchStat & { showWarnings: boolean }) => (
  <div className="flex flex-1 flex-col gap-2">
    <p className="text-2xl font-semibold leading-9 text-text-primary">
      {total} {pluralise(total, noun)}
    </p>
    {showWarnings && unrecognised > 0 ? (
      <p className="text-md text-text-secondary">
        <Badge tone="red" size="sm">
          Action needed
        </Badge>{' '}
        <span className="pl-1">
          {unrecognised} unrecognised {pluralise(unrecognised, noun)}.
        </span>
      </p>
    ) : null}
    {showWarnings && unrecognised === 0 ? (
      <p className="text-md text-text-secondary">
        Every {noun} matched an existing record.
      </p>
    ) : null}
  </div>
)

export const FarmsFieldsCard = ({
  farms,
  fields,
  /**
   * Whether to surface the per-stat "Action needed" / "every X matched"
   * captions. Defaults to true — set false on the Commit step where every
   * mismatch has already been resolved.
   */
  showWarnings = true,
}: {
  farms: MatchStat
  fields: MatchStat
  showWarnings?: boolean
}) => (
  <Card className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">
    <MatchStatBlock {...farms} showWarnings={showWarnings} />
    <span
      aria-hidden="true"
      className="hidden w-px self-stretch bg-border-tertiary sm:block"
    />
    <MatchStatBlock {...fields} showWarnings={showWarnings} />
  </Card>
)

export const TotalRecordsCard = ({
  count,
  description,
}: {
  count: number
  description?: string
}) => (
  <Card className="flex flex-col gap-2">
    <p className="text-sm font-semibold text-text-secondary">Total records</p>
    <p className="text-2xl font-semibold leading-9 text-text-primary tabular-nums">
      {count.toLocaleString()}
    </p>
    <p className="text-md text-text-secondary">
      {description ??
        'Individual operations, observations and samples found across all uploaded files.'}
    </p>
  </Card>
)

/* -------------------------------------------------------------------------- */
/* Unified summary bar — all four stats in one Card with vertical dividers     */
/* -------------------------------------------------------------------------- */

export type SummaryBarProps = {
  totalRecords: number
  totalRecordsDescription?: string
  years: number[]
}

const SummaryBlock = ({
  eyebrow,
  value,
  caption,
  eyebrowClass,
  valueClass,
}: {
  eyebrow: string
  value: React.ReactNode
  caption: React.ReactNode
  eyebrowClass?: string
  valueClass?: string
}) => (
  <div className="flex flex-1 flex-col gap-2 min-w-0">
    <p
      className={`text-sm font-semibold ${eyebrowClass ?? 'text-text-secondary'}`}
    >
      {eyebrow}
    </p>
    <p
      className={`text-2xl font-semibold leading-9 ${valueClass ?? 'text-text-primary'}`}
    >
      {value}
    </p>
    <p className="text-md text-text-secondary">{caption}</p>
  </div>
)

const Divider = () => (
  <span
    aria-hidden="true"
    className="hidden w-px self-stretch bg-border-tertiary lg:block"
  />
)

export const SummaryBar = ({
  totalRecords,
  totalRecordsDescription,
  years,
}: SummaryBarProps) => (
  <Card className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
    <SummaryBlock
      eyebrow="Total records"
      value={
        <span className="tabular-nums">{totalRecords.toLocaleString()}</span>
      }
      caption={totalRecordsDescription ?? ''}
    />
    <Divider />

    {years.length > 0 ? (
      <SummaryBlock
        eyebrow="Years covered"
        value={years.map((year, i) => (
          <span key={year}>
            {year}
            {i < years.length - 1 ? (
              <span className="text-text-secondary">, </span>
            ) : null}
          </span>
        ))}
        caption={`${years.length} ${years.length === 1 ? 'season' : 'seasons'} of observed data.`}
        eyebrowClass="text-text-brand-dark"
        valueClass="text-text-brand-dark"
      />
    ) : (
      <SummaryBlock
        eyebrow="Years covered"
        value="No years detected"
        caption="We couldn't infer a reporting year from the uploaded files."
      />
    )}
  </Card>
)

/* -------------------------------------------------------------------------- */
/* Farms table — one row per farm with field count + optional warning          */
/* -------------------------------------------------------------------------- */

export type FarmRow = {
  id: string
  name: string
  /** Whether the farm exists in Sandy. Unrecognised farms paint red. */
  kind?: 'matched' | 'unrecognised'
  fieldCount: number
  /** Comma-joined enterprise labels active on this farm (e.g. ["Arable"]). */
  enterprises: string[]
  /** Comma-joined crop types found on this farm. */
  cropTypes: string[]
  /** Individual error descriptions. Length drives the count + tooltip. */
  errors?: string[]
}

export const FarmsTable = ({
  farms,
  showWarnings = true,
}: {
  farms: FarmRow[]
  showWarnings?: boolean
}) => (
  <Card className="flex flex-col gap-0 p-0 overflow-hidden">
    <header className="px-5 py-4 border-b-2 border-border-tertiary">
      <h3 className="text-lg font-semibold text-text-primary">
        {farms.length} {farms.length === 1 ? 'farm' : 'farms'}
      </h3>
    </header>
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-border-tertiary">
            <th className="px-5 py-2 text-left text-sm font-semibold text-text-secondary">
              Farm
            </th>
            <th className="px-5 py-2 text-left text-sm font-semibold text-text-secondary">
              Fields
            </th>
            <th className="px-5 py-2 text-left text-sm font-semibold text-text-secondary">
              Enterprises
            </th>
            <th className="px-5 py-2 text-left text-sm font-semibold text-text-secondary">
              Crop types
            </th>
            <th className="px-5 py-2 text-right text-sm font-semibold text-text-secondary">
              Things to fix
            </th>
          </tr>
        </thead>
        <tbody>
          {farms.map((farm) => {
            const isUnrecognised = showWarnings && farm.kind === 'unrecognised'
            const errorCount = farm.errors?.length ?? 0
            return (
              <tr
                key={farm.id}
                className={clsx(
                  'border-b-2 border-border-tertiary last:border-0',
                  isUnrecognised && 'bg-support-bg-red',
                )}
              >
                <td className="px-5 py-3 text-md font-medium text-text-primary">
                  <div className="flex flex-col gap-1">
                    <span className="truncate">{farm.name}</span>
                    {isUnrecognised ? (
                      <Badge tone="red" size="sm">
                        Farm not recognised
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-3 text-md tabular-nums text-text-secondary">
                  {farm.fieldCount}
                </td>
                <td className="px-5 py-3 text-md text-text-secondary">
                  <CountWithTooltip
                    items={farm.enterprises}
                    noun="enterprise"
                    plural="enterprises"
                  />
                </td>
                <td className="px-5 py-3 text-md text-text-secondary">
                  <CountWithTooltip
                    items={farm.cropTypes}
                    noun="crop type"
                    plural="crop types"
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  {showWarnings && errorCount > 0 ? (
                    <ThingsToFixCount errors={farm.errors ?? []} />
                  ) : (
                    <span className="text-md tabular-nums text-text-secondary">
                      0
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </Card>
)

export const YearsCard = ({ years }: { years: number[] }) => {
  if (years.length === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-secondary">
          Years covered
        </p>
        <p className="text-2xl font-semibold leading-9 text-text-primary">
          No years detected
        </p>
        <p className="text-md text-text-secondary">
          We couldn't infer a reporting year from the uploaded files.
        </p>
      </Card>
    )
  }
  return (
    <Card className="flex flex-col gap-2 bg-sandy-50">
      <p className="text-sm font-semibold text-text-brand-dark">
        Years covered
      </p>
      <p className="text-2xl font-semibold leading-9 text-text-brand-dark">
        {years.map((year, i) => (
          <span key={year}>
            {year}
            {i < years.length - 1 ? (
              <span className="text-text-secondary">, </span>
            ) : null}
          </span>
        ))}
      </p>
      <p className="text-md text-text-secondary">
        {years.length} {years.length === 1 ? 'season' : 'seasons'} of observed
        data.
      </p>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Count + tooltip (hover lists items, max 4 + "+N more")                      */
/* -------------------------------------------------------------------------- */

const MAX_VISIBLE_ITEMS = 4

/** Small info-i marker rendered next to a tooltip-bearing label. */
const InfoMark = ({ className }: { className?: string }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — tooltip wrapper owns the label
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M12 11V17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="7.75" r="1.1" fill="currentColor" />
  </svg>
)

const TooltipList = ({
  items,
  overflow,
}: {
  items: string[]
  overflow: number
}) => (
  <div className="flex flex-col gap-1">
    <ul className="flex flex-col gap-0.5 text-text-primary">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
    {overflow > 0 ? (
      <p className="text-text-secondary">+ {overflow} more</p>
    ) : null}
  </div>
)

const CountWithTooltip = ({
  items,
  noun,
  plural,
}: {
  items: string[]
  noun: string
  plural: string
}) => {
  if (items.length === 0) {
    return <span className="text-text-secondary">—</span>
  }
  const visible = items.slice(0, MAX_VISIBLE_ITEMS)
  const overflow = items.length - visible.length
  return (
    <Tooltip content={<TooltipList items={visible} overflow={overflow} />}>
      <span className="inline-flex cursor-help items-center gap-1.5 text-text-primary">
        <span>
          {items.length} {items.length === 1 ? noun : plural}
        </span>
        <InfoMark className="text-icon-secondary" />
      </span>
    </Tooltip>
  )
}

const ThingsToFixCount = ({ errors }: { errors: string[] }) => {
  const visible = errors.slice(0, MAX_VISIBLE_ITEMS)
  const overflow = errors.length - visible.length
  return (
    <Tooltip content={<TooltipList items={visible} overflow={overflow} />}>
      <span className="inline-flex cursor-help items-center gap-1.5 text-md font-semibold tabular-nums text-support-fg-red">
        {errors.length}
        <InfoMark className="text-support-fg-red" />
      </span>
    </Tooltip>
  )
}
