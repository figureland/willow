import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/ui'
import {
  getFarmsForOrganisation,
  getFieldsForFarm,
  getOrganisation,
} from '../../data'

/**
 * /my-farms/:orgId — overview of a single organisation. Renders the farms
 * the org owns as a responsive grid of 2:1 cards, each linking into its
 * per-farm landing page.
 */
export const OrganisationOverview = () => {
  const { orgId } = useParams<{ orgId: string }>()
  if (!orgId) return null

  const organisation = getOrganisation(orgId)
  if (!organisation) {
    return (
      <Card>
        <p className="text-text-secondary">Organisation not found.</p>
      </Card>
    )
  }

  const farms = getFarmsForOrganisation(orgId)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {farms.map((farm) => {
        const fieldCount = getFieldsForFarm(farm.id).length
        return (
          <Link
            key={farm.id}
            to={`/my-farms/${orgId}/${farm.id}`}
            className="group block transition-transform duration-200 ease-out hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40 focus-visible:ring-offset-2 rounded-xl"
          >
            <article
              className="aspect-[2/1] flex flex-col justify-between rounded-xl border-2 border-border-tertiary bg-bg-primary p-6 transition-colors group-hover:border-border-secondary-hover"
              aria-label={`${farm.name}, ${fieldCount} field${fieldCount === 1 ? '' : 's'}`}
            >
              <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-text-primary truncate">
                  {farm.name}
                </h3>
                <p className="text-sm text-text-secondary line-clamp-2">
                  {farm.address}
                </p>
              </header>

              <footer className="flex items-baseline justify-between gap-3">
                <span className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-text-secondary">
                    Fields
                  </span>
                  <span className="text-2xl font-semibold leading-9 text-text-primary tabular-nums">
                    {fieldCount}
                  </span>
                </span>
                <span className="text-sm text-text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </footer>
            </article>
          </Link>
        )
      })}
    </div>
  )
}
