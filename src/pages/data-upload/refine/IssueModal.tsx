import clsx from 'clsx'
import { type ReactNode, useEffect, useState } from 'react'
import { Button, IconArrowLeft, Modal } from '../../../components/ui'
import type { IssueState } from '../issue-state'
import type { Issue } from '../issues'
import { EXAMPLE_WORKBOOK } from '../schema-transformation'
import { DescribeAutoOpenContext } from './DescribeTray'
import type { IssueAdapter } from './issue-adapter'
import { SheetView } from './SheetView'

/* -------------------------------------------------------------------------- */
/* IssueModal — single full-width modal with an internal panel stack           */
/* -------------------------------------------------------------------------- */

/**
 * One panel inside the modal. Panels swap *in place* — no nested modals.
 * Each panel renders inside the same shell (title at top, optional data
 * table mid, actions pinned to the bottom).
 */
export type IssuePanel = {
  id: string
  /**
   * Title — defaults to the root issue headline (rendered by the modal
   * shell). Pass a panel-specific override when a deeper panel needs its
   * own heading (e.g. "Pick the matching farm").
   */
  title?: ReactNode
  /** Optional body — sits between the title and the actions. */
  body?: ReactNode
  /** Actions pinned to the bottom of the modal for this panel. */
  actions: ReactNode
  /**
   * When true, the body renders flush — no horizontal/bottom padding wrap,
   * and the modal's footer is suppressed (the body draws its own).
   * Use for full-bleed editors like the schema mapping panel.
   */
  fullBleed?: boolean
}

/** Navigation handle handed to adapter panel-builders. */
export type IssueNav = {
  push: (panel: IssuePanel) => void
  pop: () => void
  /** Close the modal entirely. */
  close: () => void
}

export type IssueModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  issue: Issue
  state: IssueState | undefined
  adapter: IssueAdapter
  onCommit: (next: IssueState) => void
  /**
   * Optional builder for the root panel. When omitted, the modal renders
   * the default "headline + standard actions" root used by farm/field issues.
   */
  renderRoot?: (params: RootPanelParams) => IssuePanel
  /**
   * When true, signal to inner panels (via DescribeAutoOpenContext) that
   * the Describe tray should be open on mount. Triggered by the card's
   * Describe button — bypasses the user's usual click to open the tray.
   */
  openDescribeOnMount?: boolean
  /**
   * When true, seed the panel stack with [root, optionsPanel] so the
   * "How should we handle this …?" chooser is the first thing the user
   * sees. Triggered by the card's "Other options" button — clicking Back
   * inside the modal returns to the default root with the data table.
   */
  openOnOptions?: boolean
}

export type RootPanelParams = {
  issue: Issue
  state: IssueState | undefined
  adapter: IssueAdapter
  nav: IssueNav
  onCommit: (next: IssueState) => void
}

/* -------------------------------------------------------------------------- */
/* Chunky back button — shared with the SchemaRuleEditor's chunky controls    */
/* -------------------------------------------------------------------------- */

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Back"
    className={clsx(
      'grid size-9 shrink-0 place-items-center rounded-lg',
      'bg-bg-tertiary text-text-primary transition-colors',
      'hover:bg-bg-secondary',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
    )}
  >
    <IconArrowLeft size={18} />
  </button>
)

/* -------------------------------------------------------------------------- */
/* Modal root                                                                  */
/* -------------------------------------------------------------------------- */

