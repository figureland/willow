import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Select } from '../../../components/ui'
import type { IssueState } from '../issue-state'
import type { SchemaTransformationIssue } from '../issues'
import {
  EXAMPLE_WORKBOOK,
  type Expression,
  type HighlightRef,
  type SchemaRuleProgram,
} from '../schema-transformation'
import { DescribeTray } from './DescribeTray'
import {
  buildPropertyStatuses,
  operationsPropertiesForSheet,
} from './schema-properties'

/* -------------------------------------------------------------------------- */
/* SchemaReviewModal — unified review surface for every schema-transformation */
/* card. Three states fold into one modal:                                    */
/*                                                                             */
/*  1. review   — non-editable data grid of the raw import + the list of      */
/*                attributes Sandy detected. Confirm or kick off a fix.       */
/*  2. describe — DescribeTray slides in. AI runs, then flips to manual with  */
/*                its picks pre-filled so the user can adjust + confirm.       */
/*  3. manual   — interactive attribute list. Focusing an attribute highlights */
/*                the relevant column in the data grid.                        */
/*                                                                             */
/* All three states share the same modal chrome so the user feels they're in  */
/* one place reading their file with Sandy.                                    */
/* -------------------------------------------------------------------------- */

import { SheetView } from './SheetView'

type Mode = 'review' | 'manual'

type Pick = { sheet: string; column: string }

const SAMPLE_VALUE_CAP = 10

const extractSheetCol = (expr: Expression | null | undefined): Pick => {
  if (!expr) return { sheet: '', column: '' }
  if (expr.kind === 'column') return { sheet: expr.sheet, column: expr.column }
  if (expr.kind === 'join') {
    return { sheet: expr.lookupSheet, column: expr.lookupReturnColumn }
  }
  if (expr.kind === 'strip') return extractSheetCol(expr.inner)
  return { sheet: '', column: '' }
}

const constantValueOf = (expr: Expression | null | undefined): string | null =>
  expr?.kind === 'constant' ? expr.value : null

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

export type SchemaReviewModalProps = {
  open: boolean
  onClose: () => void
  issue: SchemaTransformationIssue
  /** Initial draft program (e.g. from a previous Describe / manual run). */
  initialProgram?: SchemaRuleProgram
  /** Commit the final program. Caller writes it back into IssueState. */
  onConfirm: (next: IssueState) => void
}

