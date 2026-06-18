import { type Field, FieldSchema } from '../types'
import { BROOKSIDE_FIELDS } from './brookside-fields'
import { ringAroundPoint } from './geo-helpers'

/**
 * Field fixtures. Each farm's fields are hand-defined here (no random
 * generation). Brookside Leys uses real GeoJSON boundaries imported from
 * `./brookside-fields`; the other farms still use deterministic rectangular
 * boundaries via `ringAroundPoint` until real coordinates are available.
 */
const FOXGLOVE_HILL_FIELDS: Field[] = [
  FieldSchema.parse({
    id: 'field-top-meadow',
    name: 'Top Meadow',
    farmId: 'farm-foxglove-hill',
    area: 4.2,
    crop: 'Winter wheat',
    boundary: [ringAroundPoint(-1.336, 52.066)],
  }),
  FieldSchema.parse({
    id: 'field-long-acre',
    name: 'Long Acre',
    farmId: 'farm-foxglove-hill',
    area: 6.8,
    crop: 'Spring barley',
    boundary: [ringAroundPoint(-1.34, 52.063, 0.003)],
  }),
  FieldSchema.parse({
    id: 'field-spinney',
    name: 'Spinney',
    farmId: 'farm-foxglove-hill',
    area: 2.1,
    crop: 'Permanent pasture',
    boundary: [ringAroundPoint(-1.334, 52.061, 0.0015)],
  }),
]

const AMBER_HARVEST_FIELDS: Field[] = [
  FieldSchema.parse({
    id: 'field-river-bend',
    name: 'River Bend',
    farmId: 'farm-amber-harvest',
    area: 3.6,
    crop: 'Winter oilseed rape',
    boundary: [ringAroundPoint(-1.484, 51.787)],
  }),
  FieldSchema.parse({
    id: 'field-south-ridge',
    name: 'South Ridge',
    farmId: 'farm-amber-harvest',
    area: 5.0,
    crop: 'Maize',
    boundary: [ringAroundPoint(-1.479, 51.783, 0.0025)],
  }),
]

export const FIELDS: Field[] = [
  ...FOXGLOVE_HILL_FIELDS,
  ...AMBER_HARVEST_FIELDS,
  ...BROOKSIDE_FIELDS,
]

export const getField = (id: string): Field | undefined =>
  FIELDS.find((f) => f.id === id)

export const getFieldsForFarm = (farmId: string): Field[] =>
  FIELDS.filter((f) => f.farmId === farmId)
