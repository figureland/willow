import { FarmsTable, SummaryBar } from './SummaryCards'
import type { DetectionSummary } from './summary'

export const ReviewStep = ({ summary }: { summary: DetectionSummary }) => (
  <div className="flex flex-col gap-6">
    <h2 className="text-2xl font-semibold leading-9 text-text-primary">
      What we found in your data
    </h2>

    <SummaryBar totalRecords={summary.totalRecords} years={summary.years} />

    <FarmsTable farms={summary.farmRows} />
  </div>
)
