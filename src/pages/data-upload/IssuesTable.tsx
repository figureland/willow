import clsx from 'clsx'
import { Card } from '../../components/ui'
import type { IssueState } from './IssueResolverModal'
import type { Issue } from './issues'

/* -------------------------------------------------------------------------- */
/* Status derived from a resolution                                            */
/* -------------------------------------------------------------------------- */

export type IssueStatus = 'unresolved' | 'resolved' | 'ignored'

export const statusForIssue = (
  _issue: Issue,
  state?: IssueState,
): IssueStatus => {
  if (!state) return 'unresolved'
  const kind = state.resolution.kind
  if (kind === 'ignore') return 'ignored'
  if (kind === 'pending') return 'unresolved'
  // match-existing without a chosen value is effectively still unresolved.
  if (kind === 'match-existing' && !state.resolution.value) return 'unresolved'
  // rule-program is "resolved" once it has at least one filled rule.
  if (kind === 'rule-program') {
    const program = state.resolution.program as
      | { rules?: Record<string, unknown> }
      | undefined
    const hasAny = program?.rules && Object.keys(program.rules).length > 0
    return hasAny ? 'resolved' : 'unresolved'
  }
  // value-mapping is "resolved" once every source value has either a map
  // or a create decision (skips count as still-to-do).
  if (kind === 'value-mapping') {
    const decisions = state.resolution.decisions as
      | Record<
          string,
          | { kind: 'map'; canonicalValue?: string }
          | { kind: 'create' }
          | { kind: 'skip' }
        >
      | undefined
    if (!decisions) return 'unresolved'
    const entries = Object.values(decisions)
    const allDecided = entries.every(
      (d) => (d.kind === 'map' && !!d.canonicalValue) || d.kind === 'create',
    )
    return allDecided && entries.length > 0 ? 'resolved' : 'unresolved'
  }
  return 'resolved'
}

/* -------------------------------------------------------------------------- */
/* Tri-state checkbox                                                          */
/* -------------------------------------------------------------------------- */

export const StatusGlyph = ({ status }: { status: IssueStatus }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'grid size-5 shrink-0 place-items-center rounded-md border-2',
      status === 'resolved' &&
        'border-support-fg-green bg-support-fg-green text-text-primary-inverse',
      status === 'ignored' && 'border-border-tertiary bg-bg-tertiary',
      status === 'unresolved' && 'border-border-secondary bg-bg-primary',
    )}
  >
    {status === 'resolved' ? (
      // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — row text owns the label
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : null}
    {status === 'ignored' ? (
      // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — row text owns the label
      <svg
        width="12"
        height="2"
        viewBox="0 0 12 2"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="12" height="2" rx="1" fill="currentColor" />
      </svg>
    ) : null}
  </span>
)

/* -------------------------------------------------------------------------- */
/* Issue categories — drive the inbox grouping                                 */
/* -------------------------------------------------------------------------- */

export type IssueCategory = 'farms-and-fields' | 'file-structure' | 'data-types'

export const ISSUE_CATEGORY_LABEL: Record<IssueCategory, string> = {
  'farms-and-fields': 'Farms and Fields',
  'file-structure': 'File structure',
  'data-types': 'Data types',
}

export const CATEGORY_ORDER: IssueCategory[] = [
  'farms-and-fields',
  'file-structure',
  'data-types',
]

export const categoryForIssue = (issue: Issue): IssueCategory => {
  switch (issue.type) {
    case 'farm-missing':
    case 'field-missing':
    case 'field-missing-batch':
      return 'farms-and-fields'
    case 'schema-transformation':
      return 'file-structure'
    case 'value-mapping':
      return 'data-types'
    default:
      // Generic mapping-style issues sit alongside value mappings.
      return 'data-types'
  }
}

/* -------------------------------------------------------------------------- */
/* Issue summary copy                                                          */
/* -------------------------------------------------------------------------- */

export const issueLine = (
  issue: Issue,
): { headline: string; context: string } => {
  if (issue.type === 'farm-missing') {
    return {
      headline: `Unknown farm "${issue.sourceName}"`,
      context: 'Match to an existing farm or create a new one',
    }
  }
  if (issue.type === 'field-missing') {
    return {
      headline: `Unknown field "${issue.sourceName}"`,
      context: `On ${issue.farmName}`,
    }
  }
  if (issue.type === 'field-missing-batch') {
    const n = issue.sourceNames.length
    return {
      headline: `${n} unknown fields`,
      context: issue.suggestedFarmName
        ? `Looks like they belong to ${issue.suggestedFarmName}`
        : 'Attach to an existing farm',
    }
  }
  if (issue.type === 'schema-transformation') {
    return {
      headline: `Help us understand your file structure · ${issue.sheetName}`,
      context: issue.filename,
    }
  }
  if (issue.type === 'value-mapping') {
    const n = issue.sourceValues.length
    return {
      headline: `${n} unknown ${n === 1 ? 'value' : 'values'} in ${issue.sourceColumn}`,
      context: issue.targetLabel,
    }
  }
  return { headline: issue.title, context: `${issue.rows.length} rows` }
}

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

export type IssuesTableProps = {
  issues: Issue[]
  state: Record<string, IssueState>
  /** Open the resolver modal focused on this issue. */
  onIssueClick: (issueId: string) => void
}

export const IssuesTable = ({
  issues,
  state,
  onIssueClick,
}: IssuesTableProps) => {
  const unresolvedCount = issues.filter(
    (i) => statusForIssue(i, state[i.id]) === 'unresolved',
  ).length

  return (
    <Card className="flex flex-col p-0 overflow-hidden">
      <header className="px-5 py-4 border-b-2 border-border-tertiary">
        <h3 className="text-lg font-semibold text-text-primary">
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </h3>
        <p className="text-sm text-text-secondary">
          {unresolvedCount === 0
            ? 'All issues resolved.'
            : `${unresolvedCount} still need attention.`}
        </p>
      </header>
      {issues.length === 0 ? (
        <p className="px-5 py-6 text-md text-text-secondary">
          No issues found — Sandy matched everything in your upload.
        </p>
      ) : (
        <ul className="flex flex-col">
          {issues.map((issue) => {
            const status = statusForIssue(issue, state[issue.id])
            const { headline, context } = issueLine(issue)
            return (
              <li
                key={issue.id}
                className="border-b-2 border-border-tertiary last:border-0"
              >
                <button
                  type="button"
                  onClick={() => onIssueClick(issue.id)}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
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
      )}
    </Card>
  )
}
