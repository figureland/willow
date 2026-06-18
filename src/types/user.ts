import { z } from 'zod'

/**
 * A User authenticates into the app. A user's relationship to data is one of:
 *
 *   1. "Central account"  — has rights across multiple Organisations
 *      (organisationIds.length > 0)
 *   2. "Single account"   — has direct rights on multiple Farms, no
 *      Organisation in between (farmIds.length > 0, organisationIds empty)
 *
 * Either may be populated, but in practice a real user is one shape OR the
 * other. UI uses `User.organisationIds.length > 0` to decide whether to show
 * the Organisation switcher.
 */
export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  /** Organisations the user has access to (central account). */
  organisationIds: z.array(z.string()).default([]),
  /** Farms the user has direct access to (single account). */
  farmIds: z.array(z.string()).default([]),
})

export type User = z.infer<typeof UserSchema>

/** True when the user has access to multiple organisations. */
export const isCentralAccount = (user: User): boolean =>
  user.organisationIds.length > 0