export const IssueModal = ({
  open,
  onOpenChange,
  issue,
  state,
  adapter,
  onCommit,
  renderRoot,
  openDescribeOnMount = false,
  openOnOptions = false,
}: IssueModalProps) => {
  const affected = adapter.affected(issue)
  const affectedSheet = affected
    ? EXAMPLE_WORKBOOK.sheets.find((s) => s.name === affected.sheetName)
    : null

  // Panel stack — root sits at [0], deeper panels get pushed on top.
  // We re-seed from the root builder every time the modal opens so a
  // mid-flow close doesn't leave stale state behind for the next open.
  const [stack, setStack] = useState<IssuePanel[]>([])

  // Root panel — either supplied by the caller, the adapter's
  // optionsPanel (when it asks to skip the chooser), or the default shape.
  const buildRoot = (nav: IssueNav): IssuePanel => {
    if (renderRoot) {
      return renderRoot({ issue, state, adapter, nav, onCommit })
    }
    if (adapter.skipChooseAction) {
      return adapter.optionsPanel(
        issue,
        (next) => {
          onCommit(next)
          nav.close()
        },
        state,
        () => nav.close(),
      )
    }
    return defaultRootPanel({ issue, state, adapter, nav, onCommit })
  }

  // Lazily make the navigation handle and root panel — the handle needs
  // setStack but setStack needs the handle for the root's content. We
  // resolve that by computing the root inside an effect that re-seeds
  // whenever the modal opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: seed-on-open
  useEffect(() => {
    if (!open) return
    const nav: IssueNav = {
      push: (panel) => setStack((prev) => [...prev, panel]),
      pop: () =>
        setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)),
      close: () => onOpenChange(false),
    }
    // When the card asked us to open straight onto the options chooser,
    // seed the stack with ONLY the options panel. There's no underlying
    // default root to "back into" — the chooser IS the root in this flow,
    // so the modal's Back button stays hidden and clicking close exits.
    if (openOnOptions && !adapter.skipChooseAction && !renderRoot) {
      const options = adapter.optionsPanel(
        issue,
        (next) => {
          onCommit(next)
          nav.close()
        },
        state,
        () => nav.close(),
      )
      setStack([options])
    } else {
      setStack([buildRoot(nav)])
    }
  }, [open, issue.id, state, adapter, openOnOptions])

  if (stack.length === 0) {
    // Modal not yet seeded; render nothing to avoid a one-frame blank.
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={issue.title}
        unstyled
        maxWidth="92vw"
      >
        <div />
      </Modal>
    )
  }

  // Nav handle that the *currently active* panel could need (e.g. its
  // actions push deeper panels).
  const nav: IssueNav = {
    push: (panel) => setStack((prev) => [...prev, panel]),
    pop: () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)),
    close: () => onOpenChange(false),
  }

  const active = stack[stack.length - 1]
  const isRoot = stack.length === 1

  // Root titles fall back to the issue's plain-English headline. Deeper
  // panels render their own override.
  const titleNode = isRoot ? (
    <div className="flex max-w-[640px] flex-col gap-2 text-3xl font-medium leading-tight text-text-primary">
      {adapter.problem(issue)}
      {adapter.solution(issue)}
    </div>
  ) : (
    <h2 className="text-2xl font-semibold leading-9 text-text-primary">
      {active.title ?? null}
    </h2>
  )

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={issue.title}
      unstyled
      maxWidth="92vw"
    >
      <DescribeAutoOpenContext.Provider value={openDescribeOnMount}>
        <div className="flex h-[90vh] flex-col">
          {/* Title row — back button on deeper panels, headline / panel
            title alongside. */}
          <header className="flex items-start gap-4 px-10 pb-6 pt-10">
            {!isRoot ? <BackButton onClick={nav.pop} /> : null}
            <div className="flex-1 min-w-0">{titleNode}</div>
          </header>

          {/* Mid section — panel body (optional) and the data table when the
            adapter has one. Data table sits on the root panel only. */}
          {active.fullBleed ? (
            <div className="flex-1 min-h-0 overflow-hidden">{active.body}</div>
          ) : (
            <div className="flex-1 overflow-y-auto px-10">
              {active.body ? (
                <div className="flex flex-col gap-5 pb-6">{active.body}</div>
              ) : null}
              {/* Affected-data sheet view only renders on the modal's
                  default root (panel id 'root') — the chooser/options
                  panels supply their own context (subject + origin) and
                  shouldn't carry a stale sheet view underneath. */}
              {isRoot && active.id === 'root' && affected && affectedSheet ? (
                <div className="pb-6">
                  <SheetView
                    filename={affected.source.filename}
                    initialTab={affected.sheetName}
                    highlights={affected.highlights}
                    cellHighlights={affected.cellHighlights ?? []}
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Actions — pinned to the bottom of the modal for every panel.
            Full-bleed panels draw their own footer. */}
          {active.fullBleed ? null : (
            <footer className="flex items-center justify-end gap-2 border-t-2 border-border-tertiary px-10 py-5">
              {active.actions}
            </footer>
          )}
        </div>
      </DescribeAutoOpenContext.Provider>
    </Modal>
  )

  // Helper. Defined outside the JSX so we don't recreate per render.
  function defaultRootPanel(params: RootPanelParams): IssuePanel {
    const yesPayload = params.adapter.acceptSuggestion(params.issue)
    const resolvedLabel = params.state
      ? params.adapter.resolvedLabel(params.state, params.issue)
      : null
    const isResolved = !!resolvedLabel
    return {
      id: 'root',
      actions: (
        <>
          {resolvedLabel ? (
            <button
              type="button"
              onClick={() => {
                /* placeholder — the change affordance is handled by the
                   secondary action below for now. */
              }}
              className="mr-auto inline-flex items-center gap-2 rounded-md bg-support-bg-green px-3 py-1 text-sm font-semibold text-text-brand-dark"
            >
              <span>{resolvedLabel}</span>
            </button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              params.nav.push(
                params.adapter.optionsPanel(
                  params.issue,
                  (next) => {
                    params.onCommit(next)
                    params.nav.close()
                  },
                  params.state,
                  () => params.nav.close(),
                ),
              )
            }}
          >
            {yesPayload ? 'No' : 'Choose an action'}
          </Button>
          {yesPayload ? (
            <Button
              variant="primary"
              onClick={() => {
                params.onCommit(yesPayload)
                params.nav.close()
              }}
              disabled={isResolved}
            >
              Yes
            </Button>
          ) : null}
        </>
      ),
    }
  }
}
