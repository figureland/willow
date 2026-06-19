import { type Organisation, OrganisationSchema } from '../types'

/**
 * Organisation fixtures. Validated through the schema at module load — a
 * stray edit will throw before the app boots.
 */
export const ORGANISATIONS: Organisation[] = [
  OrganisationSchema.parse({
    id: 'org-brookside',
    name: 'Brookside Holdings',
    farmIds: [
      'farm-brookside-leys',
      'farm-foxglove-hill',
      'farm-amber-harvest',
    ],
  }),
]

export const getOrganisation = (id: string): Organisation | undefined =>
  ORGANISATIONS.find((o) => o.id === id)
