import { type User, UserSchema } from '../types'
import { FARMS } from './farms'

/**
 * User fixtures. Two shapes are seeded so the UI can be exercised against
 * both account types:
 *
 *   - CENTRAL_USER: access to multiple Organisations. Shows the org switcher.
 *   - SINGLE_USER:  access to specific Farms only. No org switcher.
 */

export const CENTRAL_USER: User = UserSchema.parse({
  id: 'user-toby',
  name: 'Toby Milner-Gulland',
  email: 'toby@figure.land',
  organisationIds: ['org-whispering-willow', 'org-brookside'],
  farmIds: [],
})

export const SINGLE_USER: User = UserSchema.parse({
  id: 'user-sam',
  name: 'Sam Field',
  email: 'sam@example.com',
  organisationIds: [],
  farmIds: ['farm-amber-harvest', 'farm-brookside-leys'],
})

export const USERS: User[] = [CENTRAL_USER, SINGLE_USER]

/**
 * Farms a user can see, regardless of account shape.
 *  - Central account → every farm under the user's organisations.
 *  - Single account  → just the farms the user is attached to directly.
 */
export const getFarmsForUser = (user: User) => {
  if (user.organisationIds.length > 0) {
    return FARMS.filter((f) => user.organisationIds.includes(f.organisationId))
  }
  return FARMS.filter((f) => user.farmIds.includes(f.id))
}
