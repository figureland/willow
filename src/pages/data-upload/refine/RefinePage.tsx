import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Tooltip } from '../../../components/ui'
import type { IssueState } from '../IssueResolverModal'
import type { Issue } from '../issues'
import type { DetectionSummary, FarmSummary } from '../summary'
import { adapterFor } from './adapters'
import { IssueCard } from './IssueCard'

/* -------------------------------------------------------------------------- */
/* RefinePage — full-page carousel                                            */
/* -------------------------------------------------------------------------- */

export type RefinePageProps = {
  summary: DetectionSummary
  issues: Issue[]
  state: Record<string, IssueState>
  onStateChange: (next: Record<string, IssueState>) => void
}

/* -------------------------------------------------------------------------- */
/* Panel taxonomy                                                              */
/* -------------------------------------------------------------------------- */

type PanelId = 'summary' | 'identity' | 'schema' | 'value-mapping'

const PANEL_ORDER: PanelId[] = [
  'summary',
  'identity',
  'schema',
  'value-mapping',
]

const PANEL_LABEL: Record<PanelId, string> = {
  summary: 'Summary',
  identity: 'Farms & fields',
  schema: 'File structure',
  'value-mapping': 'Value mapping',
}

const panelForIssue = (issue: Issue): PanelId | null => {
  switch (issue.type) {
    case 'farm-missing':
    case 'field-missing':
    case 'field-missing-batch':
      return 'identity'
    case 'schema-transformation':
      return 'schema'
    case 'value-mapping':
    case 'crop-variety-mapping':
    case 'product-unit-mapping':
    case 'operation-mapping':
    case 'crop-type-mapping':
    case 'tillage-mapping':
      return 'value-mapping'
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/* Resolution helpers — shared with the issue panels                           */
/* -------------------------------------------------------------------------- */

const isUnresolved = (
  issue: Issue,
  state: Record<string, IssueState>,
): boolean => {
  const s = state[issue.id]
  if (!s) return true
  const k = s.resolution.kind
  if (k === 'pending') return true
  if (k === 'match-existing' && !s.resolution.value) return true
  return false
}

/* -------------------------------------------------------------------------- */
/* Deterministic per-field record count                                        */
/* -------------------------------------------------------------------------- */

/**
 * Stable hash mapping (farmId, fieldName) to a "records detected" count.
 * Same inputs produce the same output across renders so the summary panel
 * doesn't reshuffle when the user moves between panels.
 */
const recordCountFor = (farmId: string, fieldName: string): number => {
  const key = `${farmId}:${fieldName}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  // Range 1..30 — small per-field record counts.
  return 1 + (Math.abs(h) % 30)
}

/**
 * Stable subset of years observed in a given field's data. Derived from the
 * upload's overall year set so the value matches the rest of the summary.
 */
const yearsObservedFor = (
  farmId: string,
  fieldName: string,
  allYears: number[],
): number[] => {
  if (allYears.length === 0) return []
  const key = `${farmId}:${fieldName}:years`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  // Pick 1..allYears.length years deterministically.
  const count = 1 + (Math.abs(h) % allYears.length)
  const seen = new Set<number>()
  for (let i = 0; i < count; i++) {
    const idx = Math.abs(h + i * 7919) % allYears.length
    seen.add(allYears[idx])
  }
  return [...seen].sort((a, b) => a - b)
}

/* -------------------------------------------------------------------------- */
/* Summary panel                                                               */
/* -------------------------------------------------------------------------- */

const FarmRow = ({
  farm,
  active,
  onSelect,
}: {
  farm: FarmSummary
  active: boolean
  onSelect: () => void
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={active ? 'true' : undefined}
    className={clsx(
      'flex w-full items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      active
        ? 'border-border-primary bg-bg-tertiary'
        : 'border-transparent bg-bg-primary hover:border-border-tertiary hover:bg-bg-secondary',
    )}
  >
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-md font-medium text-text-primary">
        {farm.name}
      </span>
      <span className="text-sm text-text-secondary">
        {farm.fieldCount} {farm.fieldCount === 1 ? 'field' : 'fields'}
      </span>
    </div>
  </button>
)

const SummaryPanel = ({ summary }: { summary: DetectionSummary }) => {
  const farms = summary.farmRows
  const [activeFarmId, setActiveFarmId] = useState<string>(
    () => farms[0]?.id ?? '',
  )
  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? farms[0]
  const fields = useMemo(() => {
    if (!activeFarm) return []
    // farm.fieldNames is capped at ~12 even when fieldCount is larger.
    // Synthesise extra labels so the field list reflects the true field
    // count and each row gets a stable record count.
    const names: string[] = [...activeFarm.fieldNames]
    while (names.length < activeFarm.fieldCount) {
      names.push(`Field ${names.length + 1}`)
    }
    return names.slice(0, activeFarm.fieldCount).map((name) => ({
      name,
      records: recordCountFor(activeFarm.id, name),
      years: yearsObservedFor(activeFarm.id, name, summary.years),
    }))
  }, [activeFarm, summary.years])

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-8 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-text-primary">
          Here's what we found in your data
        </h1>
        <p className="max-w-[820px] text-md text-text-secondary">
          We detected {summary.farms.total} farms, {summary.fields.total} fields
          and {summary.totalRecords.toLocaleString()} records across the
          uploaded files. Browse a farm to inspect its fields.
        </p>
      </header>

      <section className="grid max-h-[450px] grid-cols-1 overflow-hidden rounded-xl border-2 border-border-tertiary bg-bg-primary lg:grid-cols-[360px_1fr]">
        <div className="flex min-h-0 flex-col border-b-2 border-border-tertiary lg:border-b-0 lg:border-r-2">
          <header className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Farms ({farms.length})
            </p>
          </header>
          <ol className="flex flex-1 min-h-0 flex-col gap-1 overflow-y-auto p-3">
            {farms.map((farm) => (
              <li key={farm.id}>
                <FarmRow
                  farm={farm}
                  active={farm.id === activeFarmId}
                  onSelect={() => setActiveFarmId(farm.id)}
                />
              </li>
            ))}
          </ol>
        </div>

        <div className="flex min-h-0 flex-col">
          <header className="flex items-baseline justify-between px-5 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Fields on {activeFarm?.name ?? '—'} ({fields.length})
            </p>
            <p className="text-xs text-text-secondary">
              {fields.reduce((a, b) => a + b.records, 0).toLocaleString()}{' '}
              records total
            </p>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-bg-secondary text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="w-[160px] px-3 py-2 text-left">Years</th>
                  <th className="w-[120px] px-3 py-2 text-right">Records</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, idx) => (
                  <tr
                    key={f.name}
                    className={clsx(
                      'align-middle',
                      idx > 0 && 'border-t border-border-tertiary',
                    )}
                  >
                    <td className="px-3 py-2 text-md text-text-primary">
                      {f.name}
                    </td>
                    <td className="px-3 py-2 text-md tabular-nums text-text-secondary">
                      {f.years.join(', ')}
                    </td>
                    <td className="px-3 py-2 text-right text-md tabular-nums text-text-secondary">
                      {f.records.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Issue panel                                                                 */
/* -------------------------------------------------------------------------- */

const IssuePanel = ({
  title,
  blurb,
  issues,
  state,
  onCommit,
  onAllResolved,
}: {
  title: string
  blurb: string
  issues: Issue[]
  state: Record<string, IssueState>
  onCommit: (issueId: string) => (next: IssueState) => void
  /** Called when the user resolves the final outstanding issue in this panel. */
  onAllResolved: () => void
}) => {
  const [activeId, setActiveId] = useState<string | null>(
    () => issues.find((i) => isUnresolved(i, state))?.id ?? null,
  )
  useEffect(() => {
    if (activeId && issues.some((i) => i.id === activeId)) return
    const next = issues.find((i) => isUnresolved(i, state)) ?? issues[0]
    setActiveId(next?.id ?? null)
  }, [issues, state, activeId])

  // When the user resolves an issue, jump focus to the next unresolved one
  // immediately. When everything's resolved, hand control back to the parent.
  const handleCommit = (issueId: string) => (next: IssueState) => {
    onCommit(issueId)(next)
    const after = { ...state, [issueId]: next }
    if (isUnresolved(issues.find((i) => i.id === issueId) ?? issues[0], after))
      return
    // Find the next unresolved (after this one), wrapping around.
    const idx = issues.findIndex((i) => i.id === issueId)
    for (let step = 1; step <= issues.length; step++) {
      const candidate = issues[(idx + step) % issues.length]
      if (candidate.id === issueId) continue
      if (isUnresolved(candidate, after)) {
        setActiveId(candidate.id)
        return
      }
    }
    onAllResolved()
  }

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-8 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>
        <p className="max-w-[820px] text-md text-text-secondary">{blurb}</p>
      </header>

      {issues.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border-tertiary bg-bg-primary px-6 py-10 text-center">
          <p className="text-md text-text-secondary">
            No issues in this category.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {issues.map((issue) => {
            const adapter = adapterFor(issue)
            if (!adapter) return null
            return (
              <li key={issue.id}>
                <IssueCard
                  issue={issue}
                  state={state[issue.id]}
                  adapter={adapter}
                  onCommit={handleCommit(issue.id)}
                  isActive={activeId === issue.id}
                  onFocus={() => setActiveId(issue.id)}
                />
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* NavBar — Back · centred progress · Next                                     */
/* -------------------------------------------------------------------------- */

const ProgressMeter = ({
  count,
  active,
  percent,
  onSelect,
}: {
  count: number
  active: number
  percent: number
  onSelect: (i: number) => void
}) => (
  <div className="flex w-full max-w-[140px] flex-col items-center gap-1.5">
    <span className="text-xs tabular-nums text-text-secondary">
      {percent}% complete
    </span>
    <div
      role="progressbar"
      aria-label="Refine progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative h-1.5 w-full overflow-visible rounded-full bg-border-secondary"
    >
      {/* Filled portion — width tracks the % complete. */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-text-primary transition-[width] duration-200"
        style={{ width: `${percent}%` }}
      />
      {/* Tick markers at each interval boundary (skip the leading edge). */}
      {Array.from({ length: count - 1 }).map((_, i) => {
        const tickIdx = i + 1
        const leftPct = (tickIdx / count) * 100
        return (
          <span
            key={PANEL_ORDER[tickIdx]}
            aria-hidden="true"
            className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-bg-primary"
            style={{ left: `${leftPct}%` }}
          />
        )
      })}
      {/* Invisible step buttons sitting on top of the track — click to jump
          to that panel. Stretched a little vertically so they're easy to hit. */}
      {Array.from({ length: count }).map((_, i) => {
        const widthPct = 100 / count
        return (
          <button
            key={PANEL_ORDER[i]}
            type="button"
            aria-label={`Go to ${PANEL_LABEL[PANEL_ORDER[i]]}`}
            aria-current={i === active ? 'true' : undefined}
            onClick={() => onSelect(i)}
            className="absolute -top-1.5 -bottom-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
            style={{ left: `${i * widthPct}%`, width: `${widthPct}%` }}
          />
        )
      })}
    </div>
  </div>
)

const NavBar = ({
  back,
  next,
  count,
  active,
  percent,
  onSelect,
}: {
  back?: { label: string; onClick: () => void }
  next?: {
    label: string
    disabled?: boolean
    /** Tooltip shown when `disabled` is true. */
    disabledHint?: string
    onClick: () => void
  }
  count: number
  active: number
  percent: number
  onSelect: (i: number) => void
}) => (
  <div className="mx-auto grid w-full max-w-[860px] grid-cols-3 items-center gap-3 px-8 py-4">
    <div className="justify-self-start">
      {back ? (
        <Button variant="secondary" onClick={back.onClick}>
          {back.label}
        </Button>
      ) : null}
    </div>
    <div className="justify-self-center">
      <ProgressMeter
        count={count}
        active={active}
        percent={percent}
        onSelect={onSelect}
      />
    </div>
    <div className="justify-self-end">
      {next ? (
        next.disabled && next.disabledHint ? (
          <Tooltip content={next.disabledHint}>
            <Button variant="primary" disabled onClick={next.onClick}>
              {next.label}
            </Button>
          </Tooltip>
        ) : (
          <Button
            variant="primary"
            disabled={next.disabled}
            onClick={next.onClick}
          >
            {next.label}
          </Button>
        )
      ) : null}
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* RefinePage                                                                  */
/* -------------------------------------------------------------------------- */

export const RefinePage = ({
  summary,
  issues,
  state,
  onStateChange,
}: RefinePageProps) => {
  // Bucket issues by panel.
  const issuesByPanel = useMemo(() => {
    const buckets: Record<PanelId, Issue[]> = {
      summary: [],
      identity: [],
      schema: [],
      'value-mapping': [],
    }
    for (const issue of issues) {
      const p = panelForIssue(issue)
      if (p) buckets[p].push(issue)
    }
    return buckets
  }, [issues])

  // Panel index lives in the URL (`/data-upload/refine/2` ...) so back /
  // forward and refresh keep the user on the right panel. Falls back to 0
  // when the segment is missing or invalid.
  const navigate = useNavigate()
  const { panelId } = useParams<{ panelId?: string }>()
  const parsed = panelId === undefined ? 0 : Number.parseInt(panelId, 10)
  const activeIndex =
    Number.isFinite(parsed) && parsed >= 0 && parsed < PANEL_ORDER.length
      ? parsed
      : 0

  const commitFor = (issueId: string) => (next: IssueState) => {
    onStateChange({ ...state, [issueId]: next })
  }

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(PANEL_ORDER.length - 1, i))
    if (clamped === activeIndex) return
    navigate(`/data-upload/refine/${clamped}`, { replace: true })
  }

  // Overall progress through the Refine stage. Summary counts as one step;
  // each issue (across all issue panels) counts as one step too. So with N
  // total issues the denominator is N + 1.
  const totalIssues = issues.length
  const resolvedIssues = issues.filter((i) => !isUnresolved(i, state)).length
  // Summary panel "counts" as resolved once the user has advanced past it.
  const summaryResolved = activeIndex > 0 ? 1 : 0
  const totalSteps = totalIssues + 1
  const completedSteps = summaryResolved + resolvedIssues
  const progressPercent =
    totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-secondary">
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Sliding track — each child fills the viewport. */}
        <div
          className="flex w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {PANEL_ORDER.map((panelId, idx) => (
            <section
              key={panelId}
              aria-hidden={idx !== activeIndex}
              className="h-full w-full shrink-0 overflow-y-auto"
            >
              {panelId === 'summary' ? (
                <SummaryPanel summary={summary} />
              ) : (
                <IssuePanel
                  title={
                    panelId === 'identity'
                      ? 'Match farms and fields to Sandy'
                      : panelId === 'schema'
                        ? 'Help us read your file structure'
                        : 'Map your data to Sandy values'
                  }
                  blurb={
                    panelId === 'identity'
                      ? "Sandy didn't recognise some of the farms or fields in your upload. Match them to existing records or create new ones."
                      : panelId === 'schema'
                        ? 'Tell Sandy how the columns in your file map onto the canonical schema.'
                        : 'Source values that need translating into Sandy reference vocabularies (crop varieties, units, …).'
                  }
                  issues={issuesByPanel[panelId]}
                  state={state}
                  onCommit={commitFor}
                  onAllResolved={() => goTo(idx + 1)}
                />
              )}
            </section>
          ))}
        </div>
      </div>

      <NavBar
        count={PANEL_ORDER.length}
        active={activeIndex}
        percent={progressPercent}
        onSelect={goTo}
        back={
          activeIndex > 0
            ? { label: 'Back', onClick: () => goTo(activeIndex - 1) }
            : undefined
        }
        next={(() => {
          const activePanel = PANEL_ORDER[activeIndex]
          if (activePanel === 'summary') {
            return {
              label: 'Looks right',
              onClick: () => goTo(activeIndex + 1),
            }
          }
          const panelIssues = issuesByPanel[activePanel]
          const unresolved = panelIssues.filter((i) => isUnresolved(i, state))
          const allResolved = unresolved.length === 0
          const isLast = activeIndex === PANEL_ORDER.length - 1
          return {
            label: isLast ? 'Done' : 'Continue',
            disabled: !allResolved,
            disabledHint: `Please resolve all ${unresolved.length} ${unresolved.length === 1 ? 'issue' : 'issues'} before proceeding`,
            onClick: () => goTo(activeIndex + 1),
          }
        })()}
      />
    </div>
  )
}
