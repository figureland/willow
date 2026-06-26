import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui'
import { AffectedRecordsModal } from './AffectedRecordsModal'
import { AFFECTED_RECORDS } from './affected-records'
import {
  ISSUE_DEFAULTS,
  type IssueCode,
  type IssueSeverity,
} from './row-issues'

/* -------------------------------------------------------------------------- */
/* FixIssuesPage — clone of the refine page for row-level validation issues   */
/* -------------------------------------------------------------------------- */

/**
 * Categories the 17 issue codes fall into. Mirrors the way Sandy's docs
 * group validation failures — attribute-level lives next to reference-table
 * checks, cross-field next to cross-area, cross-record on its own.
 */
type FixCategory = 'attribute' | 'cross-field' | 'cross-record'

const CATEGORY_LABEL: Record<FixCategory, string> = {
  attribute: 'Attribute values',
  'cross-field': 'Cross-field rules',
  'cross-record': 'Duplicates & references',
}

const CATEGORY_ORDER: FixCategory[] = [
  'attribute',
  'cross-field',
  'cross-record',
]

const CATEGORY_FOR_CODE: Record<IssueCode, FixCategory> = {
  // Attribute-level + reference-table
  'required-missing': 'attribute',
  'max-length-exceeded': 'attribute',
  'year-invalid': 'attribute',
  'date-invalid': 'attribute',
  'positive-int-required': 'attribute',
  'decimal-out-of-range': 'attribute',
  'crop-type-unknown': 'attribute',
  // Cross-field + cross-area
  'planting-after-harvest': 'cross-field',
  'harvest-gt-total': 'cross-field',
  'yield-zero': 'cross-field',
  'crop-area-exceeds-field': 'cross-field',
  // Cross-record
  'duplicate-cropping': 'cross-record',
  'duplicate-operation': 'cross-record',
  'duplicate-fertiliser': 'cross-record',
  'duplicate-farm': 'cross-record',
  'orphan-operation': 'cross-record',
  'deletion-not-allowed': 'cross-record',
}

/* -------------------------------------------------------------------------- */
/* Mock examples — one issue per code so the demo surfaces every type         */
/* -------------------------------------------------------------------------- */

type FixIssue = {
  id: string
  code: IssueCode
  severity: IssueSeverity
  /** Human headline shown on the card. */
  headline: string
  /** One-line context the user needs to make a decision. */
  context: string
  /** Suggested action label — what "Fix" does. */
  suggestion: string
}

