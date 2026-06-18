/**
 * Domain type barrel.
 *
 * Every core type is defined in its own file with both a zod schema and the
 * inferred TS type exported. Add new types as siblings — never inline a
 * schema in a component or page file.
 *
 * See ../CLAUDE.md → "Domain model" for the relationship between types.
 */

export { type Farm, FarmSchema } from './farm'
export { type Field, FieldSchema } from './field'
export {
  type Bbox,
  BboxSchema,
  type GeoJsonPolygon,
  GeoJsonPolygonSchema,
  type PolygonRing,
  PolygonRingSchema,
  type Position,
  PositionSchema,
  polygonOuterRing,
  ringCentroid,
  ringsToBbox,
  ringToBbox,
} from './geo'
export { type Organisation, OrganisationSchema } from './organisation'
export { isCentralAccount, type User, UserSchema } from './user'
