import clsx from 'clsx'
import { useState } from 'react'
import { type CellHighlight, SheetSnippet } from '../SheetSnippet'
import type { HighlightRef, Sheet } from '../schema-transformation'
import { EXAMPLE_WORKBOOK } from '../schema-transformation'

/* -------------------------------------------------------------------------- */
/* SheetView — spreadsheet-style chrome around the SheetSnippet                */
/* -------------------------------------------------------------------------- */

const FileGlyph = () => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — filename next to it owns the label
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className="shrink-0 text-icon-secondary"
  >
    <path
      d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 2.41L17.59 9H15a1 1 0 0 1-1-1V5.41Z"
      fill="currentColor"
    />
  </svg>
)

export type SheetViewProps = {
  /** Filename rendered above the tab strip. */
  filename: string
  /** Tabs to display — falls back to the demo workbook's sheet list. */
  tabs?: Sheet[]
  /** Initial active tab name. */
  initialTab?: string
  /** Column highlights handed to the underlying snippet. */
  highlights: HighlightRef[]
  /** Optional per-cell highlights (used by value-mapping etc). */
  cellHighlights?: CellHighlight[]
}

export const SheetView = ({
  filename,
  tabs = EXAMPLE_WORKBOOK.sheets,
  initialTab,
  highlights,
  cellHighlights,
}: SheetViewProps) => {
  const [activeTab, setActiveTab] = useState<string>(
    initialTab ?? tabs[0]?.name ?? '',
  )
  const sheet = tabs.find((s) => s.name === activeTab) ?? tabs[0]

  return (
    <div className="flex flex-col gap-2">
      {/* Filename row — minimal, no chip strip, no background container. */}
      <div className="flex items-center gap-2 text-md font-semibold text-text-primary">
        <FileGlyph />
        <span className="truncate">{filename}</span>
      </div>

      {/* Tab strip + table fused like a real spreadsheet editor. The active
          tab carries the same bg as the table body so the bottom border
          drops away where they meet. Inactive tabs sit quietly underneath
          a shared baseline. */}
      <div className="flex flex-col">
        <div className="flex flex-wrap items-end gap-1 px-1">
          {tabs.map((t) => {
            const isActive = t.name === activeTab
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setActiveTab(t.name)}
                className={clsx(
                  'rounded-t-md border-2 border-b-0 px-3 py-1.5 text-sm font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
                  isActive
                    ? 'relative top-px bg-bg-primary text-text-primary border-border-tertiary'
                    : 'bg-bg-tertiary text-text-secondary border-transparent hover:bg-bg-secondary',
                )}
              >
                {t.name}
              </button>
            )
          })}
        </div>

        {sheet ? (
          <SheetSnippet
            sheet={sheet}
            highlights={highlights}
            cellHighlights={cellHighlights}
          />
        ) : (
          <p className="text-md text-text-secondary">
            No sample data available.
          </p>
        )}
      </div>
    </div>
  )
}
