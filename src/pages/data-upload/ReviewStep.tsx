import type { IssueState } from './IssueResolverModal'
import { IssuesTable } from './IssuesTable'
import type { Issue } from './issues'
import { FarmsList, SummaryBar } from './SummaryCards'
import type { DetectionSummary } from './summary'

export type ReviewStepProps = {
  summary: DetectionSummary
  fileNames?: string[]
  issues: Issue[]
  issueState: Record<string, IssueState>
  onIssueClick: (issueId: string) => void
}

export const ReviewStep = ({
  summary,
  fileNames,
  issues,
  issueState,
  onIssueClick,
}: ReviewStepProps) => (
  <div className="flex flex-col gap-6">
    <h2 className="text-2xl font-semibold leading-9 text-text-primary">
      Let's fix some issues with your files
    </h2>

    <SummaryBar
      totalRecords={summary.totalRecords}
      years={summary.years}
      fileNames={fileNames}
    />

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <FarmsList farms={summary.farmRows} />
      <IssuesTable
        issues={issues}
        state={issueState}
        onIssueClick={onIssueClick}
      />
    </div>
  </div>
)
