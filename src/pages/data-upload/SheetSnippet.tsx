import clsx from 'clsx'
import type { HighlightRef, Sheet } from './schema-transformation'

/* -------------------------------------------------------------------------- */
/* Sheet snippet — reusable preview with highlights + bottom fade             */
/* -------------------------------------------------------------------------- */

/** Number of rows visible before the bottom fade kicks in. */
export const SNIPPET_VISIBLE_ROWS = 5

const HIGHLIGHT_TINT: Record<HighlightRef['role'], string> = {
  source: 'bg-sandy-100',
  'lookup-return': 'bg-support-bg-green',
}

export type SheetSnippetProps = {
  sheet: Sheet
  /** Columns to tint as "source" / "lookup-return". */
  highlights: HighlightRef[]
  /**
   * Optional per-row preview of what the active rule resolves to. When any
   * entry is non-null a "→ resolves to" column is appended.
   */
  resolvedValues?: (string | null)[]
}

export const SheetSnippet = ({
  sheet,
  highlights,
  resolvedValues,
}: SheetSnippetProps) => {
  // Map column -> first matching role so each col can take at most one tint.
  const tintByColumn = new Map<string, HighlightRef['role']>()
  for (const ref of highlights) {
    if (
      ref.sheet === sheet.name &&
      ref.column &&
      !tintByColumn.has(ref.column)
    ) {
      tintByColumn.set(ref.column, ref.role)
    }
  }

  const visibleRows = sheet.sampleRows.slice(0, SNIPPET_VISIBLE_ROWS)
  const hasResolved = (resolvedValues ?? []).some((v) => v != null)

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-border-tertiary bg-bg-primary">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-bg-secondary">
            <tr>
              {sheet.columns.map((col) => {
                const tint = tintByColumn.get(col.name)
                return (
                  <th
                    key={col.name}
                    className={clsx(
                      'px-3 py-2 text-left font-semibold text-text-secondary whitespace-nowrap border-b-2 border-border-tertiary',
                      tint && HIGHLIGHT_TINT[tint],
                    )}
                  >
                    {col.name}
                  </th>
                )
              })}
              {hasResolved ? (
                <th className="px-3 py-2 text-left font-semibold text-text-brand-dark whitespace-nowrap border-b-2 border-border-tertiary bg-support-bg-green">
                  → resolves to
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIdx) => (
              <tr
                key={`${sheet.name}-${row[sheet.columns[0]?.name ?? ''] ?? rowIdx}`}
                className={
                  rowIdx === visibleRows.length - 1
                    ? ''
                    : 'border-b border-border-tertiary'
                }
              >
                {sheet.columns.map((col) => {
                  const tint = tintByColumn.get(col.name)
                  return (
                    <td
                      key={col.name}
                      className={clsx(
                        'px-3 py-2 text-text-primary whitespace-nowrap tabular-nums',
                        tint && HIGHLIGHT_TINT[tint],
                      )}
                    >
                      {row[col.name] ?? '—'}
                    </td>
                  )
                })}
                {hasResolved ? (
                  <td className="px-3 py-2 whitespace-nowrap bg-support-bg-green text-text-brand-dark font-semibold">
                    {resolvedValues?.[rowIdx] ?? '—'}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Smooth fade overlay at the bottom — reads as "more rows continue
          out of view" without rendering them. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-bg-primary"
      />
    </div>
  )
}
