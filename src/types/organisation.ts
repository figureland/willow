import { z } from 'zod'

/**
 * An Organisation owns one or more Farms. Users with a "central account"
 * have access to multiple Organisations. The Organisation owns the Farms by
 * ID; Farms reference back to their `organisationId`.
 */
export const OrganisationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  farmIds: z.array(z.string()).default([]),
})

export type Organisation = z.infer<typeof OrganisationSchema>
