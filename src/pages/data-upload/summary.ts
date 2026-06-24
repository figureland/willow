/**
 * Shared mock detection summary used by the Review step (display) and the
 * Data Upload wizard (issue resolver driven by per-farm errors).
 */

/**
 * Whether the farm appears in Sandy's records or is brand-new to this
 * upload. Drives the row styling + the "Farm not recognised" badge.
 */
export type FarmKind = 'matched' | 'unrecognised'

export type FarmSummary = {
  id: string
  name: string
  kind: FarmKind
  fieldCount: number
  /** Sample of detected field names — drives the simplified Review list. */
  fieldNames: string[]
  enterprises: string[]
  cropTypes: string[]
  errors?: string[]
}

export type DetectionSummary = {
  farms: { matched: number; unrecognised: number; total: number }
  fields: { matched: number; unrecognised: number; total: number }
  farmRows: FarmSummary[]
  /** Discrete years observed in the data, ascending. */
  years: number[]
  /** Total individual records found across all uploaded files. */
  totalRecords: number
}

const CROP_POOL = [
  'Winter wheat',
  'Oilseed rape',
  'Spring barley',
  'Grass ley',
  'Spring beans',
  'Winter oats',
  'Sugar beet',
  'Maize',
  'Permanent pasture',
  'Cover crop (clover)',
]

const ENTERPRISE_POOL = [
  'Arable',
  'Perennial',
  'Permanent grassland',
  'Mixed',
  'Horticulture',
]

const FIELD_NAME_POOL = [
  'Long Bottom',
  'Top East',
  'Stone Pightle',
  'Saltway',
  'Millpond',
  'Orchard Fold',
  "Cobbett's Hollow",
  'Mill Lane',
  'Lower Coppice',
  'Hayrick',
  'Marlpit',
  'Old Barn Field',
]

const FARM_NAME_POOL = [
  'Brookside Leys',
  'Foxglove Hill',
  'Amber Harvest Farm',
  'Heron Lea',
  'Wessex Downs',
  'Long Bottom',
]

const pickRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const pick = <T>(arr: T[], i: number): T => arr[i % arr.length]

const pickFromPool = (pool: string[], count: number) =>
  [...pool].sort(() => Math.random() - 0.5).slice(0, count)

export const generateSummary = (): DetectionSummary => {
  const totalFarms = pickRandomInt(3, 6)
  // 1–2 of the farms in the upload aren't in Sandy yet. Mark them so the
  // farms table can call them out and the issue resolver can include
  // farm-missing issues.
  const unrecognisedFarms = pickRandomInt(1, Math.min(2, totalFarms - 1))
  const matchedFarms = totalFarms - unrecognisedFarms

  // Per-farm field counts vary widely — anywhere from a single field up to a
  // sprawling 90-field estate, drawn independently so neighbouring farms can
  // be very different sizes.
  const perFarmFieldCounts = Array.from({ length: totalFarms }, () =>
    pickRandomInt(1, 90),
  )
  const totalFields = perFarmFieldCounts.reduce((a, b) => a + b, 0)

  // Fewer field-level errors so the per-farm batches feel manageable —
  // each farm gets 0–4 unrecognised fields.
  const farmNames = [...FARM_NAME_POOL].slice(0, totalFarms)
  // The first N farms are unrecognised. They keep their field count etc. but
  // also surface a farm-missing issue alongside any field issues.
  const farmRows: FarmSummary[] = farmNames.map((name, i) => {
    const kind: FarmKind = i < unrecognisedFarms ? 'unrecognised' : 'matched'
    const count = perFarmFieldCounts[i]
    // Cap the displayed field names to a reasonable handful so very large
    // farms don't blow out the layout; the full count is still tracked.
    const fieldNames = pickFromPool(
      FIELD_NAME_POOL,
      Math.min(FIELD_NAME_POOL.length, count),
    )
    return {
      id: `farm-${i}`,
      name,
      kind,
      fieldCount: count,
      fieldNames,
      enterprises: pickFromPool(ENTERPRISE_POOL, pickRandomInt(1, 3)),
      cropTypes: pickFromPool(
        CROP_POOL,
        Math.min(CROP_POOL.length, pickRandomInt(1, 10)),
      ),
      errors: [],
    }
  })

  // Guarantee at least one farm in the batch lands with ≥2 field errors so
  // the demo always surfaces the field-missing-batch flow alongside the
  // single field-missing path.
  const guaranteedBatchFarmIdx = pickRandomInt(0, farmRows.length - 1)
  for (let f = 0; f < farmRows.length; f++) {
    const farm = farmRows[f]
    const fieldErrorCount =
      f === guaranteedBatchFarmIdx ? pickRandomInt(3, 5) : pickRandomInt(0, 2)
    const errors: string[] = []
    if (farm.kind === 'unrecognised') {
      errors.push(`Farm "${farm.name}" not in Sandy`)
    }
    const used = new Set<string>()
    for (let i = 0; i < fieldErrorCount; i++) {
      let candidate = pick(FIELD_NAME_POOL, i + farm.id.charCodeAt(0))
      let attempts = 0
      while (used.has(candidate) && attempts < FIELD_NAME_POOL.length) {
        attempts++
        candidate = pick(FIELD_NAME_POOL, i + farm.id.charCodeAt(0) + attempts)
      }
      used.add(candidate)
      errors.push(`Unrecognised field "${candidate}"`)
    }
    farm.errors = errors
  }

  const unrecognisedFields = farmRows.reduce(
    (acc, f) => acc + (f.errors?.length ?? 0),
    0,
  )
  const matchedFields = totalFields - unrecognisedFields

  const years = [2024, 2025, 2026]
  const totalRecords = totalFields * years.length * 5 * pickRandomInt(2, 5)

  return {
    farms: {
      matched: matchedFarms,
      unrecognised: unrecognisedFarms,
      total: totalFarms,
    },
    fields: {
      matched: matchedFields,
      unrecognised: unrecognisedFields,
      total: totalFields,
    },
    farmRows,
    years,
    totalRecords,
  }
}

/** Total per-farm error count across the whole summary. */
export const totalErrorCount = (summary: DetectionSummary): number =>
  summary.farmRows.reduce((acc, f) => acc + (f.errors?.length ?? 0), 0)
