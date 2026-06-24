import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Button, Select, TextInput } from '../../components/ui'
import { SheetSnippet, SNIPPET_VISIBLE_ROWS } from './SheetSnippet'
import {
  describeExpression,
  EXAMPLE_WORKBOOK,
  type Expression,
  OPERATION_CANONICAL_FIELDS,
  referencedColumns,
  resolveExpression,
  type SchemaRuleProgram,
  type Sheet,
} from './schema-transformation'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const findSheet = (sheets: Sheet[], name: string): Sheet | undefined =>
  sheets.find((s) => s.name === name)

const sheetOptions = (sheets: Sheet[]) =>
  sheets.map((s) => ({ value: s.name, label: s.name }))

const columnOptions = (sheet?: Sheet) =>
  sheet?.columns.map((c) => ({ value: c.name, label: c.name })) ?? []

/* -------------------------------------------------------------------------- */
/* Pill — a small editable token rendered inside the sentence builder         */
/* -------------------------------------------------------------------------- */

type PillProps = {
  children: React.ReactNode
  /** When true the pill renders as a placeholder (dashed outline, secondary text). */
  placeholder?: boolean
  /** Click handler — pills double as the affordance for swapping their value. */
  onClick?: () => void
  /** Visual variant — `op` for operator/keyword chips (slimmer + brand tint). */
  variant?: 'value' | 'op'
}

const Pill = ({
  children,
  placeholder,
  onClick,
  variant = 'value',
}: PillProps) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold',
      'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      variant === 'op'
        ? 'bg-sandy-100 text-text-brand-dark hover:bg-sandy-100/80'
        : placeholder
          ? 'border-2 border-dashed border-border-tertiary bg-bg-primary text-text-secondary hover:border-border-secondary'
          : 'border-2 border-border-tertiary bg-bg-primary text-text-primary hover:border-border-secondary',
    )}
  >
    {children}
  </button>
)

/* -------------------------------------------------------------------------- */
/* Inline popovers — keep them ultra-light (a styled dialog isn't worth it)  */
/* -------------------------------------------------------------------------- */

type PopoverProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Pixel-level horizontal alignment. Defaults to `left`. */
  align?: 'left' | 'right'
}

