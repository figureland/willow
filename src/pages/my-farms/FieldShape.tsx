import { type PolygonRing, ringsToBbox } from '../../types'

export type FieldShapeProps = {
  rings: PolygonRing[]
  /** Edge length of the rendered SVG, in px. */
  size?: number
  /** Inner padding so the shape doesn't kiss the box edges. */
  padding?: number
  className?: string
}

/**
 * Tiny inline thumbnail of a field's outline. Projects lng/lat into the
 * SVG viewBox, flipping Y (north is up) and preserving aspect ratio so a
 * long thin field doesn't get squashed into a square. Fast enough to render
 * once per data-table row.
 */
export const FieldShape = ({
  rings,
  size = 32,
  padding = 2,
  className,
}: FieldShapeProps) => {
  if (rings.length === 0) return null
  const bbox = ringsToBbox(rings)
  if (!bbox) return null
  const [west, south, east, north] = bbox
  const width = east - west || 1
  const height = north - south || 1
  const inner = size - padding * 2
  const scale = inner / Math.max(width, height)
  const offsetX = padding + (inner - width * scale) / 2
  const offsetY = padding + (inner - height * scale) / 2

  const project = ([lng, lat]: [number, number]): [number, number] => [
    offsetX + (lng - west) * scale,
    // Flip Y so north is up.
    offsetY + (north - lat) * scale,
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      <title>Field outline</title>
      {rings.map((ring, i) => {
        const d = ring
          .map((position, j) => {
            const [x, y] = project(position)
            return `${j === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
          })
          .join(' ')
        return (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: rings are stable per row
            key={i}
            d={`${d} Z`}
            fill="var(--color-bg-brand-primary)"
            fillOpacity={0.35}
            stroke="var(--color-bg-brand-primary)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )
      })}
    </svg>
  )
}
