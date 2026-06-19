import { Badge, Card } from '../../components/ui'

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
