import clsx from 'clsx'
import { useMemo, useState } from 'react'
import {
  COMPLETENESS_SUMMARY,
  type CompletenessImprovement,
  type CompletenessSummaryNode,
  type Dimension,
  type Pct,
} from './completeness-summary'

/* -------------------------------------------------------------------------- */
/* CompletenessSummary — three-column grid with before/after projections       */
/* -------------------------------------------------------------------------- */

const DIMENSIONS: Dimension[] = ['required', 'encouraged', 'optional']

const DIMENSION_LABEL: Record<Dimension, string> = {
  required: 'Required',
  encouraged: 'Encouraged',
  optional: 'Optional',
}

type ToneKey = 'good' | 'okay' | 'poor' | 'neutral'

const toneFor = (pct: Pct): ToneKey => {
  if (pct === null || pct === 'na') return 'neutral'
  if (pct >= 80) return 'good'
  if (pct >= 50) return 'okay'
  return 'poor'
}

const TONE_TEXT: Record<ToneKey, string> = {
  good: 'text-text-brand-dark',
  okay: 'text-support-fg-amber',
  poor: 'text-support-fg-red',
  neutral: 'text-text-secondary',
}

const formatPct = (pct: Pct): string => {
  if (pct === 'na') return 'N/A'
  if (pct === null) return '—'
  return `${pct}%`
}

/* -------------------------------------------------------------------------- */
/* Projection — apply improvements + roll up summary rows                      */
/* -------------------------------------------------------------------------- */

type Projection = Record<
  string,
  { required: Pct; encouraged: Pct; optional: Pct }
>

/**
 * Build a `nodeId -> {required, encouraged, optional}` map. For leaf rows
 * the value is the baseline plus any applicable delta (capped at 100). For
 * summary rows, the projected percentages are the mean of their children's
 * projected values per dimension — `na` and `null` children are ignored.
 */
const project = (
  root: CompletenessSummaryNode,
  improvements: CompletenessImprovement[],
): Projection => {
  // Group deltas by nodeId for O(1) lookup.
  const deltaByNode = new Map<string, Partial<Record<Dimension, number>>>()
  for (const imp of improvements) {
    const bucket = deltaByNode.get(imp.nodeId) ?? {}
    bucket[imp.dimension] = (bucket[imp.dimension] ?? 0) + imp.deltaPct
    deltaByNode.set(imp.nodeId, bucket)
  }

  const out: Projection = {}

  const visit = (
    node: CompletenessSummaryNode,
  ): { required: Pct; encouraged: Pct; optional: Pct } => {
    if (node.children.length === 0) {
      // Leaf — apply any delta on top of the baseline.
      const deltas = deltaByNode.get(node.id) ?? {}
      const compute = (dim: Dimension): Pct => {
        const base = node.pct[dim]
        const delta = deltas[dim]
        if (delta === undefined) return base
        if (base === 'na' || base === null) return Math.min(100, delta)
        return Math.min(100, base + delta)
      }
      const projected = {
        required: compute('required'),
        encouraged: compute('encouraged'),
        optional: compute('optional'),
      }
      out[node.id] = projected
      return projected
    }
    // Summary — recurse first, then average children that contributed real
    // numbers (skip na / null so they don't pull the mean down to 0).
    const childProjections = node.children.map(visit)
    const avg = (dim: Dimension): Pct => {
      const nums: number[] = []
      for (const cp of childProjections) {
        const v = cp[dim]
        if (typeof v === 'number') nums.push(v)
      }
      // If every child was na/null we preserve the baseline's flavour.
      if (nums.length === 0) return node.pct[dim]
      return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
    }
    const projected = {
      required: avg('required'),
      encouraged: avg('encouraged'),
      optional: avg('optional'),
    }
    out[node.id] = projected
    return projected
  }

  visit(root)
  return out
}

const isImproved = (base: Pct, projected: Pct): boolean => {
  if (typeof projected !== 'number') return false
  if (base === 'na' || base === null) return projected > 0
  return projected > base
}

/* -------------------------------------------------------------------------- */
/* Chevron                                                                     */
/* -------------------------------------------------------------------------- */

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={clsx(
      'shrink-0 text-icon-secondary transition-transform duration-150',
      open ? 'rotate-90' : 'rotate-0',
    )}
  >
    <title>Toggle section</title>
    <path
      d="M9 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/* -------------------------------------------------------------------------- */
