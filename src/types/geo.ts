import { z } from 'zod'

/**
 * GeoJSON-style coordinate primitives, kept narrow on purpose so all domain
 * types in this prototype agree on shape and ordering.
 *
 *   Position    = [longitude, latitude]
 *   PolygonRing = a closed ring of Positions (first === last)
 *
 * The first ring of a polygon is the outer boundary; subsequent rings (not
 * modelled yet) would be holes.
 */

export const PositionSchema = z
  .tuple([
    z.number().gte(-180).lte(180), // longitude
    z.number().gte(-90).lte(90), // latitude
  ])
  .describe('Position: [longitude, latitude]')

export type Position = z.infer<typeof PositionSchema>

export const PolygonRingSchema = z
  .array(PositionSchema)
  .min(4, 'A polygon ring needs at least 4 positions (3 corners + closure)')
  .describe('Closed ring of Positions. First === last.')

export type PolygonRing = z.infer<typeof PolygonRingSchema>

/**
 * Minimal GeoJSON Polygon shape so we can ingest the example files (which
 * carry `geometry: { type: "Polygon", coordinates: [ring] }`) without
 * inventing yet another representation.
 *
 * Only the outer ring is modelled today — holes can be added later.
 */
export const GeoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(PolygonRingSchema).min(1),
})

export type GeoJsonPolygon = z.infer<typeof GeoJsonPolygonSchema>

/**
 * Axis-aligned bounding box. We use GeoJSON's [west, south, east, north]
 * ordering so it can be passed straight to MapLibre's `fitBounds`.
 */
export const BboxSchema = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .describe('Bbox: [west, south, east, north]')

export type Bbox = z.infer<typeof BboxSchema>

/** Compute a bbox for a single PolygonRing. */
export const ringToBbox = (ring: PolygonRing): Bbox => {
  let west = Number.POSITIVE_INFINITY
  let east = Number.NEGATIVE_INFINITY
  let south = Number.POSITIVE_INFINITY
  let north = Number.NEGATIVE_INFINITY
  for (const [lng, lat] of ring) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [west, south, east, north]
}

/** Compute the union bbox of many rings. Returns null on empty input. */
export const ringsToBbox = (rings: PolygonRing[]): Bbox | null => {
  if (rings.length === 0) return null
  let [west, south, east, north]: Bbox = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]
  for (const ring of rings) {
    const [w, s, e, n] = ringToBbox(ring)
    if (w < west) west = w
    if (s < south) south = s
    if (e > east) east = e
    if (n > north) north = n
  }
  return [west, south, east, north]
}

/** Extract the outer ring from a GeoJSON Polygon. */
export const polygonOuterRing = (polygon: GeoJsonPolygon): PolygonRing =>
  polygon.coordinates[0]

/**
 * Centroid of the bounding box of a ring. Cheap to compute and stable when
 * the polygon is convex enough — good enough for label placement on field-
 * shaped polygons. For irregular shapes we can switch to a polylabel /
 * pole-of-inaccessibility algorithm later without changing callers.
 */
export const ringCentroid = (ring: PolygonRing): Position => {
  const [west, south, east, north] = ringToBbox(ring)
  return [(west + east) / 2, (south + north) / 2]
}
