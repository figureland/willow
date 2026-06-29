import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Button, Select } from '../../../components/ui'
import type { IssueState } from '../issue-state'
import type { SchemaTransformationIssue } from '../issues'
import {
  EXAMPLE_WORKBOOK,
  type Expression,
  type SchemaRuleProgram,
} from '../schema-transformation'
import { operationsPropertiesForSheet } from './schema-properties'

/* -------------------------------------------------------------------------- */
/* SchemaMappingReview — confirm the AI / manual draft before committing      */
/*                                                                             */
/* Replaces the old SchemaMappingPanel. Same minimal idiom as the manual      */
/* column-mapping modal: one row per canonical property, sheet + column        */
/* selects, "Needs attention" hint on the missing ones, sample-value peek on   */
/* hover. The user can fine-tune any row before confirming, then a single     */
/* Confirm button commits the resolution.                                      */
/* -------------------------------------------------------------------------- */

const SAMPLE_VALUE_CAP = 10

type SheetCol = { sheet: string; column: string }

/** Boil an Expression down to a single (sheet, column) pair for the UI. */
const extractSheetCol = (expr: Expression | null | undefined): SheetCol => {
  if (!expr) return { sheet: '', column: '' }
  if (expr.kind === 'column') return { sheet: expr.sheet, column: expr.column }
  if (expr.kind === 'join') {
    return { sheet: expr.lookupSheet, column: expr.lookupReturnColumn }
  }
  if (expr.kind === 'strip') return extractSheetCol(expr.inner)
  // Constants don't surface a (sheet, column) — show as a derived row.
  return { sheet: '', column: '' }
}

/** Detect constant-derived properties so we can label them as such. */
const isConstant = (expr: Expression | null | undefined): boolean =>
  expr?.kind === 'constant'

const constantValueOf = (expr: Expression | null | undefined): string | null =>
  expr?.kind === 'constant' ? expr.value : null

export type SchemaMappingReviewProps = {
  issue: SchemaTransformationIssue
  initialProgram?: SchemaRuleProgram
  onCommit: (next: IssueState) => void
  onCancel: () => void
}