const Popover = ({ open, onClose, children, align = 'left' }: PopoverProps) => {
  if (!open) return null
  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is decorative — Esc closes via the host body */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className={clsx(
          'absolute top-full z-50 mt-1 flex w-[260px] flex-col gap-3 rounded-lg border-2 border-border-tertiary bg-bg-primary p-3 shadow-xl',
          align === 'right' ? 'right-0' : 'left-0',
        )}
      >
        {children}
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Expression renderer — sentence layout with click-to-edit pills              */
/* -------------------------------------------------------------------------- */

type EditorProps = {
  expr: Expression
  /** Active sheet — drives the column choices for `column` expressions. */
  activeSheet: Sheet
  /** All sheets in the workbook — drives the join lookup picker. */
  allSheets: Sheet[]
  onChange: (next: Expression) => void
}

/** Top-level expression editor. Decides which "shape" pill to render and
 *  hands off to a body that lets the user fill in its slots. */
const ExpressionEditor = ({
  expr,
  activeSheet,
  allSheets,
  onChange,
}: EditorProps) => {
  const [kindMenuOpen, setKindMenuOpen] = useState(false)

  const setKind = (kind: Expression['kind']) => {
    setKindMenuOpen(false)
    if (kind === 'empty') return onChange({ kind: 'empty' })
    if (kind === 'constant') return onChange({ kind: 'constant', value: '' })
    if (kind === 'column')
      return onChange({
        kind: 'column',
        sheet: activeSheet.name,
        column: activeSheet.columns[0]?.name ?? '',
      })
    if (kind === 'join')
      return onChange({
        kind: 'join',
        sourceSheet: activeSheet.name,
        sourceMatchColumn: activeSheet.columns[0]?.name ?? '',
        lookupSheet:
          allSheets.find((s) => s.name !== activeSheet.name)?.name ?? '',
        lookupMatchColumn: '',
        lookupReturnColumn: '',
      })
    if (kind === 'strip')
      return onChange({
        kind: 'strip',
        chars: "[' '] ",
        inner: expr.kind === 'empty' ? { kind: 'empty' } : expr,
      })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* "Use" verb — feels like the Tactiq screenshot's labelled action pills. */}
      <span className="text-sm font-semibold text-text-secondary">Use</span>

      <div className="relative">
        <Pill variant="op" onClick={() => setKindMenuOpen((v) => !v)}>
          {expr.kind === 'empty' ? '＋ Pick a rule' : KIND_LABEL[expr.kind]}
          <span aria-hidden="true" className="text-text-secondary">
            ▾
          </span>
        </Pill>
        <Popover open={kindMenuOpen} onClose={() => setKindMenuOpen(false)}>
          {(['column', 'join', 'constant', 'strip'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="flex flex-col gap-0.5 rounded-md p-2 text-left text-md text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
            >
              <span className="font-semibold">{KIND_LABEL[k]}</span>
              <span className="text-sm text-text-secondary">
                {KIND_HINT[k]}
              </span>
            </button>
          ))}
        </Popover>
      </div>

      <ExpressionBody
        expr={expr}
        activeSheet={activeSheet}
        allSheets={allSheets}
        onChange={onChange}
      />
    </div>
  )
}

const KIND_LABEL: Record<Expression['kind'], string> = {
  empty: 'Pick a rule',
  column: 'Column value',
  join: 'Lookup in another sheet',
  constant: 'Constant',
  strip: 'Strip characters',
}

const KIND_HINT: Record<Expression['kind'], string> = {
  empty: '',
  column: 'Read directly from a column on this sheet',
  join: "Match a key against another sheet's column",
  constant: 'Same literal value for every row',
  strip: 'Wrap another rule and strip characters out',
}

/* -------------------------------------------------------------------------- */
/* Per-kind bodies                                                             */
/* -------------------------------------------------------------------------- */

const ExpressionBody = ({
  expr,
  activeSheet,
  allSheets,
  onChange,
}: EditorProps) => {
  if (expr.kind === 'empty') return null

  if (expr.kind === 'constant') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">equal to</span>
        <div className="w-[200px]">
          <TextInput
            placeholder="Type a value"
            value={expr.value}
            onValueChange={(value) => onChange({ ...expr, value })}
          />
        </div>
      </div>
    )
  }

  if (expr.kind === 'column') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">column</span>
        <ColumnPill
          sheet={activeSheet}
          value={expr.column}
          onChange={(column) => onChange({ ...expr, column })}
        />
        <span className="text-sm text-text-secondary">
          on {activeSheet.name}
        </span>
      </div>
    )
  }

  if (expr.kind === 'join') {
    const sourceSheet = findSheet(allSheets, expr.sourceSheet) ?? activeSheet
    const lookupSheet = findSheet(allSheets, expr.lookupSheet)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-secondary">return</span>
        <ColumnPill
          sheet={lookupSheet}
          value={expr.lookupReturnColumn}
          placeholder="(return column)"
          onChange={(lookupReturnColumn) =>
            onChange({ ...expr, lookupReturnColumn })
          }
        />
        <span className="text-sm text-text-secondary">from</span>
        <SheetPill
          sheets={allSheets.filter((s) => s.name !== sourceSheet.name)}
          value={expr.lookupSheet}
          onChange={(lookupSheet) =>
            onChange({
              ...expr,
              lookupSheet,
              lookupMatchColumn: '',
              lookupReturnColumn: '',
            })
          }
        />
        <span className="text-sm text-text-secondary">where</span>
        <ColumnPill
          sheet={sourceSheet}
          value={expr.sourceMatchColumn}
          onChange={(sourceMatchColumn) =>
            onChange({ ...expr, sourceMatchColumn })
          }
        />
        <span className="text-sm text-text-secondary">=</span>
        <ColumnPill
          sheet={lookupSheet}
          value={expr.lookupMatchColumn}
          placeholder="(match column)"
          onChange={(lookupMatchColumn) =>
            onChange({ ...expr, lookupMatchColumn })
          }
        />
      </div>
    )
  }

  if (expr.kind === 'strip') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-secondary">strip</span>
        <div className="w-[100px]">
          <TextInput
            placeholder="chars"
            value={expr.chars}
            onValueChange={(chars) => onChange({ ...expr, chars })}
          />
        </div>
        <span className="text-sm text-text-secondary">from</span>
        <ExpressionEditor
          expr={expr.inner}
          activeSheet={activeSheet}
          allSheets={allSheets}
          onChange={(inner) => onChange({ ...expr, inner })}
        />
      </div>
    )
  }

  return null
}

/* -------------------------------------------------------------------------- */
/* Pickers that read like pills                                                */
/* -------------------------------------------------------------------------- */

