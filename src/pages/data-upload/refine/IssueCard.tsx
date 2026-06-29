import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui'
import type { IssueState } from '../issue-state'
import type {
  Issue,
  SchemaTransformationIssue,
  ValueMappingIssue,
} from '../issues'
import type { SchemaRuleProgram } from '../schema-transformation'
import type { ValueMappingDecisions } from '../value-mapping'
import { ColumnMappingModal } from './ColumnMappingModal'
import { DescribeTray } from './DescribeTray'
import { IssueModal } from './IssueModal'
import type { IssueAdapter } from './issue-adapter'
import { SchemaReviewModal } from './SchemaReviewModal'
import { ValueMappingModal } from './ValueMappingModal'

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
  // When the user clicks "Other options" we want the modal to land
  // directly on the chooser, not the data-table root. Tracked so the next
  // open knows which seed to use.
  const [openOnOptions, setOpenOnOptions] = useState(false)
  // Describe tray — mounts directly on the card, not inside the modal.
  // Clicking Describe must NOT open the resolver modal.
  const [describeOpen, setDescribeOpen] = useState(false)
  // Manual column-mapping modal — same handoff as Describe: produces a draft
  // IssueState then opens the resolver modal so the user can review.
  const [mapColumnsOpen, setMapColumnsOpen] = useState(false)
  // Manual value-mapping modal — twin of the column-mapping path.
  const [mapValuesOpen, setMapValuesOpen] = useState(false)
  // Unified Review modal — currently used by schema-transformation cards.
  const [reviewOpen, setReviewOpen] = useState(false)
  const describe = useMemo(() => adapter.describe?.(issue), [adapter, issue])
  const mapColumns = useMemo(
    () => adapter.mapColumns?.(issue),
    [adapter, issue],
  )
  const mapValues = useMemo(() => adapter.mapValues?.(issue), [adapter, issue])
  const review = useMemo(() => adapter.review?.(issue), [adapter, issue])

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
        {/* Same text size + line-height for problem, solution and resolved
            label so the block reads as one continuous paragraph. */}
        <div className="flex max-w-[540px] flex-1 flex-col gap-1 text-md leading-7 text-text-secondary [&_p]:text-md [&_p]:leading-7">
          {adapter.problem(issue)}
          {isResolved ? (
            <p className="font-medium text-text-brand-dark">{resolvedLabel}</p>
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
        {/* One continuous block — problem + solution + resolved label all
            share the same text size and line-height so the card reads as a
            single neat paragraph. */}
        <div className="flex max-w-[540px] flex-1 flex-col gap-1 text-md leading-7 text-text-primary [&_p]:text-md [&_p]:leading-7">
          {adapter.problem(issue)}
          {isResolved ? (
            <p className="font-medium text-text-brand-dark">{resolvedLabel}</p>
          ) : (
            <div className="text-text-secondary">{adapter.solution(issue)}</div>
          )}
          {!isResolved && adapter.details ? adapter.details(issue) : null}
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-end gap-2">
        {isResolved && review ? (
          // Schema cards route every "Change" press through the same Review
          // modal so the user sees the data + mapping again, not the old
          // narrow chooser.
          <Button variant="secondary" onClick={() => setReviewOpen(true)}>
            Change
          </Button>
        ) : isResolved ? (
          <Button
            variant="secondary"
            onClick={() => {
              // Change lands directly on the chooser — the user already
              // confirmed once, so the data-grid view would just be noise.
              setOpenOnOptions(true)
              setModalOpen(true)
            }}
          >
            Change
          </Button>
        ) : review ? (
          // Single Review CTA — opens the unified review modal that owns
          // the entire review → describe → manual flow internally.
          <Button variant="primary" onClick={() => setReviewOpen(true)}>
            {review.triggerLabel}
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
            {describe ? (
              // Adapter has its own Describe surface — wire "No" to it so the
              // user can correct Sandy's guess in their own words instead of
              // walking through the full options modal.
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  setDescribeOpen(true)
                }}
              >
                No
              </Button>
            ) : (
              // Default Yes/No flow — "Other options" opens the modal at
              // the chooser ("How should we handle this …?") so the user
              // can pick a different action without first scrolling past
              // the affected-data table.
              <Button
                variant="secondary"
                onClick={() => {
                  setOpenOnOptions(true)
                  setModalOpen(true)
                }}
              >
                Other options
              </Button>
            )}
          </>
        ) : mapColumns ? (
          // Unrecognised schema-transformation: Describe (AI assist) or
          // Map columns (manual) — both feed into the same review modal.
          <>
            {describe ? (
              <Button
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  setDescribeOpen(true)
                }}
              >
                {describe.triggerLabel}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                setMapColumnsOpen(true)
              }}
            >
              {mapColumns.triggerLabel}
            </Button>
          </>
        ) : mapValues ? (
          // Value-mapping: Describe (AI) or Map values (manual). Same
          // shape as the schema flow; the manual modal lists every raw
          // value with a confidence badge on Sandy's guesses.
          <>
            {describe ? (
              <Button
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  setDescribeOpen(true)
                }}
              >
                {describe.triggerLabel}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                setMapValuesOpen(true)
              }}
            >
              {mapValues.triggerLabel}
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

      {adapter.provenance ? (
        <div className="relative border-t border-border-tertiary pt-3">
          {adapter.provenance(issue)}
        </div>
      ) : null}

      {modalOpen ? (
        <IssueModal
          open={modalOpen}
          onOpenChange={(next) => {
            setModalOpen(next)
            if (!next) setOpenOnOptions(false)
          }}
          issue={issue}
          state={state}
          adapter={adapter}
          onCommit={onCommit}
          openOnOptions={openOnOptions}
        />
      ) : null}

      {describe ? (
        <DescribeTray
          open={describeOpen}
          onClose={() => setDescribeOpen(false)}
          title={describe.title}
          placeholder={describe.placeholder}
          hint={describe.hint}
          expectedProperties={describe.expectedProperties}
          expectedPropertiesTitle={describe.expectedPropertiesTitle}
          expectedPropertiesMissingLabel={
            describe.expectedPropertiesMissingLabel
          }
          onApply={() => {
            // Stash Sandy's draft as the working state, then open the
            // dedicated review modal so the user can confirm.
            // For value-mapping issues we route to ValueMappingModal
            // (a constrained 780px review) instead of the wider IssueModal
            // so the AI path matches the manual one visually.
            onCommit(describe.apply(state))
            if (issue.type === 'value-mapping') {
              setMapValuesOpen(true)
            } else {
              setModalOpen(true)
            }
          }}
          portal
        />
      ) : null}

      {mapColumns && mapColumnsOpen ? (
        <ColumnMappingModal
          open={mapColumnsOpen}
          onClose={() => setMapColumnsOpen(false)}
          sourceSheet={(issue as SchemaTransformationIssue).sheetName}
          onConfirm={(next) => {
            // Same handoff as Describe — commit the manual draft and let
            // the resolver modal walk the user through confirming it.
            onCommit(next)
            setModalOpen(true)
          }}
        />
      ) : null}

      {mapValues && mapValuesOpen ? (
        <ValueMappingModal
          open={mapValuesOpen}
          onClose={() => setMapValuesOpen(false)}
          issue={issue as ValueMappingIssue}
          initialDecisions={
            state?.resolution.kind === 'value-mapping'
              ? (state.resolution.decisions as ValueMappingDecisions)
              : undefined
          }
          onConfirm={(next) => {
            onCommit(next)
            setModalOpen(true)
          }}
        />
      ) : null}

      {review && reviewOpen && issue.type === 'schema-transformation' ? (
        <SchemaReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          issue={issue as SchemaTransformationIssue}
          initialProgram={
            state?.resolution.kind === 'rule-program'
              ? (state.resolution.program as SchemaRuleProgram)
              : undefined
          }
          onConfirm={(next) => {
            onCommit(next)
          }}
        />
      ) : null}
    </article>
  )
}
