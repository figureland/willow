import type { Resolution } from './issues'

/**
 * Per-issue resolver state. For mapping issues each row carries its own
 * chosen system value; for farm/field issues the single `Resolution` covers
 * the whole issue. We keep them in the same map keyed by issue id so the
 * parent doesn't have to know each issue type.
 */
export type IssueState = {
  resolution: Resolution
  /** Row-level resolutions for mapping issues (rowId -> resolution). */
  rows?: Record<string, Resolution>
}