const ColumnPill = ({
  sheet,
  value,
  placeholder,
  onChange,
}: {
  sheet?: Sheet
  value: string
  placeholder?: string
  onChange: (next: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const options = columnOptions(sheet)
  return (
    <div className="relative">
      <Pill placeholder={!value} onClick={() => setOpen((v) => !v)}>
        {value || placeholder || '(column)'}
        <span aria-hidden="true" className="text-text-secondary">
          ▾
        </span>
      </Pill>
      <Popover open={open} onClose={() => setOpen(false)}>
        <div className="max-h-[240px] overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-sm text-text-secondary px-2 py-1">No columns</p>
          ) : (
            <ul className="flex flex-col">
              {options.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-md',
                      opt.value === value
                        ? 'bg-bg-secondary text-text-primary'
                        : 'text-text-primary hover:bg-bg-secondary',
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Popover>
    </div>
  )
}

const SheetPill = ({
  sheets,
  value,
  onChange,
}: {
  sheets: Sheet[]
  value: string
  onChange: (next: string) => void
}) => (
  <div className="w-[200px]">
    <Select
      items={sheetOptions(sheets)}
      value={value || null}
      onValueChange={(next) => next && onChange(next)}
      clearable={false}
      placeholder="(sheet)"
    />
  </div>
)

/* -------------------------------------------------------------------------- */
/* Walker — one canonical field at a time                                      */
/* -------------------------------------------------------------------------- */

export type SchemaRuleEditorProps = {
  /** The sheet the rules are scoped to. */
  sheetName: string
  /** Current program (rules + sheet name). */
  program: SchemaRuleProgram
  onChange: (next: SchemaRuleProgram) => void
  /** Called when the walker finishes the last canonical field. */
  onDone: () => void
}

export const SchemaRuleEditor = ({
  sheetName,
  program,
  onChange,
  onDone,
}: SchemaRuleEditorProps) => {
  const fields = OPERATION_CANONICAL_FIELDS
  const [index, setIndex] = useState(0)

  const activeField = fields[index]
  const expr = program.rules[activeField.id] ?? { kind: 'empty' as const }

  const allSheets = EXAMPLE_WORKBOOK.sheets
  const activeSheet = findSheet(allSheets, sheetName) ?? allSheets[0]

  // Drive the snippet's highlights + resolved-value preview from the active
  // expression. Join rules show their resolved lookup value inline so the
  // user can see "field F-1024 -> Brookside Leys" right next to the source.
  const highlights = referencedColumns(expr)
  const resolvedValues = useMemo(
    () =>
      activeSheet.sampleRows
        .slice(0, SNIPPET_VISIBLE_ROWS)
        .map((row) => resolveExpression(expr, row, EXAMPLE_WORKBOOK)),
    [activeSheet, expr],
  )

  const updateExpression = (next: Expression) => {
    onChange({
      ...program,
      rules: { ...program.rules, [activeField.id]: next },
    })
  }

  const isLast = index === fields.length - 1

  const handleNext = () => {
    if (isLast) onDone()
    else setIndex((i) => Math.min(fields.length - 1, i + 1))
  }
  const handlePrev = () => setIndex((i) => Math.max(0, i - 1))

  return (
    <div className="flex flex-col gap-5">
      {/* Question — single line. The canonical noun is highlighted as a
          subtly-rounded pill so the eye lands on what we're asking for. */}
      <h3 className="text-2xl font-semibold leading-9 text-text-primary">
        Which column has the{' '}
        <span className="inline-block rounded-md bg-sandy-100 px-2 py-0.5 text-text-brand-dark">
          {activeField.label}
        </span>
        ?
      </h3>

      {/* Sentence-style rule editor. */}
      <div className="rounded-xl border-2 border-border-tertiary bg-bg-primary p-4">
        <ExpressionEditor
          expr={expr}
          activeSheet={activeSheet}
          allSheets={allSheets}
          onChange={updateExpression}
        />
        {expr.kind !== 'empty' ? (
          <p className="mt-3 text-sm text-text-secondary">
            Reads as: <span className="italic">{describeExpression(expr)}</span>
          </p>
        ) : null}
      </div>

      {/* Sheet snippet — first 5 rows of the active sheet with column tints
          tracking the current rule. Sits below the editor as live preview. */}
      <SheetSnippet
        sheet={activeSheet}
        highlights={highlights}
        resolvedValues={resolvedValues}
      />

      {/* Walker controls. "Confirm" once the current step has a rule
          (either Sandy's auto-suggestion or the user's pick); plain "Next"
          while the step is still empty. */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={handlePrev} disabled={index === 0}>
          Previous
        </Button>
        <Button variant="primary" onClick={handleNext}>
          {isLast
            ? 'Save and continue'
            : expr.kind === 'empty'
              ? 'Next'
              : 'Confirm'}
        </Button>
      </div>
    </div>
  )
}
