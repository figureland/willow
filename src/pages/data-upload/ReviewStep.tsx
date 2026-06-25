import type { IssueState } from './IssueResolverModal'
import type { Issue } from './issues'
import { RefinePage } from './refine/RefinePage'

export type ReviewStepProps = {
  issues: Issue[]
  issueState: Record<string, IssueState>
  onIssueStateChange: (next: Record<string, IssueState>) => void
}

/** Refine step — vertically stacked categorised issue cards. */
export const ReviewStep = ({
  issues,
  issueState,
  onIssueStateChange,
}: ReviewStepProps) => (
  <RefinePage
    issues={issues}
    state={issueState}
    onStateChange={onIssueStateChange}
  />
)
