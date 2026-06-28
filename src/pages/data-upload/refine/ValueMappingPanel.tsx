import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Button, Select } from '../../../components/ui'
import type { IssueState } from '../IssueResolverModal'
import type { ValueMappingIssue } from '../issues'
import type { CellHighlight } from '../SheetSnippet'
import { SheetSnippet } from '../SheetSnippet'
import {
  EXAMPLE_WORKBOOK,
  type HighlightRef,
  type Sheet,
} from '../schema-transformation'
import type { ValueMappingDecisions } from '../value-mapping'
import {
  DescribeTray,
  DescribeTrigger,
  useDescribeAutoOpen,
} from './DescribeTray'

/* -------------------------------------------------------------------------- */
/* ValueMappingPanel — 50/50 mapping list + source preview, with DescribeTray  */
/* -------------------------------------------------------------------------- */

type Decision = ValueMappingDecisions[string]

const isMapped = (d: Decision | undefined): boolean =>
  !!d && d.kind === 'map' && !!d.canonicalValue

/**
 * Pick the workbook sheet whose columns include the issue's source column.
 * Falls back to the first sheet so we always have something to render.
 */
const sheetContaining = (column: string): Sheet => {
  const found = EXAMPLE_WORKBOOK.sheets.find((s) =>
    s.columns.some((c) => c.name === column),
  )
  return found ?? EXAMPLE_WORKBOOK.sheets[0]
}

/* -------------------------------------------------------------------------- */
/* Value row                                                                   */
/* -------------------------------------------------------------------------- */

