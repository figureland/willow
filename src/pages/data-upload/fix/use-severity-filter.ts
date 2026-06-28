import { useSearchParams } from 'react-router-dom'
import type { IssueSeverity, RowIssue } from './row-issues'
import { worstSeverity } from './row-issues'

/* -------------------------------------------------------------------------- */
/* Severity filter — shared between IssuesView, CroppingTableView, FieldView   */
/* -------------------------------------------------------------------------- */

/**
 * Reads the `severity` URL search param (set by the top-bar SegmentedControl
 * in FixIssuesPage). Returns either a specific severity to filter to, or
 * `'all'` when no filter is applied.
 */
export type SeverityFilter = 'all' | IssueSeverity

export const useSeverityFilter = (): SeverityFilter => {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get('severity')
  return raw === 'blocking' || raw === 'warning' ? raw : 'all'
}

/**
 * True when a row's issues should be shown under the given filter:
 *   - `'all'` always passes
 *   - a specific severity passes when the row's worst issue matches
 *
 * Rows with no issues never match a specific-severity filter — they have
 * nothing to surface.
 */
export const rowMatchesSeverity = (
  issues: RowIssue[] | undefined,
  filter: SeverityFilter,
): boolean => {
  if (filter === 'all') return true
  return worstSeverity(issues) === filter
}
