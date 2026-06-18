import { Card } from '../../components/ui'

/** /my-farms/:orgId/:farmId/operations — placeholder. */
export const FarmOperations = () => (
  <Card>
    <header className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-text-primary">Operations</h2>
      <p className="text-sm text-text-secondary">
        Operations log, scheduled jobs and recent activity will live here.
      </p>
    </header>
  </Card>
)