const ValueRow = ({
  source,
  decision,
  canonicalOptions,
  isActive,
  onSelect,
  onChange,
}: {
  source: { value: string; occurrences: number }
  decision: Decision | undefined
  canonicalOptions: { value: string; label: string }[]
  isActive: boolean
  onSelect: () => void
  onChange: (value: string) => void
}) => {
  const selected =
    decision?.kind === 'map' ? (decision.canonicalValue ?? '') : ''
  const needsInput = !isMapped(decision)

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: row already focusable via internal controls
    <li
      onClick={onSelect}
      className={clsx(
        'flex cursor-pointer flex-col gap-2 rounded-lg border-2 px-3 py-3 transition-colors',
        isActive
          ? 'border-border-primary bg-bg-tertiary'
          : 'border-border-tertiary bg-bg-primary hover:border-border-secondary',
        needsInput && 'border-support-fg-amber',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-md font-medium text-text-primary truncate">
            {source.value}
          </span>
          <span className="text-xs text-text-secondary">
            {source.occurrences.toLocaleString()} rows
          </span>
        </div>
        {needsInput ? (
          <span className="shrink-0 rounded-full bg-support-bg-amber px-2 py-0.5 text-xs font-semibold text-support-fg-amber">
            Needs input
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium text-text-secondary">
            Mapped
          </span>
        )}
      </div>
      <div className="min-w-0">
        <Select<string>
          aria-label={`Map ${source.value} to`}
          value={selected}
          onValueChange={(next) => next && onChange(next)}
          items={canonicalOptions}
          placeholder="Pick a Sandy value"
          clearable={false}
        />
      </div>
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                       */
/* -------------------------------------------------------------------------- */

export type ValueMappingPanelProps = {
  issue: ValueMappingIssue
  onCommit: (next: IssueState) => void
  onCancel: () => void
}

export const ValueMappingPanel = ({
  issue,
  onCommit,
  onCancel,
}: ValueMappingPanelProps) => {
  // Seed decisions from Sandy's suggestions; left blank where none provided.
  const [decisions, setDecisions] = useState<ValueMappingDecisions>(() => {
    const seed: ValueMappingDecisions = {}
    for (const sv of issue.sourceValues) {
      seed[sv.value] = sv.suggestion
        ? { kind: 'map', canonicalValue: sv.suggestion }
        : { kind: 'skip' }
    }
    return seed
  })

  const [activeValue, setActiveValue] = useState<string>(
    () =>
      issue.sourceValues.find((sv) => !isMapped(decisions[sv.value]))?.value ??
      issue.sourceValues[0]?.value ??
      '',
  )

  const autoOpenDescribe = useDescribeAutoOpen()
  const [describeOpen, setDescribeOpen] = useState(autoOpenDescribe)

  const sheet = useMemo(() => sheetContaining(issue.sourceColumn), [issue])

  // Column highlight + per-cell highlights for the rows that contain the
  // currently focused unknown value.
  const highlights: HighlightRef[] = [
    { sheet: sheet.name, column: issue.sourceColumn, role: 'source' },
  ]
  const cellHighlights: CellHighlight[] = []
  if (activeValue) {
    sheet.sampleRows.forEach((row, rowIndex) => {
      const cell = row[issue.sourceColumn]
      if (cell && cell.toLowerCase() === activeValue.toLowerCase()) {
        cellHighlights.push({ rowIndex, column: issue.sourceColumn })
      }
    })
  }

  const allMapped = issue.sourceValues.every((sv) =>
    isMapped(decisions[sv.value]),
  )

  /**
   * Simulated AI assist — fill any still-unmapped value with the canonical
   * option whose label most closely starts with the source value. Falls back
   * to the first canonical option so the demo never leaves blanks.
   */
  const applyAssistGuess = () => {
    setDecisions((prev) => {
      const next: ValueMappingDecisions = { ...prev }
      for (const sv of issue.sourceValues) {
        if (isMapped(next[sv.value])) continue
        const lower = sv.value.toLowerCase()
        const match =
          issue.canonicalOptions.find((opt) =>
            opt.label.toLowerCase().startsWith(lower.slice(0, 3)),
          ) ??
          issue.canonicalOptions.find((opt) =>
            opt.label.toLowerCase().includes(lower.slice(0, 3)),
          ) ??
          issue.canonicalOptions[0]
        if (match) {
          next[sv.value] = { kind: 'map', canonicalValue: match.value }
        }
      }
      return next
    })
    const firstStill = issue.sourceValues.find(
      (sv) => !isMapped(decisions[sv.value]),
    )
    if (firstStill) setActiveValue(firstStill.value)
  }

  const handleCommit = () => {
    onCommit({ resolution: { kind: 'value-mapping', decisions } })
  }

  const setMapping = (sourceValue: string, canonicalValue: string) => {
    setDecisions((prev) => ({
      ...prev,
      [sourceValue]: { kind: 'map', canonicalValue },
    }))
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid flex-1 min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-2">
        {/* Left: mapping list */}
        <div className="flex min-h-0 flex-col border-b-2 border-border-tertiary lg:border-b-0 lg:border-r-2">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-md font-medium text-text-primary">
              Unknown values in{' '}
              <span className="font-mono text-sm text-text-secondary">
                {issue.sourceColumn}
              </span>
            </p>
            <DescribeTrigger
              label="Describe these values"
              onClick={() => setDescribeOpen(true)}
            />
          </div>
          <ol className="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto px-3 pb-3">
            {issue.sourceValues.map((sv) => (
              <ValueRow
                key={sv.value}
                source={sv}
                decision={decisions[sv.value]}
                canonicalOptions={issue.canonicalOptions}
                isActive={sv.value === activeValue}
                onSelect={() => setActiveValue(sv.value)}
                onChange={(next) => setMapping(sv.value, next)}
              />
            ))}
          </ol>
        </div>

        {/* Right: source preview — highlights the rows containing the
            focused unknown value so the user can read it in context. */}
        <div className="flex min-h-0 flex-col bg-bg-secondary">
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <SheetSnippet
              sheet={sheet}
              highlights={highlights}
              cellHighlights={cellHighlights}
            />
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-3 border-t-2 border-border-tertiary px-6 py-4">
        <p className="mr-auto text-sm text-text-secondary">
          {allMapped
            ? 'All values mapped.'
            : `${issue.sourceValues.filter((sv) => !isMapped(decisions[sv.value])).length} still to map.`}
        </p>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!allMapped} onClick={handleCommit}>
          Resolve
        </Button>
      </footer>

      <DescribeTray
        open={describeOpen}
        onClose={() => setDescribeOpen(false)}
        title="Describe these values"
        placeholder={`e.g. These are abbreviations for ${issue.targetLabel.toLowerCase()} — match them to the closest Sandy option, even if the spelling differs.`}
        hint="Sandy will read your hint and map the remaining values."
        onApply={applyAssistGuess}
      />
    </div>
  )
}
