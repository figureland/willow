/* -------------------------------------------------------------------------- */
/* Row-level issue model for the Fix-issues step                               */
/* -------------------------------------------------------------------------- */

/**
 * Issue codes + their default severity/label come from the central
 * validation catalogue (`src/validations`). The `fixDefaults` lookup is a
 * derived projection — keeping copy in sync without duplication.
 */

import {
  type FixIssueCode,
  fixDefaults,
} from '../../../validations/fixes/code-mapping'
import type { ValidationSeverity } from '../../../validations/types'

/** Severity tiers — re-exported from the central catalogue. */
export type IssueSeverity = ValidationSeverity

/** Stable, short Fix-step issue code. Mirrors `FixIssueCode` 1:1. */
export type IssueCode = FixIssueCode

export type RowIssue = {
  code: IssueCode
  severity: IssueSeverity
  /** Column the issue lives on — drives the modal's "edit this value" target. */
  columnName?: string
  /** Pre-rendered message. Adapters fall back to the catalogue template. */
  message: string
  /** Free-text context the modal can surface (e.g. "Field area: 8.4 ha"). */
  detail?: string
}

/**
 * Default severity + label per code — projected from the central catalogue
 * via `FIX_CODE_TO_CATALOGUE`. Editing copy in the catalogue automatically
 * flows through here.
 */
export const ISSUE_DEFAULTS = fixDefaults

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Worst severity across an issue list, or null if the row is clean. */
export const worstSeverity = (
  issues: RowIssue[] | undefined,
): IssueSeverity | null => {
  if (!issues || issues.length === 0) return null
  return issues.some((i) => i.severity === 'blocking') ? 'blocking' : 'warning'
}

/**
 * Build a single RowIssue from a code + column. Sentence templates here
 * are intentionally short — full plain-English copy lives in the catalogue.
 */
export const issueFor = (
  code: IssueCode,
  columnName?: string,
  detail?: string,
): RowIssue => {
  const def = ISSUE_DEFAULTS[code]
  const message = columnName
    ? `${columnName} — ${def.label.toLowerCase()}`
    : def.label
  return {
    code,
    severity: def.severity,
    columnName,
    message,
    detail,
  }
}
