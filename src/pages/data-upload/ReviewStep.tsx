import type { IssueState } from './IssueResolverModal'
import { IssuesInbox } from './IssuesInbox'
import type { Issue } from './issues'

export type ReviewStepProps = {
  issues: Issue[]
  issueState: Record<string, IssueState>
  onIssueStateChange: (next: Record<string, IssueState>) => void
}

/**
 * Refine step — full-bleed inbox layout. The wizard step renders this
 * bare (no outer padding / gap) so the inbox can run flush against the
 * wizard chrome on every side.
 */
export const ReviewStep = ({
  issues,
  issueState,
  onIssueStateChange,
}: ReviewStepProps) => (
  <IssuesInbox
    issues={issues}
    state={issueState}
    onStateChange={onIssueStateChange}
  />
)
