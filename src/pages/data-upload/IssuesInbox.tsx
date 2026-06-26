import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui'
import { IssueBody, type IssueState } from './IssueResolverModal'
import {
  CATEGORY_ORDER,
  categoryForIssue,
  ISSUE_CATEGORY_LABEL,
  type IssueCategory,
  issueLine,
  StatusGlyph,
  statusForIssue,
} from './IssuesTable'
import { defaultResolutionForIssue, type Issue } from './issues'

/* -------------------------------------------------------------------------- */
/* Inbox — left list grouped by category, right detail pane                    */
/* -------------------------------------------------------------------------- */

export type IssuesInboxProps = {
  issues: Issue[]
  state: Record<string, IssueState>
  onStateChange: (next: Record<string, IssueState>) => void
}

export const IssuesInbox = ({
  issues,
  state,
  onStateChange,
}: IssuesInboxProps) => {
  // Group issues by category in display order. Categories with no issues
  // drop out of the rail entirely so the eye isn't pulled to empty sections.
  const grouped = useMemo(() => {
    const buckets: Record<IssueCategory, Issue[]> = {
      'farms-and-fields': [],
      'file-structure': [],
      'data-types': [],
    }
    for (const issue of issues) buckets[categoryForIssue(issue)].push(issue)
    return CATEGORY_ORDER.filter((c) => buckets[c].length > 0).map(
      (c) => [c, buckets[c]] as const,
    )
  }, [issues])

  // Selected issue id. Defaults to the first unresolved one so the user
  // lands on something actionable; falls back to whatever exists otherwise.
  const firstId = useMemo(() => {
    const unresolved = issues.find(
      (i) => statusForIssue(i, state[i.id]) === 'unresolved',
    )
    return unresolved?.id ?? issues[0]?.id ?? null
  }, [issues, state])

  const [selectedId, setSelectedId] = useState<string | null>(firstId)

  // Keep the selection valid when issues change and reseed on first mount.
  useEffect(() => {
    if (selectedId && issues.some((i) => i.id === selectedId)) return
    setSelectedId(firstId)
  }, [issues, firstId, selectedId])

  const selected = issues.find((i) => i.id === selectedId) ?? null

  // Walk to the next unresolved issue after the current one. Wraps around
  // so the user can keep tapping Confirm without thinking about ordering.
  const advanceToNext = () => {
    if (!selected) return
    const startIdx = issues.indexOf(selected)
    const len = issues.length
    for (let step = 1; step <= len; step++) {
      const candidate = issues[(startIdx + step) % len]
      if (statusForIssue(candidate, state[candidate.id]) === 'unresolved') {
        setSelectedId(candidate.id)
        return
      }
    }
    // Nothing else to do — leave selection where it is.
  }

  const updateSelectedState = (next: IssueState) => {
    if (!selected) return
    onStateChange({ ...state, [selected.id]: next })
  }

  // Each body falls back to a freshly-seeded resolution before the user
  // has interacted, mirroring the modal's behaviour.
  const effectiveState: IssueState | null = selected
    ? (state[selected.id] ?? {
        resolution: defaultResolutionForIssue(selected),
      })
    : null

  if (issues.length === 0) {
    return (
      <Card>
        <p className="text-md text-text-secondary">
          No issues found — Sandy matched everything in your upload.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid flex-1 min-h-0 grid-cols-[320px_1fr] overflow-hidden bg-bg-primary">
      {/* Left: scrolling categorised list. Flush against the right pane. */}
      <div className="flex flex-col overflow-hidden border-r-2 border-border-tertiary">
        <div className="flex-1 overflow-y-auto">
          {grouped.map(([category, items]) => {
            const unresolvedCount = items.filter(
              (i) => statusForIssue(i, state[i.id]) === 'unresolved',
            ).length
            return (
              <section
                key={category}
                className="border-b-2 border-border-tertiary last:border-0"
              >
                <header className="flex items-baseline justify-between gap-2 px-4 py-2">
                  <p className="text-sm font-semibold text-text-secondary">
                    {ISSUE_CATEGORY_LABEL[category]}
                  </p>
                  <span className="text-sm tabular-nums text-text-secondary">
                    {unresolvedCount}/{items.length}
                  </span>
                </header>
                <ul className="flex flex-col">
                  {items.map((issue) => {
                    const status = statusForIssue(issue, state[issue.id])
                    const { headline, context } = issueLine(issue)
                    const isSelected = issue.id === selectedId
                    return (
                      <li key={issue.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(issue.id)}
                          className={clsx(
                            'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
                            isSelected
                              ? 'bg-sandy-100'
                              : 'hover:bg-bg-secondary',
                          )}
                        >
                          <span className="mt-[2px]">
                            <StatusGlyph status={status} />
                          </span>
                          <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                            <p
                              className={clsx(
                                'text-md font-semibold truncate',
                                status === 'resolved'
                                  ? 'text-text-secondary line-through'
                                  : 'text-text-primary',
                                status === 'ignored' && 'text-text-secondary',
                              )}
                            >
                              {headline}
                            </p>
                            <p className="text-sm text-text-secondary truncate">
                              {context}
                            </p>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>

      {/* Right: detail pane for the active issue. */}
      <div className="flex flex-col overflow-y-auto p-6">
        {selected && effectiveState ? (
          <IssueBody
            issue={selected}
            state={effectiveState}
            onChange={updateSelectedState}
            onResolve={advanceToNext}
          />
        ) : (
          <p className="text-md text-text-secondary">
            Pick an issue on the left to start.
          </p>
        )}
      </div>
    </div>
  )
}
