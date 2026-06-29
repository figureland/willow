import clsx from 'clsx'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Tooltip } from '../../../components/ui'
import { CompletionToast } from '../CompletionToast'
import type { IssueState } from '../issue-state'
import type { Issue } from '../issues'
import type { DetectionSummary } from '../summary'
import { adapterFor } from './adapters'
import { IdentityPreview } from './IdentityPreview'
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

type PanelId = 'identity' | 'schema' | 'value-mapping'

const PANEL_ORDER: PanelId[] = ['identity', 'schema', 'value-mapping']

const PANEL_LABEL: Record<PanelId, string> = {
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

export const isUnresolved = (
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
/* Issue panel                                                                 */
/* -------------------------------------------------------------------------- */

const IssuePanel = ({
  title,
  blurb,
  issues,
  state,
  onCommit,
  preview,
}: {
  title: string
  blurb: string
  issues: Issue[]
  state: Record<string, IssueState>
  onCommit: (issueId: string) => (next: IssueState) => void
  /** Optional preview element rendered above the issues list — used by the
   *  identity panel to surface a farms + fields summary. */
  preview?: ReactNode
}) => {
  const [activeId, setActiveId] = useState<string | null>(
    () => issues.find((i) => isUnresolved(i, state))?.id ?? null,
  )
  useEffect(() => {
    if (activeId && issues.some((i) => i.id === activeId)) return
    const next = issues.find((i) => isUnresolved(i, state)) ?? issues[0]
    setActiveId(next?.id ?? null)
  }, [issues, state, activeId])

  // When the panel transitions from "in progress" to "all resolved", show
  // a brief celebration toast before handing control to the parent. The
  // delay gives the progress-bar fill animation time to land and reads as
  // a beat of acknowledgement.
  const [celebrating, setCelebrating] = useState(false)

  // When the user resolves an issue, jump focus to the next unresolved one
  // immediately. When everything's resolved, kick the celebration sequence.
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
    setCelebrating(true)
  }

  // Hide the toast after a short beat once everything's resolved. We
  // intentionally don't auto-advance to the next panel — the user always
  // moves on by clicking Next / Continue in the bottom nav.
  useEffect(() => {
    if (!celebrating) return
    const t = setTimeout(() => setCelebrating(false), 1400)
    return () => clearTimeout(t)
  }, [celebrating])

  return (
    <div className="relative mx-auto flex w-full max-w-[860px] flex-col gap-6 px-8 py-10">
      <CompletionToast visible={celebrating} label={`${title} — complete`} />
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-text-primary">{title}</h1>
      </header>

      {preview ? (
        // Preview cascades in first — the summary card is the anchor for
        // the rest of the cascade so it gets the earliest delay.
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          {preview}
        </div>
      ) : null}

      {blurb ? (
        <p
          className="max-w-[760px] text-lg text-text-primary animate-fade-up"
          style={{ animationDelay: '180ms' }}
        >
          {blurb}
        </p>
      ) : null}

      {issues.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border-tertiary bg-bg-primary px-6 py-10 text-center">
          <p className="text-md text-text-secondary">
            No issues in this category.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {issues.map((issue, idx) => {
            const adapter = adapterFor(issue)
            if (!adapter) return null
            // Stagger each card after the blurb so the page reads as a
            // single coherent cascade. When a preview sits above the list
            // (identity panel), hold the issues back a beat so the
            // farms-and-fields summary has time to settle before the
            // issue stack starts cascading in.
            const startMs = preview ? 1100 : 320
            const capMs = preview ? 1700 : 900
            const delayMs = Math.min(startMs + idx * 90, capMs)
            return (
              <li
                key={issue.id}
                className="animate-fade-up"
                style={{ animationDelay: `${delayMs}ms` }}
              >
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
    <div className="flex h-full min-h-0 flex-col bg-bg-primary">
      <div className="relative flex flex-1 min-h-0">
        {/* Inactive panels are display:none so they can't influence layout
            or steal focus; only the active panel is mounted into the flex
            flow. */}
        {PANEL_ORDER.map((panelId, idx) => (
          <section
            key={panelId}
            aria-hidden={idx !== activeIndex}
            className={clsx(
              'min-h-0 flex-1 overflow-y-auto',
              idx !== activeIndex && 'hidden',
            )}
          >
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
                  ? 'We couldn\u2019t automatically recognise some of the farms and fields listed in your files.'
                  : panelId === 'schema'
                    ? ''
                    : ''
              }
              issues={issuesByPanel[panelId]}
              state={state}
              onCommit={commitFor}
              preview={
                panelId === 'identity' ? (
                  <IdentityPreview summary={summary} />
                ) : null
              }
            />
          </section>
        ))}
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
          // Hide the panel's Continue/Done button until every issue in the
          // active panel carries a non-pending resolution. The top-level
          // wizard Next is similarly gated, so users still have a clear way
          // to leave the step once they're done.
          const panelIssues = issuesByPanel[activePanel] ?? []
          const allResolved =
            panelIssues.length === 0 ||
            panelIssues.every((i) => !isUnresolved(i, state))
          if (!allResolved) return undefined
          const isLast = activeIndex === PANEL_ORDER.length - 1
          // On the final panel we let the wizard's top-right Next own the
          // hand-off out of the step — surfacing a second Done button here
          // would be redundant. Inline Continue still shows between panels.
          if (isLast) return undefined
          return {
            label: 'Continue',
            onClick: () => goTo(activeIndex + 1),
          }
        })()}
      />
    </div>
  )
}
