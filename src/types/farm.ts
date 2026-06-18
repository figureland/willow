import { z } from 'zod'
import { PositionSchema } from './geo'

/**
 * A Farm has a primary location (lat/lng point) and an address. It belongs
 * to an Organisation (organisationId). Field membership is derived from
 * `Field.farmId` via `getFieldsForFarm(farmId)`, so it is not modelled
 * twice on this side.
 */
export const FarmSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  organisationId: z.string().min(1),
  /** Centre point of the farmstead — [longitude, latitude]. */
  coordinates: PositionSchema,
})

export type Farm = z.infer<typeof FarmSchema>
