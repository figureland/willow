import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Select } from '../../../components/ui'
import type { IssueState } from '../issue-state'
import {
  EXAMPLE_WORKBOOK,
  type SchemaRuleProgram,
} from '../schema-transformation'
import {
  buildPropertyStatuses,
  operationsPropertiesForSheet,
} from './schema-properties'

/* -------------------------------------------------------------------------- */
/* ColumnMappingModal — pair each canonical property to (sheet, column)        */
/*                                                                             */
/* Surfaces the same mapping flow as the AI describe path, but lets the user  */
/* drive it by hand. Each property row picks a sheet + a column from that     */
/* sheet; focusing the column triggers a hovering snippet of the first ten   */
/* read values from that column so the user can sanity-check the choice.     */
/* -------------------------------------------------------------------------- */

const SAMPLE_VALUE_CAP = 10

export type ColumnMappingModalProps = {
  open: boolean
  onClose: () => void
  /** Sheet the issue originated on — used to seed the per-property "sheet" pick. */
  sourceSheet: string
  /** Fires once the user confirms the manual mapping. Hands off a draft
   *  IssueState to the caller, which then opens the review modal. */
  onConfirm: (next: IssueState) => void
}

type ColumnPick = { sheet: string; column: string }

export const ColumnMappingModal = ({
  open,
  onClose,
  sourceSheet,
  onConfirm,
}: ColumnMappingModalProps) => {
  // Build the editable list once per open. Each property starts pre-filled
  // when Sandy already knew where it lived; missing ones start empty so the
  // user has to make the choice explicitly.
  const seeded = useMemo<Record<string, ColumnPick>>(() => {
    const out: Record<string, ColumnPick> = {}
    for (const status of buildPropertyStatuses(sourceSheet)) {
      out[status.property] =
        status.presence === 'found' && status.sheet && status.column
          ? { sheet: status.sheet, column: status.column }
          : { sheet: '', column: '' }
    }
    return out
  }, [sourceSheet])

  const properties = useMemo(
    () => operationsPropertiesForSheet(sourceSheet),
    [sourceSheet],
  )

  const [picks, setPicks] = useState<Record<string, ColumnPick>>(seeded)
  // Reset the working picks every time the modal opens — a previous
  // session's draft shouldn't bleed into the next one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on open
  useEffect(() => {
    if (open) setPicks(seeded)
  }, [open])

  const setSheet = (property: string, sheet: string) =>
    setPicks((curr) => ({
      ...curr,
      [property]: { sheet, column: '' },
    }))
  const setColumn = (property: string, column: string) =>
    setPicks((curr) => ({
      ...curr,
      [property]: { sheet: curr[property]?.sheet ?? sourceSheet, column },
    }))

  const sheetItems = EXAMPLE_WORKBOOK.sheets.map((s) => ({
    value: s.name,
    label: s.name,
  }))

  const columnsForSheet = (sheet: string) => {
    const s = EXAMPLE_WORKBOOK.sheets.find((x) => x.name === sheet)
    if (!s) return []
    return s.columns.map((c) => ({ value: c.name, label: c.name }))
  }

  const filledCount = Object.values(picks).filter(
    (p) => p.sheet && p.column,
  ).length

  // Build the program from the user's picks. Joins aren't expressible
  // through this minimal UI, so every pick becomes a `column` expression —
  // good enough for the demo + future iterations can layer in joins.
  const handleConfirm = () => {
    const program: SchemaRuleProgram = {
      sheetName: sourceSheet,
      rules: Object.fromEntries(
        Object.entries(picks)
          .filter(([, p]) => p.sheet && p.column)
          .map(([property, p]) => [
            property,
            { kind: 'column', sheet: p.sheet, column: p.column },
          ]),
      ),
      source: 'manual',
    }
    onConfirm({ resolution: { kind: 'rule-program', program } })
    onClose()
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Map your file's columns"
      description="Pair each Sandy property with the sheet and column it lives on. We'll review the inferred structure together once you confirm."
      maxWidth="780px"
      fillHeight
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={filledCount === 0}
          >
            Confirm mapping ({filledCount} of {properties.length})
          </Button>
        </>
      }
    >
      <div className="sticky top-0 z-10 grid grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(180px,1.4fr)] items-baseline gap-3 border-b border-border-tertiary bg-bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        <span>Sandy property</span>
        <span>Sheet name</span>
        <span>Column name</span>
      </div>
      <ul className="flex flex-col">
        {properties.map((p, idx) => {
          const pick = picks[p.property] ?? { sheet: '', column: '' }
          const needsAttention = !pick.sheet || !pick.column
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
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

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
      if (!str) continue
      if (seen.has(str)) continue
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
          className={clsx(
            'absolute left-0 right-0 top-full z-10 mt-1 flex flex-col gap-1 rounded-lg border-2 border-border-tertiary bg-bg-primary px-3 py-2 shadow-lg',
          )}
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
