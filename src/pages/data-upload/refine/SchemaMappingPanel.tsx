import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Button, Select } from '../../../components/ui'
import type { IssueState } from '../IssueResolverModal'
import type { SchemaTransformationIssue } from '../issues'
import { SheetSnippet } from '../SheetSnippet'
import {
  describeExpression,
  EXAMPLE_WORKBOOK,
  type Expression,
  type HighlightRef,
  type SchemaRuleProgram,
} from '../schema-transformation'
import {
  DescribeTray,
  DescribeTrigger,
  useDescribeAutoOpen,
} from './DescribeTray'
import {
  operationsPropertiesForSheet,
  type SchemaPropertySpec,
} from './schema-properties'

/* -------------------------------------------------------------------------- */
/* SchemaMappingPanel — 50/50 property mapping + sheet preview                 */
/* -------------------------------------------------------------------------- */

/**
 * Pull the sheet / column out of an expression. Returns nulls for kinds
 * that don't map onto a single (sheet, column) pair — those are read-only
 * in this UI (constants and derived expressions).
 */
const extractSheetAndColumn = (
  expr: Expression | null,
): { sheet: string | null; column: string | null } => {
  if (!expr) return { sheet: null, column: null }
  if (expr.kind === 'column') return { sheet: expr.sheet, column: expr.column }
  if (expr.kind === 'join')
    return { sheet: expr.lookupSheet, column: expr.lookupReturnColumn }
  if (expr.kind === 'strip') return extractSheetAndColumn(expr.inner)
  return { sheet: null, column: null }
}

const SHEET_OPTIONS = EXAMPLE_WORKBOOK.sheets.map((s) => ({
  value: s.name,
  label: s.name,
}))

const columnOptionsFor = (sheetName: string | null) => {
  const sheet = EXAMPLE_WORKBOOK.sheets.find((s) => s.name === sheetName)
  return (sheet?.columns ?? []).map((c) => ({ value: c.name, label: c.name }))
}

/* -------------------------------------------------------------------------- */
/* File chip — reused on the card too                                          */
/* -------------------------------------------------------------------------- */

export const FileChip = ({
  filename,
  sheetName,
}: {
  filename: string
  sheetName?: string
}) => (
  <span className="inline-flex items-center gap-2 rounded-md border-2 border-border-tertiary bg-bg-secondary px-2 py-1 text-sm font-medium text-text-primary">
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 text-icon-secondary"
    >
      <title>File</title>
      <path
        d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 2.41L17.59 9H15a1 1 0 0 1-1-1V5.41Z"
        fill="currentColor"
      />
    </svg>
    <span className="font-mono text-xs text-text-primary">{filename}</span>
    {sheetName ? (
      <>
        <span className="text-text-secondary">·</span>
        <span className="font-mono text-xs text-text-secondary">
          {sheetName}
        </span>
      </>
    ) : null}
  </span>
)

/* -------------------------------------------------------------------------- */
/* Property row                                                                */
/* -------------------------------------------------------------------------- */

const PropertyRow = ({
  spec,
  expression,
  isActive,
  onSelect,
  onChange,
}: {
  spec: SchemaPropertySpec
  expression: Expression | null
  isActive: boolean
  onSelect: () => void
  onChange: (next: Expression) => void
}) => {
  const { sheet, column } = extractSheetAndColumn(expression)
  const needsInput = expression === null
  const isConstant = expression?.kind === 'constant'

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: row already focusable via internal controls
    // biome-ignore lint/a11y/noStaticElementInteractions: container click forwards focus
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
          <span className="text-md font-medium text-text-primary">
            {spec.label}
          </span>
          <span className="text-xs text-text-secondary">{spec.note}</span>
        </div>
        {needsInput ? (
          <span className="shrink-0 rounded-full bg-support-bg-amber px-2 py-0.5 text-xs font-semibold text-support-fg-amber">
            Needs input
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium text-text-secondary">
            Required
          </span>
        )}
      </div>

      {isConstant ? (
        <p className="text-xs text-text-secondary">
          Constant value:{' '}
          <code className="font-mono text-text-primary">
            {describeExpression(expression!)}
          </code>
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 basis-[140px]">
            <Select<string>
              aria-label={`${spec.label} sheet`}
              value={sheet ?? ''}
              onValueChange={(nextSheet) => {
                if (!nextSheet) return
                // Reset column when sheet changes.
                onChange({ kind: 'column', sheet: nextSheet, column: '' })
              }}
              items={SHEET_OPTIONS}
              placeholder="Pick sheet"
              clearable={false}
            />
          </div>
          <div className="min-w-0 flex-1 basis-[180px]">
            <Select<string>
              aria-label={`${spec.label} column`}
              value={column ?? ''}
              onValueChange={(nextColumn) => {
                if (!nextColumn) return
                onChange({
                  kind: 'column',
                  sheet: sheet ?? SHEET_OPTIONS[0]?.value ?? '',
                  column: nextColumn,
                })
              }}
              items={columnOptionsFor(sheet)}
              placeholder={sheet ? 'Pick column' : 'Pick sheet first'}
              clearable={false}
              disabled={!sheet}
            />
          </div>
        </div>
      )}
    </li>
  )
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                       */
/* -------------------------------------------------------------------------- */

