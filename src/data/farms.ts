import { type Farm, FarmSchema } from '../types'

/**
 * Farm fixtures. Each Farm belongs to one Organisation by id. Field
 * membership is derived from `Field.farmId` via `getFieldsForFarm`, so it
 * is not duplicated on this side.
 */
export const FARMS: Farm[] = [
  FarmSchema.parse({
    id: 'farm-foxglove-hill',
    name: 'Foxglove Hill',
    address: 'Foxglove Lane, Banbury, Oxfordshire OX17 3AA',
    organisationId: 'org-brookside',
    coordinates: [-1.337, 52.064],
  }),
  FarmSchema.parse({
    id: 'farm-amber-harvest',
    name: 'Amber Harvest Farm',
    address: 'Mill Road, Witney, Oxfordshire OX28 4JJ',
    organisationId: 'org-brookside',
    coordinates: [-1.482, 51.785],
  }),
  FarmSchema.parse({
    id: 'farm-brookside-leys',
    name: 'Brookside Leys',
    address: 'Brookside Lane, Pershore, Worcestershire WR10 2HQ',
    organisationId: 'org-brookside',
    coordinates: [-0.135, 52.42],
  }),
]

export const getFarm = (id: string): Farm | undefined =>
  FARMS.find((f) => f.id === id)

export const getFarmsForOrganisation = (orgId: string): Farm[] =>
  FARMS.filter((f) => f.organisationId === orgId)
