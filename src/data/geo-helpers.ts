import type { PolygonRing } from '../types'

/**
 * Shared helpers used by the fixture files. Keep purely deterministic so
 * fixtures stay reproducible across reloads.
 */

/** Closed rectangular ring around a centre `[lng, lat]` of half-width `delta`. */
export const ringAroundPoint = (
  lng: number,
  lat: number,
  delta = 0.002,
): PolygonRing => [
  [lng - delta, lat - delta],
  [lng + delta, lat - delta],
  [lng + delta, lat + delta],
  [lng - delta, lat + delta],
  [lng - delta, lat - delta],
]
