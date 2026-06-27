import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui'
import {
  areaOf,
  VALIDATION_AREA_LABEL,
  VALIDATION_AREA_ORDER,
  VALIDATION_ERRORS,
  VALIDATION_SCOPE_LABEL,
  VALIDATION_SEVERITY_LABEL,
  VALIDATION_TYPE_LABEL,
  type ValidationArea,
  type ValidationError,
  type ValidationSeverity,
  type ValidationType,
} from './validation-errors'

/* -------------------------------------------------------------------------- */
/* ValidationPage — categories rail + sidebar list + detail panel             */
/* -------------------------------------------------------------------------- */

const SEVERITY_TONE: Record<ValidationSeverity, 'red' | 'orange'> = {
  blocking: 'red',
  warning: 'orange',
}

const SeverityBadge = ({ severity }: { severity: ValidationSeverity }) => (
  <Badge tone={SEVERITY_TONE[severity]} size="sm">
    {VALIDATION_SEVERITY_LABEL[severity]}
  </Badge>
)

const TypeBadge = ({ type }: { type: ValidationType }) => (
  <Badge tone="neutral" size="sm">
    {VALIDATION_TYPE_LABEL[type]}
  </Badge>
)

/* -------------------------------------------------------------------------- */
/* Filter pills                                                                */
/* -------------------------------------------------------------------------- */

const FilterPills = <T extends string>({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: T[]
  value: T | 'all'
  onChange: (next: T | 'all') => void
  labelFor: (option: T) => string
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <PillButton
      active={value === 'all'}
      onClick={() => onChange('all')}
      label="All"
    />
    {options.map((option) => (
      <PillButton
        key={option}
        active={value === option}
        onClick={() => onChange(option)}
        label={labelFor(option)}
      />
    ))}
  </div>
)

const PillButton = ({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'inline-flex items-center rounded-full border-2 px-3 py-1 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      active
        ? 'border-button-primary bg-button-primary text-text-primary-inverse'
        : 'border-border-tertiary bg-bg-primary text-text-secondary hover:bg-bg-secondary',
    )}
  >
    {label}
  </button>
)

const ALL_TYPES = Object.keys(VALIDATION_TYPE_LABEL) as ValidationType[]
const ALL_SEVERITIES = Object.keys(
  VALIDATION_SEVERITY_LABEL,
) as ValidationSeverity[]

/* -------------------------------------------------------------------------- */
/* Categories rail (far left)                                                  */
/* -------------------------------------------------------------------------- */

