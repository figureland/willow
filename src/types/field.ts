import { z } from 'zod'
import { PolygonRingSchema } from './geo'

/**
 * A Field belongs to a Farm. It has a unique name within the farm, an area
 * (hectares), the current crop, and a boundary that will eventually be
 * rendered on a map. Centre coordinates are no longer modelled — derive
 * the centre from `boundary` at render time when needed.
 *
 * `boundary` is an array of independent closed rings: real fields are often
 * not contiguous (multiple parcels, fenced-off ponds, etc.), so each ring is
 * treated as its own filled outline rather than a single Polygon with holes.
 */
export const FieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  farmId: z.string().min(1),
  /** Area in hectares. */
  area: z.number().positive(),
  /** Current crop sown in the field. */
  crop: z.string().min(1),
  /** One or more closed rings making up the field boundary. */
  boundary: z.array(PolygonRingSchema).min(1),
})

export type Field = z.infer<typeof FieldSchema>