/* Pct cell — renders the projected value, with before/after when improved     */
/* -------------------------------------------------------------------------- */

const PctCell = ({ base, projected }: { base: Pct; projected: Pct }) => {
  const improved = isImproved(base, projected)
  if (improved) {
    return (
      <span className="flex items-baseline justify-end gap-1.5 tabular-nums">
        <span className="text-xs text-text-secondary line-through">
          {formatPct(base)}
        </span>
        <span className="text-sm font-semibold text-text-brand-dark">
          {formatPct(projected)}
        </span>
      </span>
    )
  }
  return (
    <span
      className={clsx(
        'block text-right text-sm tabular-nums',
        TONE_TEXT[toneFor(projected)],
        projected === null && 'opacity-50',
      )}
    >
      {formatPct(projected)}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

const ROW_GRID =
  'grid grid-cols-[1fr_120px_120px_120px] items-center gap-3 px-3 py-2'

const Row = ({
  node,
  depth,
  openIds,
  toggle,
  projection,
}: {
  node: CompletenessSummaryNode
  depth: number
  openIds: Set<string>
  toggle: (id: string) => void
  projection: Projection
}) => {
  const isOpen = openIds.has(node.id)
  const expandable = node.isSummary && node.children.length > 0

  const indent = depth * 24
  const projected = projection[node.id] ?? node.pct

  return (
    <>
      {expandable ? (
        <button
          type="button"
          onClick={() => toggle(node.id)}
          aria-expanded={isOpen}
          className={clsx(
            ROW_GRID,
            'w-full text-left transition-colors',
            'hover:bg-bg-tertiary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
          )}
          style={{ paddingLeft: indent + 12 }}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Chevron open={isOpen} />
            <span
              className={clsx(
                'min-w-0 truncate',
                depth === 0
                  ? 'text-md font-semibold text-text-primary'
                  : 'text-sm font-medium text-text-primary',
              )}
            >
              {node.label}
            </span>
          </span>
          <PctCell base={node.pct.required} projected={projected.required} />
          <PctCell
            base={node.pct.encouraged}
            projected={projected.encouraged}
          />
          <PctCell base={node.pct.optional} projected={projected.optional} />
        </button>
      ) : (
        <div className={ROW_GRID} style={{ paddingLeft: indent + 12 + 16 }}>
          <span className="min-w-0 truncate text-sm text-text-secondary">
            {node.label}
          </span>
          <PctCell base={node.pct.required} projected={projected.required} />
          <PctCell
            base={node.pct.encouraged}
            projected={projected.encouraged}
          />
          <PctCell base={node.pct.optional} projected={projected.optional} />
        </div>
      )}

      {expandable && isOpen ? (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <Row
              key={child.id}
              node={child}
              depth={depth + 1}
              openIds={openIds}
              toggle={toggle}
              projection={projection}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Top-level summary                                                           */
/* -------------------------------------------------------------------------- */

export type CompletenessSummaryProps = {
  /**
   * Improvements that have been accepted by the user. The summary applies
   * these on top of the baseline rollup and surfaces the projected values
   * with a green before/after badge.
   */
  appliedImprovements?: CompletenessImprovement[]
}

export const CompletenessSummary = ({
  appliedImprovements = [],
}: CompletenessSummaryProps) => {
  // Default open set — domain open; standards + nested summaries collapsed.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set([COMPLETENESS_SUMMARY.id]),
  )
  const toggle = (id: string) =>
    setOpenIds((curr) => {
      const next = new Set(curr)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const projection = useMemo(
    () => project(COMPLETENESS_SUMMARY, appliedImprovements),
    [appliedImprovements],
  )

  return (
    <section className="flex flex-col gap-1 rounded-xl border-2 border-border-tertiary bg-bg-primary">
      <header
        className={clsx(
          ROW_GRID,
          'border-b-2 border-border-tertiary text-xs font-semibold uppercase tracking-wide text-text-secondary',
        )}
      >
        <span>Section</span>
        {DIMENSIONS.map((d) => (
          <span key={d} className="text-right">
            {DIMENSION_LABEL[d]}
          </span>
        ))}
      </header>
      <div className="flex flex-col py-1">
        <Row
          node={COMPLETENESS_SUMMARY}
          depth={0}
          openIds={openIds}
          toggle={toggle}
          projection={projection}
        />
      </div>
    </section>
  )
}