export const SchemaReviewModal = ({
  open,
  onClose,
  issue,
  initialProgram,
  onConfirm,
}: SchemaReviewModalProps) => {
  // Mode starts on "review" by default; if the caller already has a draft
  // (e.g. user previously hit Describe) we jump straight to manual so they
  // can confirm without losing their progress.
  const [mode, setMode] = useState<Mode>(() =>
    initialProgram ? 'manual' : 'review',
  )
  const [describeOpen, setDescribeOpen] = useState(false)

  // Always reset mode + close describe when the modal re-opens.
  useEffect(() => {
    if (!open) return
    setMode(initialProgram ? 'manual' : 'review')
    setDescribeOpen(false)
  }, [open, initialProgram])

  // Build the canonical property list once per issue.
  const properties = useMemo(
    () => operationsPropertiesForSheet(issue.sheetName),
    [issue.sheetName],
  )

  // Seed picks from initialProgram → default expressions. Properties Sandy
  // marked as missing-on-purpose start empty so the user has to act.
  const seeded = useMemo<Record<string, Pick>>(() => {
    const statuses = buildPropertyStatuses(issue.sheetName)
    const out: Record<string, Pick> = {}
    for (const p of properties) {
      const initialExpr = initialProgram?.rules?.[p.property] as
        | Expression
        | undefined
      if (initialExpr) {
        out[p.property] = extractSheetCol(initialExpr)
        continue
      }
      // No initialProgram: only pre-fill what Sandy could resolve from the
      // imported file. Forced-missing properties remain blank.
      const status = statuses.find((s) => s.property === p.property)
      if (status?.presence === 'found' && status.sheet && status.column) {
        out[p.property] = { sheet: status.sheet, column: status.column }
      } else {
        out[p.property] = extractSheetCol(p.defaultExpression)
      }
    }
    return out
  }, [properties, initialProgram, issue.sheetName])

  const [picks, setPicks] = useState<Record<string, Pick>>(seeded)

  // Re-seed every time the modal re-opens so a previous session's draft
  // doesn't bleed forward.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on open
  useEffect(() => {
    if (open) setPicks(seeded)
  }, [open])

  // Active attribute drives which column we highlight in the data grid.
  const [activeProperty, setActiveProperty] = useState<string | null>(null)

  const setSheet = (property: string, sheet: string) =>
    setPicks((curr) => ({ ...curr, [property]: { sheet, column: '' } }))
  const setColumn = (property: string, column: string) =>
    setPicks((curr) => ({
      ...curr,
      [property]: { sheet: curr[property]?.sheet ?? '', column },
    }))

  const sheetItems = EXAMPLE_WORKBOOK.sheets.map((s) => ({
    value: s.name,
    label: s.name,
  }))
  const columnsForSheet = (sheet: string) => {
    const s = EXAMPLE_WORKBOOK.sheets.find((x) => x.name === sheet)
    return (s?.columns ?? []).map((c) => ({ value: c.name, label: c.name }))
  }

  // Build highlight refs from current picks. In review mode we highlight
  // every property that has a resolved column. In manual mode the highlight
  // narrows to the focused attribute so the user can scan one at a time.
  const highlights: HighlightRef[] = useMemo(() => {
    const list: HighlightRef[] = []
    const seen = new Set<string>()
    const add = (sheet: string, column: string) => {
      if (!sheet || !column) return
      const key = `${sheet}::${column}`
      if (seen.has(key)) return
      seen.add(key)
      list.push({ sheet, column, role: 'source' })
    }
    if (mode === 'manual' && activeProperty) {
      const p = picks[activeProperty]
      if (p) add(p.sheet, p.column)
      return list
    }
    for (const p of properties) {
      const pick = picks[p.property]
      if (!pick) continue
      add(pick.sheet, pick.column)
    }
    return list
  }, [mode, activeProperty, picks, properties])

  // Active tab in the SheetView. When the user focuses an attribute we
  // jump to whichever sheet its column lives on so the highlight is
  // actually visible.
  const initialTab = useMemo(() => {
    if (mode === 'manual' && activeProperty) {
      const p = picks[activeProperty]
      if (p?.sheet) return p.sheet
    }
    return issue.sheetName
  }, [mode, activeProperty, picks, issue.sheetName])

  // AI Describe → seed manual mode with the suggested program and let the
  // user confirm. Mirrors the suggestedSchemaProgramWithAssist behaviour
  // we used before.
  const applyDescribe = () => {
    const next: Record<string, Pick> = {}
    for (const p of properties) {
      const expr = p.defaultExpression
      next[p.property] = extractSheetCol(expr)
    }
    // Assistive guess for cropVariety (the canonical "we left this blank"
    // slot in the demo spec).
    next.cropVariety = { sheet: 'Fields_Crops', column: 'varietyName' }
    setPicks(next)
    setMode('manual')
  }

  const commitProgram = (source: 'ai' | 'manual') => {
    const rules: Record<string, Expression> = {}
    for (const p of properties) {
      // Keep any constants the default spec carried (e.g. operationGroup).
      const constant = constantValueOf(p.defaultExpression)
      if (constant !== null) {
        rules[p.property] = { kind: 'constant', value: constant }
        continue
      }
      const pick = picks[p.property]
      if (pick?.sheet && pick.column) {
        rules[p.property] = {
          kind: 'column',
          sheet: pick.sheet,
          column: pick.column,
        }
      }
    }
    const program: SchemaRuleProgram = {
      sheetName: issue.sheetName,
      rules,
      source,
    }
    onConfirm({ resolution: { kind: 'rule-program', program } })
    onClose()
  }

  const filledCount = properties.filter((p) => {
    if (constantValueOf(p.defaultExpression) !== null) return true
    const pick = picks[p.property]
    return !!(pick?.sheet && pick.column)
  }).length

  // Title copy keys off the issue's recognised state + the current mode.
  const title = (() => {
    if (mode === 'manual') {
      return initialProgram?.source === 'ai'
        ? "Here's how we think your file is structured."
        : 'Map your file structure'
    }
    if (issue.recognised) {
      return `We read your ${issue.dataCategory} data. Does this look right?`
    }
    return "We couldn't find your records. Help us understand the layout."
  })()

  const sublabel =
    mode === 'manual'
      ? 'Pick the sheet and column each Sandy property lives on. Focus a property to highlight its column in your file.'
      : 'Here is the raw data Sandy read from your file. Confirm if it looks right, or describe and map it manually.'

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={title}
      unstyled
      maxWidth="1100px"
      fillHeight
    >
      <div className="relative flex h-full min-h-0 flex-col">
        <header className="flex flex-col gap-1 border-b-2 border-border-tertiary px-8 pt-7 pb-4 pr-16">
          <h2 className="text-xl font-semibold leading-tight text-text-primary">
            {title}
          </h2>
          <p className="text-md text-text-secondary">{sublabel}</p>
        </header>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Data grid — always visible, owns the left lane. */}
          <div className="flex-1 min-w-0 overflow-y-auto px-8 py-6">
            <SheetView
              filename={issue.filename}
              initialTab={initialTab}
              highlights={highlights}
            />
          </div>

          {/* Right pane — content varies by mode. */}
          <aside
            className={clsx(
              'w-[380px] shrink-0 border-l-2 border-border-tertiary bg-bg-secondary',
              'flex flex-col min-h-0 overflow-hidden',
            )}
          >
            {mode === 'review' ? (
              <ReviewPane issue={issue} properties={properties} picks={picks} />
            ) : (
              <ManualPane
                properties={properties}
                picks={picks}
                activeProperty={activeProperty}
                setActiveProperty={setActiveProperty}
                sheetItems={sheetItems}
                columnsForSheet={columnsForSheet}
                setSheet={setSheet}
                setColumn={setColumn}
              />
            )}
          </aside>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t-2 border-border-tertiary bg-bg-primary px-8 py-4">
          {mode === 'review' ? (
            <>
              <p className="text-md text-text-primary">
                Does this look correct?
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setDescribeOpen(true)}>
                  Describe your file
                </Button>
                <Button variant="secondary" onClick={() => setMode('manual')}>
                  Map manually
                </Button>
                <Button
                  variant="primary"
                  onClick={() => commitProgram(initialProgram?.source ?? 'ai')}
                >
                  Yes, confirm
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMode('review')}>
                Back to review
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() =>
                    commitProgram(initialProgram?.source ?? 'manual')
                  }
                >
                  Confirm mapping ({filledCount} of {properties.length})
                </Button>
              </div>
            </>
          )}
        </footer>

        {describeOpen ? (
          <DescribeTray
            open={describeOpen}
            onClose={() => setDescribeOpen(false)}
            title="Describe this file"
            placeholder="e.g. Each row is one fertiliser application. The crop variety lives in the 'variety' column."
            hint="Sandy will read your description and try to fill in the gaps."
            expectedProperties={buildPropertyStatuses(issue.sheetName).map(
              (s) => ({ label: s.label, presence: s.presence }),
            )}
            onApply={() => applyDescribe()}
            portal
          />
        ) : null}
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* ReviewPane — read-only attribute list shown in review mode                  */
/* -------------------------------------------------------------------------- */

