/**
 * Example database — one fixture file per domain type.
 *
 * Treat this directory like a swappable backend: the rest of the app should
 * import only from `@/data` (not from individual fixture files) so we can
 * later replace it with a real API client without touching consumers.
 *
 * Layout:
 *   data/
 *     users.ts          ← USERS, CENTRAL_USER, SINGLE_USER, getFarmsForUser
 *     organisations.ts  ← ORGANISATIONS, getOrganisation
 *     farms.ts          ← FARMS, getFarm, getFarmsForOrganisation
 *     fields.ts         ← FIELDS, getField, getFieldsForFarm
 *     geo-helpers.ts    ← ringAroundPoint (shared fixture helpers)
 *
 * Every fixture file validates its values through the zod schemas in
 * `src/types/` at module-load time, so a malformed edit throws before the
 * UI boots.
 */

export {
  FARMS,
  getFarm,
  getFarmsForOrganisation,
} from './farms'
export {
  FIELDS,
  getField,
  getFieldsForFarm,
} from './fields'
export { getOrganisation, ORGANISATIONS } from './organisations'
export {
  CENTRAL_USER,
  getFarmsForUser,
  SINGLE_USER,
  USERS,
} from './users'