export type SchemaMappingPanelProps = {
  issue: SchemaTransformationIssue
  initialProgram?: SchemaRuleProgram
  onCommit: (next: IssueState) => void
  onCancel: () => void
}

export const SchemaMappingPanel = ({
  issue,
  initialProgram,
  onCommit,
  onCancel,
}: SchemaMappingPanelProps) => {
  const properties = useMemo(
    () => operationsPropertiesForSheet(issue.sheetName),
    [issue.sheetName],
  )

  // Seeded program: prefer caller-supplied state; otherwise build from spec
  // defaults (one property left unset).
  const [rules, setRules] = useState<Record<string, Expression | null>>(() => {
    const base: Record<string, Expression | null> = {}
    for (const p of properties) base[p.property] = p.defaultExpression
    if (initialProgram) {
      for (const [k, v] of Object.entries(initialProgram.rules)) {
        base[k] = v
      }
    }
    return base
  })

  const [activeProperty, setActiveProperty] = useState<string>(
    () =>
      properties.find((p) => rules[p.property] === null)?.property ??
      properties[0]?.property,
  )

  const autoOpenDescribe = useDescribeAutoOpen()
  const [describeOpen, setDescribeOpen] = useState(autoOpenDescribe)

  /**
   * Simulated AI assist — fills any property still left blank with a
   * plausible guess sourced from the example workbook. The default spec
   * leaves `cropVariety` null, so this is the one slot that actually
   * gets populated in the demo.
   */
  const applyAssistGuess = () => {
    setRules((prev) => {
      const next = { ...prev }
      if (next.cropVariety === null) {
        next.cropVariety = {
          kind: 'join',
          sourceSheet: issue.sheetName,
          sourceMatchColumn: 'variety',
          lookupSheet: 'Fields_Crops',
          lookupMatchColumn: 'variety',
          lookupReturnColumn: 'varietyName',
        }
      }
      return next
    })
    setActiveProperty('cropVariety')
  }

  const activeExpr = activeProperty ? rules[activeProperty] : null
  const { sheet: previewSheet, column: previewColumn } = extractSheetAndColumn(
    activeExpr ?? null,
  )
  const sheetForPreview = previewSheet ?? issue.sheetName
  const sheetDef = EXAMPLE_WORKBOOK.sheets.find(
    (s) => s.name === sheetForPreview,
  )

  const highlights: HighlightRef[] = previewColumn
    ? [{ sheet: sheetForPreview, column: previewColumn, role: 'source' }]
    : []

  const allFilled = properties.every((p) => rules[p.property] !== null)

  const handleCommit = () => {
    const program: SchemaRuleProgram = {
      sheetName: issue.sheetName,
      rules: Object.fromEntries(
        Object.entries(rules).filter(([, expr]) => expr !== null) as [
          string,
          Expression,
        ][],
      ),
    }
    onCommit({ resolution: { kind: 'rule-program', program } })
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid flex-1 min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-2">
        {/* Left: property list */}
        <div className="flex min-h-0 flex-col border-b-2 border-border-tertiary lg:border-b-0 lg:border-r-2">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-md font-medium text-text-primary">
              Properties needed by Sandy
            </p>
            <DescribeTrigger
              label="Describe this file"
              onClick={() => setDescribeOpen(true)}
            />
          </div>
          <ol className="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto px-3 pb-3">
            {properties.map((spec) => (
              <PropertyRow
                key={spec.property}
                spec={spec}
                expression={rules[spec.property]}
                isActive={spec.property === activeProperty}
                onSelect={() => setActiveProperty(spec.property)}
                onChange={(next) =>
                  setRules((prev) => ({ ...prev, [spec.property]: next }))
                }
              />
            ))}
          </ol>
        </div>

        {/* Right: source preview — independent scroll container so the
            table stays put as the property list scrolls. */}
        <div className="flex min-h-0 flex-col bg-bg-secondary">
          <div className="flex-1 min-h-0 overflow-auto p-4">
            {sheetDef ? (
              previewColumn ? (
                <SheetSnippet sheet={sheetDef} highlights={highlights} />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border-tertiary bg-bg-primary px-6 py-10 text-center">
                  <p className="text-md text-text-secondary">
                    Pick a sheet and column on the left to preview the source
                    data Sandy will read.
                  </p>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      <DescribeTray
        open={describeOpen}
        onClose={() => setDescribeOpen(false)}
        title="Describe this file"
        placeholder="e.g. Each row is one fertiliser application. The crop variety lives in the 'variety' column — it's a code that maps to the master Fields_Crops sheet."
        hint="Sandy will read the sheet and try to fill in the gaps."
        onApply={applyAssistGuess}
      />

      {/* Footer */}
      <footer className="flex items-center justify-end gap-3 border-t-2 border-border-tertiary px-6 py-4">
        <p className="mr-auto text-sm text-text-secondary">
          {allFilled
            ? 'All properties mapped.'
            : 'One or more properties still need a sheet and column.'}
        </p>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!allFilled} onClick={handleCommit}>
          Resolve
        </Button>
      </footer>
    </div>
  )
}