const ReviewPane = ({
  issue,
  properties,
  picks,
}: {
  issue: SchemaTransformationIssue
  properties: ReturnType<typeof operationsPropertiesForSheet>
  picks: Record<string, Pick>
}) => {
  const found = properties.filter((p) => {
    if (constantValueOf(p.defaultExpression) !== null) return true
    const pick = picks[p.property]
    return !!(pick?.sheet && pick.column)
  })
  const missing = properties.filter((p) => !found.includes(p))
  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-6">
      {/* Missing properties lead — they're the rows that need the user's
          attention. The recognised list still appears below for
          confirmation but starts collapsed-feeling so it doesn't drown out
          the action items at the top. */}
      {missing.length > 0 ? (
        <>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Still missing
            </h3>
            <p className="mt-1 text-md text-text-primary">
              {missing.length}{' '}
              {missing.length === 1 ? 'property' : 'properties'} need your input
              — describe or map them to continue.
            </p>
          </div>
          <PropertyList properties={missing} picks={picks} tone="missing" />
        </>
      ) : null}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          What we found
        </h3>
        <p className="mt-1 text-md text-text-primary">
          Sandy recognised {found.length} of {properties.length} Sandy
          properties in this sheet.
        </p>
      </div>
      <PropertyList properties={found} picks={picks} tone="found" />
      {issue.recognisedSummary ? (
        <p className="rounded-md bg-bg-primary px-3 py-2 text-sm text-text-secondary">
          {issue.recognisedSummary}
        </p>
      ) : null}
    </div>
  )
}

