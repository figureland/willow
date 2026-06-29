import type { ReactNode } from 'react'
import type { IssueState } from '../IssueResolverModal'
import type { Issue } from '../issues'
import type { HighlightRef } from '../schema-transformation'
import type { IssuePanel } from './IssueModal'

/* -------------------------------------------------------------------------- */
/* Source-file meta — shown above the data table inside the IssueModal         */
/* -------------------------------------------------------------------------- */

export type AffectedSource = {
  filename: string
  /** "Operations" / "Cropping" / "Soil sampling" / "Unspecified" — the
   *  category the file was tagged with during ingestion. */
  dataCategory: string
  /** Storage kind of the source file. */
  fileKind: 'spreadsheet' | 'pdf' | 'sandy-template'
  /** For spreadsheets: the sheet/tab name. For PDFs: a "Page N" label. */
  location?: string
}

/* -------------------------------------------------------------------------- */
/* Cell highlights — value-mapping etc. light specific cells/rows               */
/* -------------------------------------------------------------------------- */

export type CellHighlight = {
  /** 0-based row index into Sheet.sampleRows. */
  rowIndex: number
  /** Column name to tint. Same shape as HighlightRef columns. */
  column: string
}

/* -------------------------------------------------------------------------- */
/* Issue adapter — the per-type contract the IssueCard reads from              */
/* -------------------------------------------------------------------------- */

/**
 * Adapters describe how a given issue type should be presented inside the
 * generic IssueCard / IssueModal pattern. Each issue type provides its
 * own headline, default-yes resolution, and an `optionsPanel` builder
 * that fronts the deeper Select / Create / Exclude flows.
 *
 * Keeping the contract small + type-erased on `Issue` lets the page render
 * any mix of issues without knowing their variants.
 */
export type IssueAdapter = {
  /**
   * The "what went wrong" line — stays visible whether the issue is
   * resolved or not. Example: `We couldn't recognise the farm "X".`
   */
  problem: (issue: Issue) => ReactNode
  /**
   * The suggested-fix line — the bit the card swaps for the user's chosen
   * action once resolved (the modal/card replaces it with `resolvedLabel`).
   * Return `null` for issue types that don't surface a default suggestion
   * (e.g. schema-transformation / value-mapping, where the resolver IS the
   * action).
   */
  solution: (issue: Issue) => ReactNode | null
  /**
   * Optional supporting detail rendered only when the card is the active
   * (focused) one — e.g. a small table of affected rows. Compact cards
   * skip this so the inactive stack stays scannable.
   */
  details?: (issue: Issue) => ReactNode | null
  /**
   * IssueState committed when the user taps Yes. Adapters return `null` to
   * signal "Yes isn't valid here" — in that case the modal omits the Yes
   * button and the optionsPanel becomes the only path.
   */
  acceptSuggestion: (issue: Issue) => IssueState | null
  /**
   * Panel pushed when the user taps "No" / "Choose an action". Receives the
   * issue + a commit callback that will close the modal once a deeper page
   * confirms the user's choice.
   */
  /**
   * Build the resolver panel. `currentState` is the latest committed (or
   * pending draft) IssueState — adapters that support a draft preview should
   * seed their internal editor from it so the user sees the AI-drafted /
   * previously-saved result instead of starting from scratch.
   */
  optionsPanel: (
    issue: Issue,
    commit: (next: IssueState) => void,
    currentState?: IssueState,
  ) => IssuePanel
  /**
   * When true, the modal skips the default "Choose an action" root and
   * mounts `optionsPanel` directly. Use for adapters where there's no
   * Yes / No fork (e.g. schema transformation — the resolver IS the
   * primary surface).
   */
  skipChooseAction?: boolean
  /**
   * Snippet preview config rendered in the root panel of the modal.
   * `null` skips the data table entirely.
   */
  affected: (issue: Issue) => {
    sheetName: string
    highlights: HighlightRef[]
    /** Optional cell-level highlights (e.g. specific source values). */
    cellHighlights?: CellHighlight[]
    source: AffectedSource
  } | null
  /**
   * Short label rendered on the resolved card. The label is clickable and
   * re-opens the modal for re-do.
   */
  resolvedLabel: (state: IssueState, issue: Issue) => string | null
  /**
   * Optional "Describe …" affordance shown both on the card and inside the
   * resolver panel. The DescribeTray UI is shared; adapters only need to
   * supply the labels + a callback that produces the next IssueState from
   * the user's description.
   */
  describe?: (issue: Issue) => {
    triggerLabel: string
    title: string
    placeholder: string
    hint?: string
    /** Build the IssueState to commit when the simulated assist completes. */
    apply: (currentState: IssueState | undefined) => IssueState
  } | null
}
