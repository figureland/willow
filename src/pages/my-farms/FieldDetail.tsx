import { Card, MapView } from '../../components/ui'
import type { Field } from '../../types'

export type FieldDetailProps = {
  field: Field
  farmName?: string
}

/**
 * Reusable field-detail content. Rendered as the body of the SideSheet on
 * /my-farms/:orgId/:farmId/fields-and-crops/:fieldId, but the same component
 * can be reused in a full-page view later if we want.
 */
export const FieldDetail = ({ field, farmName }: FieldDetailProps) => (
  <div className="flex flex-col gap-4">
    <Card>
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-text-primary">
          {field.name}
        </h2>
        {farmName ? (
          <p className="text-sm text-text-secondary">{farmName}</p>
        ) : null}
      </header>
      <dl className="grid grid-cols-2 gap-4 mt-4 max-w-md">
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wider text-text-secondary">
            Area
          </dt>
          <dd className="text-md text-text-primary tabular-nums">
            {field.area.toFixed(1)} ha
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs uppercase tracking-wider text-text-secondary">
            Crop
          </dt>
          <dd className="text-md text-text-primary">{field.crop}</dd>
        </div>
      </dl>
    </Card>

    <MapView
      polygons={[{ id: field.id, name: field.name, rings: field.boundary }]}
      selected={[field.id]}
      height={360}
      fitPadding={48}
      showLabels={false}
      ariaLabel={`Map of ${field.name}`}
    />
  </div>
)
