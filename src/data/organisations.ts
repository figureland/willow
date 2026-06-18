import { type Organisation, OrganisationSchema } from '../types'

/**
 * Organisation fixtures. Validated through the schema at module load — a
 * stray edit will throw before the app boots.
 */
export const ORGANISATIONS: Organisation[] = [
  OrganisationSchema.parse({
    id: 'org-whispering-willow',
    name: 'Whispering Willow Estates',
    farmIds: ['farm-foxglove-hill', 'farm-amber-harvest'],
  }),
  OrganisationSchema.parse({
    id: 'org-brookside',
    name: 'Brookside Holdings',
    farmIds: ['farm-brookside-leys'],
  }),
]

export const getOrganisation = (id: string): Organisation | undefined =>
  ORGANISATIONS.find((o) => o.id === id)
