import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/ui'
import type { IssueState } from '../IssueResolverModal'
import {
  CATEGORY_ORDER,
  categoryForIssue,
  ISSUE_CATEGORY_LABEL,
  type IssueCategory,
} from '../IssuesTable'
import type { Issue } from '../issues'
import { adapterFor } from './adapters'
import { IssueCard } from './IssueCard'

/* -------------------------------------------------------------------------- */
/* RefinePage — collapsible category stacks + focused-card model               */
/* -------------------------------------------------------------------------- */

export type RefinePageProps = {
  issues: Issue[]
  state: Record<string, IssueState>
  onStateChange: (next: Record<string, IssueState>) => void
}

/* -------------------------------------------------------------------------- */
/* SectionStatus — right-side header element                                   */
/* -------------------------------------------------------------------------- */

const SectionTick = () => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — adjacent text owns the label
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
  allResolved,
  unresolvedCount,
  isOpen,
  onToggle,
}: {
  items: Issue[]
  allResolved: boolean
  unresolvedCount: number
  isOpen: boolean
  onToggle: () => void
}) => {
  // Empty folder — quiet status line.
  if (items.length === 0) {
    return <span className="text-sm text-text-secondary">No issues found</span>
  }

  // All resolved — small green tick + "N issues resolved". Still clickable
  // so the user can dip back in to revise.
  if (allResolved) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary rounded-sm hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
      >
        <SectionTick />
        <span>
          {items.length} {items.length === 1 ? 'issue' : 'issues'} resolved
        </span>
      </button>
    )
  }

  // Unresolved — chunky button. Becomes a subtle grey "Hide" affordance
  // when the section is open (the cards underneath are the focus then).
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

export const RefinePage = ({
  issues,
  state,
  onStateChange,
}: RefinePageProps) => {
  const grouped = useMemo(() => {
    const buckets: Record<IssueCategory, Issue[]> = {
      'farms-and-fields': [],
      'file-structure': [],
      'data-types': [],
    }
    for (const issue of issues) buckets[categoryForIssue(issue)].push(issue)
    return CATEGORY_ORDER.map((c) => [c, buckets[c]] as const)
  }, [issues])

  // Collapsible sections — one open at a time. Lazy initial state lands on
  // the first section that has unresolved issues so the user has something
  // to do immediately. Re-running this on every render would fight the
  // user's manual open/close interactions, so we seed once.
  const [openCategory, setOpenCategory] = useState<IssueCategory | null>(() => {
    const firstWithWork = grouped.find(([, items]) =>
      items.some((i) => isUnresolved(i, state)),
    )
    return firstWithWork?.[0] ?? null
  })
  const [activeId, setActiveId] = useState<string | null>(null)

  // When a section is expanded for the first time, pick its first unresolved
  // issue to focus. Falls back to the first issue if all are resolved.
  useEffect(() => {
    if (!openCategory) return
    if (activeId && issues.some((i) => i.id === activeId)) return
    const list = grouped.find(([c]) => c === openCategory)?.[1] ?? []
    if (list.length === 0) return
    const next = list.find((i) => isUnresolved(i, state)) ?? list[0]
    setActiveId(next.id)
  }, [openCategory, grouped, issues, state, activeId])

  const advanceAfterCommit = (currentIssueId: string) => {
    // Find the next unresolved issue, scanning the active category first
    // then falling through to the rest of the issue list.
    const idx = issues.findIndex((i) => i.id === currentIssueId)
    if (idx === -1) return
    const len = issues.length
    for (let step = 1; step <= len; step++) {
      const candidate = issues[(idx + step) % len]
      if (isUnresolved(candidate, state)) {
        setActiveId(candidate.id)
        // If the candidate sits in a different category, swap which
        // section is open so it's actually visible.
        const candidateCategory = categoryForIssue(candidate)
        if (candidateCategory !== openCategory) {
          setOpenCategory(candidateCategory)
        }
        return
      }
    }
    // Everything resolved — leave selection in place.
  }

  const commitFor = (issueId: string) => (next: IssueState) => {
    onStateChange({ ...state, [issueId]: next })
    // Auto-advance once the new state has resolved this issue.
    // (Read against the *next* map by spreading locally for the check.)
    const after = { ...state, [issueId]: next }
    const stillUnresolved = isUnresolved(
      issues.find((i) => i.id === issueId) ?? issues[0],
      after,
    )
    if (!stillUnresolved) advanceAfterCommit(issueId)
  }

  // Floating Proceed: jump to the next unresolved issue across all sections,
  // expanding its category if needed.
  const handleProceed = () => {
    const startIdx = activeId
      ? Math.max(
          0,
          issues.findIndex((i) => i.id === activeId),
        )
      : -1
    const len = issues.length
    for (let step = 1; step <= len; step++) {
      const candidate = issues[(startIdx + step) % len]
      if (isUnresolved(candidate, state)) {
        const cat = categoryForIssue(candidate)
        setOpenCategory(cat)
        setActiveId(candidate.id)
        return
      }
    }
  }

  const anyUnresolved = issues.some((i) => isUnresolved(i, state))

  return (
    <div className="relative mx-auto flex w-full max-w-[820px] flex-col gap-6 px-8 py-10 pb-24">
      <h1 className="text-3xl font-semibold text-text-primary">
        Help us understand {issues.length}{' '}
        {issues.length === 1 ? 'issue' : 'issues'} with your files
      </h1>

      {grouped.map(([category, items]) => {
        const isOpen = openCategory === category
        const unresolvedCount = items.filter((i) =>
          isUnresolved(i, state),
        ).length
        const allResolved = items.length > 0 && unresolvedCount === 0
        return (
          <section
            key={category}
            className="flex flex-col gap-3 border-b-2 border-border-tertiary pb-6 last:border-0"
          >
            {/* Header row: category label on the left, status / action on
                the right. The right side is the only thing that toggles
                the section, so the label can sit quietly on its own. */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium text-text-secondary">
                {ISSUE_CATEGORY_LABEL[category]}
              </h2>
              <SectionStatus
                items={items}
                allResolved={allResolved}
                unresolvedCount={unresolvedCount}
                isOpen={isOpen}
                onToggle={() => setOpenCategory(isOpen ? null : category)}
              />
            </div>

            {/* Body — soft height/opacity transition. */}
            <div
              className={clsx(
                'flex flex-col gap-3 transition-all duration-200 ease-out',
                isOpen
                  ? 'opacity-100'
                  : 'pointer-events-none h-0 opacity-0 overflow-hidden',
              )}
            >
              {items.length === 0
                ? null
                : items.map((issue) => {
                    const adapter = adapterFor(issue)
                    if (!adapter) return null
                    return (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        state={state[issue.id]}
                        adapter={adapter}
                        onCommit={commitFor(issue.id)}
                        isActive={activeId === issue.id}
                        onFocus={() => setActiveId(issue.id)}
                      />
                    )
                  })}
            </div>
          </section>
        )
      })}

      {/* Sticky footer — Proceed only appears once everything is resolved,
          otherwise we surface a quiet status line nudging the user. */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        {anyUnresolved ? (
          <p className="rounded-lg bg-bg-tertiary px-4 py-2 text-sm font-semibold text-text-secondary">
            Please review {issues.filter((i) => isUnresolved(i, state)).length}{' '}
            {issues.filter((i) => isUnresolved(i, state)).length === 1
              ? 'issue'
              : 'issues'}{' '}
            to proceed
          </p>
        ) : (
          <Button variant="primary" onClick={handleProceed}>
            Proceed
          </Button>
        )}
      </div>
    </div>
  )
}