const PropertyList = ({
  properties,
  picks,
  tone,
}: {
  properties: ReturnType<typeof operationsPropertiesForSheet>
  picks: Record<string, Pick>
  tone: 'found' | 'missing'
}) => (
  <ul className="flex flex-col gap-2">
    {properties.map((p) => {
      const pick = picks[p.property]
      const constant = constantValueOf(p.defaultExpression)
      return (
        <li
          key={p.property}
          className={clsx(
            'flex flex-col gap-0.5 rounded-md border-2 px-3 py-2',
            tone === 'found'
              ? 'border-support-border-green bg-support-bg-green/60'
              : 'border-support-border-amber bg-support-bg-amber/60',
          )}
        >
          <span className="text-md font-medium text-text-primary">
            {p.label}
          </span>
          {constant !== null ? (
            <span className="text-xs text-text-secondary">
              Constant · "{constant}"
            </span>
          ) : tone === 'found' && pick ? (
            <span className="text-xs text-text-secondary">
              {pick.sheet} · {pick.column}
            </span>
          ) : (
            <span className="text-xs text-text-secondary">Needs input</span>
          )}
        </li>
      )
    })}
  </ul>
)

/* -------------------------------------------------------------------------- */
/* ManualPane — interactive attribute editor with highlight-on-focus           */
/* -------------------------------------------------------------------------- */

const ManualPane = ({
  properties,
  picks,
  activeProperty,
  setActiveProperty,
  sheetItems,
  columnsForSheet,
  setSheet,
  setColumn,
}: {
  properties: ReturnType<typeof operationsPropertiesForSheet>
  picks: Record<string, Pick>
  activeProperty: string | null
  setActiveProperty: (next: string | null) => void
  sheetItems: { value: string; label: string }[]
  columnsForSheet: (sheet: string) => { value: string; label: string }[]
  setSheet: (property: string, sheet: string) => void
  setColumn: (property: string, column: string) => void
}) => (
  <ul className="flex flex-col overflow-y-auto">
    {properties.map((p, idx) => {
      const pick = picks[p.property] ?? { sheet: '', column: '' }
      const constant = constantValueOf(p.defaultExpression)
      const isDerived = constant !== null
      const needsAttention = !isDerived && (!pick.sheet || !pick.column)
      const isActive = activeProperty === p.property
      const last = idx === properties.length - 1
      return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: focus-on-click is the intended affordance
        <li
          key={p.property}
          onClick={() => setActiveProperty(p.property)}
          className={clsx(
            'flex cursor-pointer flex-col gap-2 px-5 py-3 transition-colors',
            last ? '' : 'border-b border-border-tertiary',
            isActive
              ? 'bg-bg-primary'
              : needsAttention
                ? 'bg-support-bg-amber/40'
                : 'bg-transparent hover:bg-bg-primary/60',
          )}
        >
          <span className="text-md font-medium text-text-primary">
            {p.label}
          </span>
          {isDerived ? (
            <span className="text-xs text-text-secondary">
              Constant · "{constant}"
            </span>
          ) : (
            <div
              className={clsx(
                'flex flex-col gap-2',
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
              <ColumnSelectWithPeek
                sheet={pick.sheet}
                value={pick.column || null}
                onChange={(v) => setColumn(p.property, v ?? '')}
                items={columnsForSheet(pick.sheet)}
              />
            </div>
          )}
        </li>
      )
    })}
  </ul>
)

/* -------------------------------------------------------------------------- */
/* ColumnSelectWithPeek — Select + hover snippet of sampled values             */
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
