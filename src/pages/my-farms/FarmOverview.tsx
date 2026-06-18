import { useParams } from 'react-router-dom'
import { Card } from '../../components/ui'
import { getFarm, getFieldsForFarm } from '../../data'

/** /my-farms/:orgId/:farmId — overview tab. */
export const FarmOverview = () => {
  const { farmId } = useParams<{ farmId: string }>()
  const farm = farmId ? getFarm(farmId) : undefined
  if (!farm) return null

  const fields = getFieldsForFarm(farm.id)
  const [lng, lat] = farm.coordinates

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-text-primary">
            {farm.name}
          </h2>
          <p className="text-sm text-text-secondary">{farm.address}</p>
          <p className="font-mono text-xs text-text-secondary">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        </header>
      </Card>

      <Card>
        <dl className="grid grid-cols-2 gap-4 max-w-md">
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wider text-text-secondary">
              Fields
            </dt>
            <dd className="text-md text-text-primary">{fields.length}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wider text-text-secondary">
              Farm ID
            </dt>
            <dd className="font-mono text-sm text-text-primary">{farm.id}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
