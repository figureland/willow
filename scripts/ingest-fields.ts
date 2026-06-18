#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, relative, resolve } from 'node:path'
import { z } from 'zod'
import { type Field, FieldSchema } from '../src/types'
import { type PolygonRing, PolygonRingSchema } from '../src/types/geo'

/**
 * Ingest a GeoJSON-style export ({ data: [{ id, geometry: { type, coordinates } }, ...] })
 * and emit a typed `Field[]` fixture file ready to drop into `src/data/`.
 *
 * Usage:
 *   bun scripts/ingest-fields.ts <input.json> [--out <output.ts>]
 *                                              [--farm-id <id>]
 *                                              [--crop <crop>]
 *                                              [--name-prefix <prefix>]
 *                                              [--export-name <SYMBOL>]
 *
 * Required:
 *   <input.json>      Path to the source JSON. Shape: { data: [{ id, geometry }] }
 *                     where geometry is a GeoJSON Polygon or MultiPolygon.
 *
 * Optional:
 *   --out             Output path. Defaults to `src/data/<input-basename>.ts`.
 *   --farm-id         Farm id every emitted Field is assigned to.
 *                     Defaults to "farm-imported".
 *   --crop            Crop string applied to every field. Defaults to "Unknown".
 *   --name-prefix     Human-readable name prefix; fields are numbered
 *                     "<prefix> 1", "<prefix> 2", … Defaults to "Field".
 *   --export-name     Symbol the fixture array is exported as.
 *                     Defaults to "IMPORTED_FIELDS".
 *
 * Prints the number of fields written.
 */

const InputSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string().min(1),
        geometry: z.discriminatedUnion('type', [
          z.object({
            type: z.literal('Polygon'),
            coordinates: z.array(PolygonRingSchema).min(1),
          }),
          z.object({
            type: z.literal('MultiPolygon'),
            coordinates: z.array(z.array(PolygonRingSchema).min(1)).min(1),
          }),
        ]),
      }),
    )
    .min(1),
})

type CliArgs = {
  input: string
  out?: string
  farmId: string
  crop: string
  namePrefix: string
  exportName: string
}

const parseArgs = (argv: string[]): CliArgs => {
  const args: Partial<CliArgs> = {}
  const positional: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--out') args.out = argv[++i]
    else if (arg === '--farm-id') args.farmId = argv[++i]
    else if (arg === '--crop') args.crop = argv[++i]
    else if (arg === '--name-prefix') args.namePrefix = argv[++i]
    else if (arg === '--export-name') args.exportName = argv[++i]
    else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`)
    else positional.push(arg)
  }

  const input = positional[0]
  if (!input) {
    throw new Error(
      'Missing <input.json>. Usage: bun scripts/ingest-fields.ts <input.json> [--out ...] [--farm-id ...] [--crop ...] [--name-prefix ...] [--export-name ...]',
    )
  }

  return {
    input,
    out: args.out,
    farmId: args.farmId ?? 'farm-imported',
    crop: args.crop ?? 'Unknown',
    namePrefix: args.namePrefix ?? 'Field',
    exportName: args.exportName ?? 'IMPORTED_FIELDS',
  }
}

/** Slug-safe id: lowercase, hyphenate non-alphanumerics, trim trailing dashes. */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Shoelace area on raw lng/lat → square degrees, then converted to square
 * metres using the WGS84 spherical approximation at the ring's mean
 * latitude. Good enough for hectare-scale field display; not survey-grade.
 */
const ringAreaM2 = (ring: PolygonRing): number => {
  let sum = 0
  let latSum = 0
  const n = ring.length - 1 // last position duplicates the first
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    sum += x1 * y2 - x2 * y1
    latSum += y1
  }
  const meanLatRad = ((latSum / n) * Math.PI) / 180
  const metersPerDegLat = 111_132
  const metersPerDegLng = 111_320 * Math.cos(meanLatRad)
  const areaDeg2 = Math.abs(sum) / 2
  return areaDeg2 * metersPerDegLat * metersPerDegLng
}

const ringsToAreaHa = (rings: PolygonRing[]): number =>
  rings.reduce((acc, r) => acc + ringAreaM2(r), 0) / 10_000

const flattenGeometry = (
  geometry:
    | { type: 'Polygon'; coordinates: PolygonRing[] }
    | { type: 'MultiPolygon'; coordinates: PolygonRing[][] },
): PolygonRing[] => {
  if (geometry.type === 'Polygon') return geometry.coordinates
  // MultiPolygon: flatten every polygon's outer ring (we don't model holes,
  // so we drop everything past index 0 within each polygon).
  return geometry.coordinates.map((poly) => poly[0])
}

const formatField = (field: Field): string => {
  const ringsLiteral = field.boundary
    .map((ring) => {
      const positions = ring
        .map(([lng, lat]) => `      [${lng}, ${lat}],`)
        .join('\n')
      return `    [\n${positions}\n    ],`
    })
    .join('\n')
  return `  FieldSchema.parse({
    id: ${JSON.stringify(field.id)},
    name: ${JSON.stringify(field.name)},
    farmId: ${JSON.stringify(field.farmId)},
    area: ${field.area},
    crop: ${JSON.stringify(field.crop)},
    boundary: [
${ringsLiteral}
    ],
  }),`
}

const formatFile = (
  exportName: string,
  fields: Field[],
  typesImportPath: string,
): string =>
  `import { type Field, FieldSchema } from '${typesImportPath}'

/**
 * Auto-generated by scripts/ingest-fields.ts. Do not hand-edit individual
 * entries; re-run the script against the source JSON to regenerate.
 */
export const ${exportName}: Field[] = [
${fields.map(formatField).join('\n')}
]
`

const run = async () => {
  const args = parseArgs(Bun.argv.slice(2))
  const inputPath = resolve(process.cwd(), args.input)
  const raw = await readFile(inputPath, 'utf8')
  const parsed = InputSchema.parse(JSON.parse(raw))

  const fields: Field[] = parsed.data.map((entry, i) => {
    const rings = flattenGeometry(entry.geometry)
    const area = Number(ringsToAreaHa(rings).toFixed(2))
    return FieldSchema.parse({
      id: `field-${slugify(entry.id)}`,
      name: `${args.namePrefix} ${i + 1}`,
      farmId: args.farmId,
      area,
      crop: args.crop,
      boundary: rings,
    })
  })

  const outPath = args.out
    ? resolve(process.cwd(), args.out)
    : resolve(
        process.cwd(),
        'src/data',
        `${basename(inputPath, extname(inputPath))}.ts`,
      )

  await mkdir(dirname(outPath), { recursive: true })

  // Resolve the import path the generated file should use to reach
  // `src/types`. Relative to the output file's directory.
  const typesAbs = resolve(process.cwd(), 'src/types')
  let typesImport = relative(dirname(outPath), typesAbs)
  if (!typesImport.startsWith('.')) typesImport = `./${typesImport}`
  typesImport = typesImport.replace(/\\/g, '/')

  await writeFile(
    outPath,
    formatFile(args.exportName, fields, typesImport),
    'utf8',
  )

  console.log(`Wrote ${fields.length} fields → ${outPath}`)
  return fields.length
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
