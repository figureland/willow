import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui'
import type { IssueState } from '../IssueResolverModal'
import type { Issue } from '../issues'
import { DescribeTray } from './DescribeTray'
import { IssueModal } from './IssueModal'
import type { IssueAdapter } from './issue-adapter'

/* -------------------------------------------------------------------------- */
/* Resolved tick — subtle iconographic check                                  */
/* -------------------------------------------------------------------------- */

/** Leading status indicator on every card — empty box when pending, filled
 *  green check when resolved. Always rendered, regardless of state. */
const StatusIndicator = ({ resolved }: { resolved: boolean }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors',
      resolved
        ? 'border-text-brand-dark bg-text-brand-dark text-text-primary-inverse'
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
/* IssueCard — focused / compact dual presentation                             */
/* -------------------------------------------------------------------------- */

export type IssueCardProps = {
  issue: Issue
  state: IssueState | undefined
  adapter: IssueAdapter
  onCommit: (next: IssueState) => void
  /** Card is the currently-focused issue. */
  isActive: boolean
  /** Click on the card body — used to focus the card when compact. */
  onFocus: () => void
}

export const IssueCard = ({
  issue,
  state,
  adapter,
  onCommit,
  isActive,
  onFocus,
}: IssueCardProps) => {
  // The card opens a single unified modal — same modal regardless of
  // which button kicked it off; the modal itself manages panel state.
  const [modalOpen, setModalOpen] = useState(false)
  // Describe tray — mounts directly on the card, not inside the modal.
  // Clicking Describe must NOT open the resolver modal.
  const [describeOpen, setDescribeOpen] = useState(false)
  const describe = useMemo(() => adapter.describe?.(issue), [adapter, issue])

  const yesPayload = adapter.acceptSuggestion(issue)
  const resolvedLabel = state ? adapter.resolvedLabel(state, issue) : null
  const isResolved = !!resolvedLabel

  // Compact card: just the headline + optional resolved tick, no actions.
  // Clicking anywhere on it focuses the card so its full body appears.
  if (!isActive) {
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: click target also focusable
      // biome-ignore lint/a11y/noStaticElementInteractions: article reads as a row
      <article
        onClick={onFocus}
        className={clsx(
          'group flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent p-5 opacity-75 shadow-sm transition-all duration-200',
          'hover:border-border-tertiary hover:opacity-100 hover:shadow-md',
          isResolved ? 'bg-support-bg-green/60' : 'bg-bg-primary',
        )}
      >
        <StatusIndicator resolved={isResolved} />
        <div className="flex max-w-[540px] flex-1 flex-col gap-1 text-md text-text-secondary">
          {adapter.problem(issue)}
          {isResolved ? (
            <p className="text-sm font-medium text-text-brand-dark">
              {resolvedLabel}
            </p>
          ) : (
            adapter.solution(issue)
          )}
        </div>
      </article>
    )
  }

  return (
    <article
      className={clsx(
        'relative flex flex-col gap-5 overflow-hidden rounded-xl p-6 shadow-md transition-all duration-200',
        isResolved ? 'bg-support-bg-green/60' : 'bg-bg-primary',
      )}
    >
      <div className="relative flex items-start gap-4">
        <StatusIndicator resolved={isResolved} />
        <div className="flex max-w-[540px] flex-1 flex-col gap-3">
          <div className="text-lg font-medium leading-7 text-text-primary">
            {adapter.problem(issue)}
          </div>
          {isResolved ? (
            <p className="text-sm font-medium text-text-brand-dark">
              {resolvedLabel}
            </p>
          ) : (
            <div className="text-md text-text-secondary">
              {adapter.solution(issue)}
            </div>
          )}
          {!isResolved && adapter.details ? adapter.details(issue) : null}
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-end gap-2">
        {isResolved ? (
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Change
          </Button>
        ) : yesPayload ? (
          <>
            <Button
              variant="primary"
              onClick={() => onCommit(yesPayload)}
              disabled={isResolved}
            >
              Yes
            </Button>
            {/* Single "Other options" button — opens the enlarged modal
                where the user can pick a different action or inspect the
                affected data. Replaces the previous No + View details pair. */}
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Other options
            </Button>
          </>
        ) : (
          // Schema-transformation + value-mapping issues have no Yes path —
          // their resolver IS the modal, so collapse the two old buttons
          // ("Choose an action" + "View details") into a single Resolve CTA.
          <>
            {describe ? (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  setDescribeOpen(true)
                }}
              >
                {describe.triggerLabel}
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Resolve
            </Button>
          </>
        )}
      </div>

      {modalOpen ? (
        <IssueModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          issue={issue}
          state={state}
          adapter={adapter}
          onCommit={onCommit}
        />
      ) : null}

      {describe ? (
        <DescribeTray
          open={describeOpen}
          onClose={() => setDescribeOpen(false)}
          title={describe.title}
          placeholder={describe.placeholder}
          hint={describe.hint}
          onApply={() => {
            // Stash Sandy's draft as the working state, then open the
            // resolver modal so the user can review + confirm "Does this
            // look right?" instead of silently accepting the AI result.
            onCommit(describe.apply(state))
            setModalOpen(true)
          }}
          portal
        />
      ) : null}
    </article>
  )
}
