import type { IssueState } from './issue-state'
import type { Issue } from './issues'
import { RefinePage } from './refine/RefinePage'
import type { DetectionSummary } from './summary'

export type ReviewStepProps = {
  summary: DetectionSummary
  issues: Issue[]
  issueState: Record<string, IssueState>
  onIssueStateChange: (next: Record<string, IssueState>) => void
}

/** Refine step — full-page carousel: summary, then issue panels by type. */
export const ReviewStep = ({
  summary,
  issues,
  issueState,
  onIssueStateChange,
}: ReviewStepProps) => (
  <RefinePage
    summary={summary}
    issues={issues}
    state={issueState}
    onStateChange={onIssueStateChange}
  />
)