const EXAMPLES: FixIssue[] = [
  // Attribute-level
  {
    id: 'ex-required-missing',
    code: 'required-missing',
    severity: ISSUE_DEFAULTS['required-missing'].severity,
    headline: 'Working area is missing on 4 cropping rows',
    context: 'Farm: Brookside Leys · Field: Millpond, Orchard Fold, +2',
    suggestion: 'Add a value or skip these rows',
  },
  {
    id: 'ex-max-length',
    code: 'max-length-exceeded',
    severity: ISSUE_DEFAULTS['max-length-exceeded'].severity,
    headline: 'Variety name exceeds 60 characters',
    context: '"Hereford Single Cross Late Variety Long Name…" · Field: Saltway',
    suggestion: 'Truncate to 60 characters',
  },
  {
    id: 'ex-year-invalid',
    code: 'year-invalid',
    severity: ISSUE_DEFAULTS['year-invalid'].severity,
    headline: 'Harvest year reads "20245"',
    context: 'Operation row op-12 · Field: Long Acre',
    suggestion: 'Set to 2024',
  },
  {
    id: 'ex-date-invalid',
    code: 'date-invalid',
    severity: ISSUE_DEFAULTS['date-invalid'].severity,
    headline: 'Planting date "31/02/2024" is not a real date',
    context: 'Cropping row crop-7 · Field: Stone Pightle',
    suggestion: 'Choose a valid date',
  },
  {
    id: 'ex-positive-int',
    code: 'positive-int-required',
    severity: ISSUE_DEFAULTS['positive-int-required'].severity,
    headline: 'Sampling depth is -15 cm',
    context: 'Soil sample soil-3 · Field: Mill Lane',
    suggestion: 'Set to 15 cm',
  },
  {
    id: 'ex-decimal-range',
    code: 'decimal-out-of-range',
    severity: ISSUE_DEFAULTS['decimal-out-of-range'].severity,
    headline: 'pH value 12.4 is outside the 3–10 range',
    context: 'Soil sample soil-9 · Field: Hayrick',
    suggestion: 'Re-check the lab reading',
  },
  {
    id: 'ex-crop-type-unknown',
    code: 'crop-type-unknown',
    severity: ISSUE_DEFAULTS['crop-type-unknown'].severity,
    headline: 'Crop type "Winter rapeseed" is not in the reference list',
    context: '6 cropping rows affected',
    suggestion: 'Map to "Winter oilseed rape"',
  },
  // Cross-field
  {
    id: 'ex-planting-after-harvest',
    code: 'planting-after-harvest',
    severity: ISSUE_DEFAULTS['planting-after-harvest'].severity,
    headline: 'Planting date (2024-10-12) is after harvest date (2024-08-21)',
    context: 'Cropping row crop-15 · Field: Top Meadow',
    suggestion: 'Swap the two dates',
  },
  {
    id: 'ex-harvest-gt-total',
    code: 'harvest-gt-total',
    severity: ISSUE_DEFAULTS['harvest-gt-total'].severity,
    headline: 'Harvest yield (24.1 t) is greater than total yield (22.0 t)',
    context: 'Cropping row crop-4 · Field: Spinney',
    suggestion: 'Reduce harvest yield',
  },
  {
    id: 'ex-yield-zero',
    code: 'yield-zero',
    severity: ISSUE_DEFAULTS['yield-zero'].severity,
    headline: 'Yield is recorded as 0 t/ha',
    context: '3 cropping rows on Foxglove Hill',
    suggestion: 'Confirm or supply a value',
  },
  {
    id: 'ex-crop-area',
    code: 'crop-area-exceeds-field',
    severity: ISSUE_DEFAULTS['crop-area-exceeds-field'].severity,
    headline: 'Crop area (32 ha) exceeds field area (28.4 ha)',
    context: 'Field: River Bend · Cropping row crop-19',
    suggestion: 'Cap at field area',
  },
  // Cross-record
  {
    id: 'ex-duplicate-cropping',
    code: 'duplicate-cropping',
    severity: ISSUE_DEFAULTS['duplicate-cropping'].severity,
    headline: '2 identical cropping records for Winter wheat · Marlpit · 2024',
    context: 'Sandy will block import until one is removed',
    suggestion: 'Keep one, drop the other',
  },
  {
    id: 'ex-duplicate-operation',
    code: 'duplicate-operation',
    severity: ISSUE_DEFAULTS['duplicate-operation'].severity,
    headline: 'Two fungicide applications recorded for the same date',
    context: 'Field: Old Barn Field · 2024-05-12',
    suggestion: 'Confirm both happened',
  },
  {
    id: 'ex-duplicate-fertiliser',
    code: 'duplicate-fertiliser',
    severity: ISSUE_DEFAULTS['duplicate-fertiliser'].severity,
    headline: "Duplicate Nitram application on Cobbett's Hollow",
    context: 'Two rows with the same product, rate, and date',
    suggestion: 'Confirm or de-duplicate',
  },
  {
    id: 'ex-duplicate-farm',
    code: 'duplicate-farm',
    severity: ISSUE_DEFAULTS['duplicate-farm'].severity,
    headline: 'Farm "Brookside Leys" already exists in Sandy',
    context: 'Imported as a new farm — should it merge?',
    suggestion: 'Merge with the existing farm',
  },
  {
    id: 'ex-orphan-operation',
    code: 'orphan-operation',
    severity: ISSUE_DEFAULTS['orphan-operation'].severity,
    headline: 'Operation has no matching cropping record',
    context: 'op-22 references CR-1183 which is not in this upload',
    suggestion: 'Attach to an existing cropping record',
  },
  {
    id: 'ex-deletion-not-allowed',
    code: 'deletion-not-allowed',
    severity: ISSUE_DEFAULTS['deletion-not-allowed'].severity,
    headline: 'Crop Protection records cannot be deleted via upload',
    context: 'op-31 · Field: Marlpit',
    suggestion: 'Remove the deletion from the file',
  },
]

/* -------------------------------------------------------------------------- */
/* Resolution state — scrappy: just "fixed" / "ignored" / "pending" per id    */
/* -------------------------------------------------------------------------- */

type Resolution = 'pending' | 'fixed' | 'ignored'

const isResolved = (r: Resolution) => r === 'fixed' || r === 'ignored'

/* -------------------------------------------------------------------------- */
/* Severity pill — small leading badge on each card                           */
/* -------------------------------------------------------------------------- */

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
}