export const SchemaMappingReview = ({
  issue,
  initialProgram,
  onCommit,
  onCancel,
}: SchemaMappingReviewProps) => {
  const properties = useMemo(
    () => operationsPropertiesForSheet(issue.sheetName),
    [issue.sheetName],
  )

  // Seed picks from the committed program (Describe / Map-columns produced
  // it); fall back to the property's default expression so rows that Sandy
  // could resolve start prefilled instead of blank.
  const seeded = useMemo<Record<string, SheetCol>>(() => {
    const out: Record<string, SheetCol> = {}
    for (const p of properties) {
      const expr =
        (initialProgram?.rules?.[p.property] as Expression | undefined) ??
        p.defaultExpression
      out[p.property] = extractSheetCol(expr)
    }
    return out
  }, [properties, initialProgram])

  const [picks, setPicks] = useState<Record<string, SheetCol>>(seeded)

  const sheetItems = EXAMPLE_WORKBOOK.sheets.map((s) => ({
    value: s.name,
    label: s.name,
  }))
  const columnsForSheet = (sheet: string) => {
    const s = EXAMPLE_WORKBOOK.sheets.find((x) => x.name === sheet)
    return (s?.columns ?? []).map((c) => ({ value: c.name, label: c.name }))
  }

  const setSheet = (property: string, sheet: string) =>
    setPicks((curr) => ({ ...curr, [property]: { sheet, column: '' } }))
  const setColumn = (property: string, column: string) =>
    setPicks((curr) => ({
      ...curr,
      [property]: { sheet: curr[property]?.sheet ?? '', column },
    }))

  // Confirm carries the original program's rules forward verbatim — except
  // for properties the user just touched in this review, which get the
  // (sheet, column) re-emitted as a column expression. Constants and other
  // derived rules survive untouched so the user doesn't lose subtleties.
  const handleConfirm = () => {
    const rules: Record<string, Expression> = {}
    for (const p of properties) {
      const seed = initialProgram?.rules?.[p.property] as Expression | undefined
      if (seed && isConstant(seed)) {
        rules[p.property] = seed
        continue
      }
      const pick = picks[p.property]
      if (pick?.sheet && pick.column) {
        rules[p.property] = {
          kind: 'column',
          sheet: pick.sheet,
          column: pick.column,
        }
      } else if (seed) {
        rules[p.property] = seed
      }
    }
    const program: SchemaRuleProgram = {
      sheetName: issue.sheetName,
      rules,
      // Preserve where the draft came from — the user confirmed it; they
      // didn't author it from scratch.
      source: initialProgram?.source,
    }
    onCommit({ resolution: { kind: 'rule-program', program } })
  }

  const filledCount = properties.filter((p) => {
    const seed = initialProgram?.rules?.[p.property] as Expression | undefined
    if (isConstant(seed) || isConstant(p.defaultExpression ?? undefined))
      return true
    const pick = picks[p.property]
    return !!(pick?.sheet && pick.column)
  }).length

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(180px,1.4fr)] items-baseline gap-3 border-b border-border-tertiary bg-bg-primary px-9 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        <span>Sandy property</span>
        <span>Sheet name</span>
        <span>Column name</span>
      </div>
      {/* List owns the scroll; footer pins beneath it. */}
      <ul className="flex flex-1 min-h-0 flex-col overflow-y-auto px-6 pt-2 pb-4">
        {properties.map((p, idx) => {
          const pick = picks[p.property] ?? { sheet: '', column: '' }
          const seed = initialProgram?.rules?.[p.property] as
            | Expression
            | undefined
          const constantValue =
            constantValueOf(seed) ?? constantValueOf(p.defaultExpression)
          const isDerived = constantValue !== null
          const needsAttention = !isDerived && (!pick.sheet || !pick.column)
          const last = idx === properties.length - 1
          return (
            <li
              key={p.property}
              className={clsx(
                'grid grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(180px,1.4fr)] items-start gap-3 rounded-md px-3 py-3 transition-colors',
                last ? '' : 'border-b border-border-tertiary',
                needsAttention && 'bg-support-bg-amber/60',
              )}
            >
              <div className="flex flex-col gap-0.5 pt-1">
                <span className="text-md font-medium text-text-primary">
                  {p.label}
                </span>
              </div>
              {isDerived ? (
                <div className="col-span-2 rounded-md border-2 border-border-tertiary bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                  Constant value:{' '}
                  <span className="font-medium text-text-primary">
                    "{constantValue}"
                  </span>
                </div>
              ) : (
                <>
                  <div
                    className={clsx(
                      needsAttention &&
                        '[&_button]:!border-support-fg-amber [&_button]:!ring-1 [&_button]:!ring-support-fg-amber/30',
                    )}
                  >
                    <Select
                      aria-label={`Sheet for ${p.label}`}
                      items={sheetItems}
                      value={pick.sheet || null}
                      placeholder="Sheet"
                      onValueChange={(v) => setSheet(p.property, v ?? '')}
                      clearable={false}
                    />
                  </div>
                  <div
                    className={clsx(
                      needsAttention &&
                        '[&_button]:!border-support-fg-amber [&_button]:!ring-1 [&_button]:!ring-support-fg-amber/30',
                    )}
                  >
                    <ColumnSelectWithPeek
                      sheet={pick.sheet}
                      value={pick.column || null}
                      onChange={(v) => setColumn(p.property, v ?? '')}
                      items={columnsForSheet(pick.sheet)}
                    />
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t-2 border-border-tertiary bg-bg-primary px-6 py-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm}>
          Confirm mapping ({filledCount} of {properties.length})
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* ColumnSelectWithPeek — Select + hover snippet of sampled values            */
/* -------------------------------------------------------------------------- */

const ColumnSelectWithPeek = ({
  sheet,
  value,
  onChange,
  items,
}: {
  sheet: string
  value: string | null
  onChange: (next: string | null) => void
  items: { value: string; label: string }[]
}) => {
  const [peeking, setPeeking] = useState(false)
  const peekValues = useMemo(() => {
    if (!value || !sheet) return []
    const s = EXAMPLE_WORKBOOK.sheets.find((x) => x.name === sheet)
    if (!s) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const row of s.sampleRows) {
      const raw = row[value]
      if (raw === undefined || raw === null) continue
      const str = String(raw).trim()
      if (!str || seen.has(str)) continue
      seen.add(str)
      out.push(str)
      if (out.length >= SAMPLE_VALUE_CAP) break
    }
    return out
  }, [sheet, value])
  const totalRows =
    EXAMPLE_WORKBOOK.sheets.find((x) => x.name === sheet)?.sampleRows.length ??
    0
  return (
    <div
      className="relative flex flex-col gap-1"
      onMouseEnter={() => setPeeking(true)}
      onMouseLeave={() => setPeeking(false)}
      onFocus={() => setPeeking(true)}
      onBlur={() => setPeeking(false)}
    >
      <Select
        aria-label="Column"
        items={items}
        value={value}
        placeholder={sheet ? 'Column' : 'Pick a sheet first'}
        disabled={!sheet}
        onValueChange={onChange}
        clearable={false}
      />
      {peeking && value && peekValues.length > 0 ? (
        <div
          role="tooltip"
          className="absolute left-0 right-0 top-full z-10 mt-1 flex flex-col gap-1 rounded-lg border-2 border-border-tertiary bg-bg-primary px-3 py-2 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Sample values
          </p>
          <p className="text-sm text-text-primary">
            {peekValues.join(', ')}
            {totalRows > peekValues.length
              ? ` and ${totalRows - peekValues.length} more`
              : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}
