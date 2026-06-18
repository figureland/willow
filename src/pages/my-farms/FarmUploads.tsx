import { Card } from '../../components/ui'

/** /my-farms/:orgId/:farmId/uploads — placeholder. */
export const FarmUploads = () => (
  <Card>
    <header className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold text-text-primary">Uploads</h2>
      <p className="text-sm text-text-secondary">
        Imports, scans and document uploads associated with this farm.
      </p>
    </header>
  </Card>
)