const SeverityPill = ({ severity }: { severity: IssueSeverity }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      severity === 'blocking'
        ? 'bg-support-bg-red text-support-fg-red'
        : 'bg-support-bg-amber text-support-fg-amber',
    )}
  >
    {SEVERITY_LABEL[severity]}
  </span>
)

/** Leading status indicator on every card — empty box when pending, filled
 *  green check when resolved. Mirrors the inbox pattern on the refine page. */
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

/* -------------------------------------------------------------------------- */
/* IssueCard — compact / focused presentation, same shape as Refine            */
/* -------------------------------------------------------------------------- */

type FixIssueCardProps = {
  issue: FixIssue
  resolution: Resolution
  excluded: string[]
  isActive: boolean
  onFocus: () => void
  onCommit: (next: Resolution, excludedIds?: string[]) => void
}

const FixIssueCard = ({
  issue,
  resolution,
  excluded,
  isActive,
  onFocus,
  onCommit,
}: FixIssueCardProps) => {
  const records = AFFECTED_RECORDS[issue.id]
  const [modalOpen, setModalOpen] = useState(false)
  const resolved = isResolved(resolution)
  const resolvedLabel =
    resolution === 'fixed'
      ? 'Fixed'
      : resolution === 'ignored'
        ? 'Ignored'
        : null
  const affectedSummary = records
    ? `${records.before.length} ${records.before.length === 1 ? 'record' : 'records'} affected${
        excluded.length > 0 ? ` · ${excluded.length} excluded` : ''
      }`
    : null

  if (!isActive) {
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: also focusable via tab
      // biome-ignore lint/a11y/noStaticElementInteractions: card reads as a row
      <article
        onClick={onFocus}
        className={clsx(
          'group flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent bg-bg-primary p-5 shadow-sm transition-all duration-200',
          'hover:border-border-tertiary hover:shadow-md',
          resolved && 'opacity-70',
        )}
      >
        <StatusIndicator resolved={resolved} />
        <SeverityPill severity={issue.severity} />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-md font-medium text-text-primary">
            {issue.headline}
          </p>
          <p className="text-sm text-text-secondary">{issue.context}</p>
        </div>
        {resolvedLabel ? (
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-text-brand-dark">
            <span>{resolvedLabel}</span>
          </span>
        ) : null}
      </article>
    )
  }

  return (
    <article
      className={clsx(
        'relative flex flex-col gap-4 rounded-xl bg-bg-primary p-6 shadow-md transition-all duration-200',
        resolved && 'opacity-90',
      )}
    >
      <div className="flex items-start gap-3">
        <StatusIndicator resolved={resolved} />
        <SeverityPill severity={issue.severity} />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-lg font-medium leading-7 text-text-primary">
            {issue.headline}
          </p>
          <p className="text-sm text-text-secondary">{issue.context}</p>
          {affectedSummary ? (
            <p className="text-xs font-medium text-text-secondary">
              {affectedSummary}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={() =>
            records ? setModalOpen(true) : onCommit('fixed', excluded)
          }
          disabled={resolution === 'fixed'}
        >
          Resolve
        </Button>
        <Button
          variant="secondary"
          onClick={() => onCommit('ignored')}
          disabled={resolution === 'ignored'}
        >
          Ignore
        </Button>
        {resolvedLabel ? (
          <button
            type="button"
            onClick={() => onCommit('pending')}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-support-bg-green px-3 py-1 text-sm font-semibold text-text-brand-dark hover:bg-support-bg-green/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            <span>{resolvedLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Undo</span>
          </button>
        ) : null}
      </div>

      {records ? (
        <AffectedRecordsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={issue.headline}
          description={issue.suggestion}
          records={records}
          initialExcluded={excluded}
          onResolve={(excludedIds) => {
            setModalOpen(false)
            onCommit('fixed', excludedIds)
          }}
        />
      ) : null}
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* SectionStatus — right-side header element (mirrors Refine)                  */
/* -------------------------------------------------------------------------- */

const SectionTick = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className="shrink-0 text-support-fg-green"
  >
    <path
      d="M5 12.5l4.5 4.5L19 7"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SectionStatus = ({
  items,
  unresolvedCount,
  isOpen,
  onToggle,
}: {
  items: FixIssue[]
  unresolvedCount: number
  isOpen: boolean
  onToggle: () => void
}) => {
  if (items.length === 0) {
    return <span className="text-sm text-text-secondary">No issues</span>
  }
  if (unresolvedCount === 0) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
      >
        <SectionTick />
        <span>
          {items.length} {items.length === 1 ? 'issue' : 'issues'} resolved
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border-2 px-3 py-1.5 text-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
        isOpen
          ? 'border-border-tertiary bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
          : 'border-button-primary bg-button-primary text-text-primary-inverse hover:bg-button-primary-hover',
      )}
    >
      {isOpen ? 'Hide' : 'View'} {unresolvedCount}{' '}
      {unresolvedCount === 1 ? 'issue' : 'issues'}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export const FixIssuesPage = () => {
  const grouped = useMemo(() => {
    const buckets: Record<FixCategory, FixIssue[]> = {
      attribute: [],
      'cross-field': [],
      'cross-record': [],
    }
    for (const issue of EXAMPLES)
      buckets[CATEGORY_FOR_CODE[issue.code]].push(issue)
    return CATEGORY_ORDER.map((c) => [c, buckets[c]] as const)
  }, [])

  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({})
  const [excluded, setExcluded] = useState<Record<string, string[]>>({})
  const [openCategory, setOpenCategory] = useState<FixCategory | null>(
    'attribute',
  )
  const [activeId, setActiveId] = useState<string | null>(EXAMPLES[0].id)

  const resolutionOf = (id: string): Resolution => resolutions[id] ?? 'pending'
  const excludedOf = (id: string): string[] => excluded[id] ?? []

  const commitFor =
    (id: string) => (next: Resolution, excludedIds?: string[]) => {
      setResolutions((prev) => ({ ...prev, [id]: next }))
      if (excludedIds !== undefined) {
        setExcluded((prev) => ({ ...prev, [id]: excludedIds }))
      }
      if (next !== 'pending') {
        // Auto-advance to the next unresolved issue (scoped to the open section).
        const list = grouped.find(([c]) => c === openCategory)?.[1] ?? EXAMPLES
        const idx = list.findIndex((i) => i.id === id)
        for (let step = 1; step <= list.length; step++) {
          const candidate = list[(idx + step) % list.length]
          if (!isResolved(resolutionOf(candidate.id)) && candidate.id !== id) {
            setActiveId(candidate.id)
            return
          }
        }
      }
    }

  const totalUnresolved = EXAMPLES.filter(
    (i) => !isResolved(resolutionOf(i.id)),
  ).length

  return (
    <div className="relative mx-auto flex w-full max-w-[820px] flex-col gap-6 px-8 py-10 pb-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-text-primary">
          Fix issues in your data
        </h1>
        <p className="text-md text-text-secondary">
          Sandy found {EXAMPLES.length} issues across your upload. Blocking
          issues must be resolved before import; warnings can be acknowledged.
        </p>
      </header>

      {grouped.map(([category, items]) => {
        const isOpen = openCategory === category
        const unresolvedCount = items.filter(
          (i) => !isResolved(resolutionOf(i.id)),
        ).length
        return (
          <section
            key={category}
            className="flex flex-col gap-3 border-b-2 border-border-tertiary pb-6 last:border-0"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium text-text-secondary">
                {CATEGORY_LABEL[category]}
              </h2>
              <SectionStatus
                items={items}
                unresolvedCount={unresolvedCount}
                isOpen={isOpen}
                onToggle={() => setOpenCategory(isOpen ? null : category)}
              />
            </div>

            <div
              className={clsx(
                'flex flex-col gap-3 transition-all duration-200 ease-out',
                isOpen
                  ? 'opacity-100'
                  : 'pointer-events-none h-0 overflow-hidden opacity-0',
              )}
            >
              {items.map((issue) => (
                <FixIssueCard
                  key={issue.id}
                  issue={issue}
                  resolution={resolutionOf(issue.id)}
                  excluded={excludedOf(issue.id)}
                  isActive={activeId === issue.id}
                  onFocus={() => setActiveId(issue.id)}
                  onCommit={commitFor(issue.id)}
                />
              ))}
            </div>
          </section>
        )
      })}

      <div className="sticky bottom-4 z-10 flex justify-end">
        {totalUnresolved > 0 ? (
          <p className="rounded-lg bg-bg-tertiary px-4 py-2 text-sm font-semibold text-text-secondary">
            {totalUnresolved} {totalUnresolved === 1 ? 'issue' : 'issues'} still
            to review
          </p>
        ) : (
          <p className="rounded-lg bg-support-bg-green px-4 py-2 text-sm font-semibold text-text-brand-dark">
            All issues resolved
          </p>
        )}
      </div>
    </div>
  )
}