const CategoriesRail = ({
  areas,
  active,
  countByArea,
  onSelect,
}: {
  areas: ValidationArea[]
  active: ValidationArea
  countByArea: Record<ValidationArea, number>
  onSelect: (next: ValidationArea) => void
}) => (
  <nav
    aria-label="Validation categories"
    className="flex w-[200px] shrink-0 flex-col border-r-2 border-border-tertiary bg-bg-primary"
  >
    <header className="border-b-2 border-border-tertiary px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Categories
      </p>
    </header>
    <ol className="flex flex-col gap-0.5 p-2">
      {areas.map((area) => {
        const count = countByArea[area]
        const isActive = area === active
        return (
          <li key={area}>
            <button
              type="button"
              onClick={() => onSelect(area)}
              aria-current={isActive ? 'true' : undefined}
              className={clsx(
                'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-md transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
                isActive
                  ? 'bg-sandy-100 font-medium text-text-brand-dark'
                  : 'text-text-primary hover:bg-bg-tertiary',
              )}
            >
              <span>{VALIDATION_AREA_LABEL[area]}</span>
              <span
                className={clsx(
                  'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                  isActive
                    ? 'bg-bg-primary text-text-brand-dark'
                    : 'bg-bg-tertiary text-text-secondary',
                )}
              >
                {count}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  </nav>
)

/* -------------------------------------------------------------------------- */
/* Sidebar list item                                                           */
/* -------------------------------------------------------------------------- */

type SidebarItemProps = {
  error: ValidationError
  active: boolean
  onSelect: () => void
}

const SidebarItem = ({ error, active, onSelect }: SidebarItemProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={active ? 'true' : undefined}
    className={clsx(
      'flex w-full flex-col items-start gap-1.5 rounded-lg border-2 px-3 py-3 text-left transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      active
        ? 'border-border-primary bg-bg-tertiary'
        : 'border-transparent bg-bg-primary hover:border-border-tertiary hover:bg-bg-secondary',
    )}
  >
    <span className="text-md font-medium leading-snug text-text-primary">
      {error.title}
    </span>
    <code className="font-mono text-xs text-text-secondary">{error.code}</code>
    <SeverityBadge severity={error.severity} />
  </button>
)

/* -------------------------------------------------------------------------- */
/* Detail panel                                                                */
/* -------------------------------------------------------------------------- */

const DetailRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {label}
    </span>
    {children}
  </div>
)

const DetailPanel = ({ error }: { error: ValidationError }) => (
  <article className="flex flex-col gap-6 rounded-xl bg-bg-primary p-6 shadow-sm">
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={error.severity} />
        <TypeBadge type={error.type} />
        <Badge tone="neutral" size="sm">
          {VALIDATION_SCOPE_LABEL[error.scope]}
        </Badge>
      </div>
      <h2 className="text-2xl font-semibold text-text-primary">
        {error.title}
      </h2>
      <code className="font-mono text-xs text-text-secondary">
        {error.code}
      </code>
    </header>

    <DetailRow label="UX copy">
      <p className="text-md leading-relaxed text-text-primary">
        {error.uxCopy}
      </p>
    </DetailRow>

    <DetailRow label="Message template">
      <code className="block whitespace-pre-wrap rounded-md border-2 border-border-tertiary bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary">
        {error.messageTemplate}
      </code>
    </DetailRow>

    <DetailRow label="Trigger">
      <p className="text-md leading-relaxed text-text-secondary">
        {error.trigger}
      </p>
    </DetailRow>

    {error.example ? (
      <DetailRow label="Example">
        <p className="text-md leading-relaxed text-text-secondary">
          {error.example}
        </p>
      </DetailRow>
    ) : null}

    <DetailRow label="Suggested actions">
      <div className="flex flex-wrap items-center gap-2">
        {error.actions.map((action) => (
          <Badge key={action.kind} tone="neutral" size="md">
            {action.label}
          </Badge>
        ))}
      </div>
    </DetailRow>

    {error.tags && error.tags.length > 0 ? (
      <DetailRow label="Tags">
        <div className="flex flex-wrap items-center gap-1.5">
          {error.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-bg-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      </DetailRow>
    ) : null}
  </article>
)

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export const ValidationErrorsPage = () => {
  // Counts per area drive the badges on the categories rail.
  const countByArea = useMemo(() => {
    const counts: Record<ValidationArea, number> = {
      refinement: 0,
      fixes: 0,
      completeness: 0,
      anomalies: 0,
    }
    for (const e of VALIDATION_ERRORS) counts[areaOf(e)] += 1
    return counts
  }, [])

  // Default to the first area that has any validations (Fixes, today).
  const [activeArea, setActiveArea] = useState<ValidationArea>(
    () =>
      VALIDATION_AREA_ORDER.find((a) => countByArea[a] > 0) ??
      VALIDATION_AREA_ORDER[0],
  )

  const [typeFilter, setTypeFilter] = useState<ValidationType | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<
    ValidationSeverity | 'all'
  >('all')

  const filtered = useMemo(
    () =>
      VALIDATION_ERRORS.filter((e) => {
        if (areaOf(e) !== activeArea) return false
        if (typeFilter !== 'all' && e.type !== typeFilter) return false
        if (severityFilter !== 'all' && e.severity !== severityFilter)
          return false
        return true
      }),
    [activeArea, typeFilter, severityFilter],
  )

  // Selection state — defaults to the first item in the (filtered) list.
  // When the active code falls out of the filter (e.g. user changed area),
  // snap to the new first item so the detail pane never shows a hidden
  // record.
  const [activeCode, setActiveCode] = useState<string>(
    () => filtered[0]?.code ?? '',
  )
  useEffect(() => {
    if (filtered.length === 0) return
    if (!filtered.some((e) => e.code === activeCode)) {
      setActiveCode(filtered[0].code)
    }
  }, [filtered, activeCode])

  const active = filtered.find((e) => e.code === activeCode)

  return (
    <div className="flex h-screen min-h-0 bg-bg-secondary">
      <CategoriesRail
        areas={VALIDATION_AREA_ORDER}
        active={activeArea}
        countByArea={countByArea}
        onSelect={setActiveArea}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <section className="flex flex-col gap-3 border-b-2 border-border-tertiary bg-bg-primary px-8 py-4">
          <header className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold text-text-primary">
              {VALIDATION_AREA_LABEL[activeArea]}
            </h1>
            <p className="text-sm text-text-secondary">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'validation' : 'validations'}
            </p>
          </header>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Validation type
            </span>
            <FilterPills
              options={ALL_TYPES}
              value={typeFilter}
              onChange={setTypeFilter}
              labelFor={(t) => VALIDATION_TYPE_LABEL[t]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Severity
            </span>
            <FilterPills
              options={ALL_SEVERITIES}
              value={severityFilter}
              onChange={setSeverityFilter}
              labelFor={(s) => VALIDATION_SEVERITY_LABEL[s]}
            />
          </div>
        </section>

        <div className="flex flex-1 min-h-0">
          <aside className="flex w-[340px] shrink-0 flex-col border-r-2 border-border-tertiary bg-bg-primary">
            <ol className="flex-1 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-sm text-text-secondary">
                  No validations defined in {VALIDATION_AREA_LABEL[activeArea]}{' '}
                  yet.
                </li>
              ) : (
                filtered.map((e) => (
                  <li key={e.code} className="py-0.5">
                    <SidebarItem
                      error={e}
                      active={e.code === active?.code}
                      onSelect={() => setActiveCode(e.code)}
                    />
                  </li>
                ))
              )}
            </ol>
          </aside>

          <main className="flex-1 overflow-y-auto px-8 py-8">
            {active ? (
              <div className="mx-auto w-full max-w-[820px]">
                <DetailPanel error={active} />
              </div>
            ) : (
              <p className="text-md text-text-secondary">
                No validations defined in {VALIDATION_AREA_LABEL[activeArea]}{' '}
                yet.
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
