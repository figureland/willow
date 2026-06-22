import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Modal,
  Select,
  TextInput,
} from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Mock detected tables                                                        */
/* -------------------------------------------------------------------------- */

type Confidence = 'high' | 'medium' | 'low'

type SnippetRow = {
  /** The literal cell values, one per column. */
  cells: string[]
  /** Indexes of cells Sandy is calling out — rendered with a sandy highlight. */
  highlight?: number[]
}

type DetectedTable = {
  id: string
  title: string
  confidence: Confidence
  meta: string
  /**
   * Tiny table snippet illustrating how Sandy parsed this block. The first
   * entry is the header row; subsequent entries are sample data rows.
   */
  snippet: {
    headers: string[]
    rows: SnippetRow[]
  }
  /** If true, the table needs a Yes / Something else decision. */
  needsCheck?: boolean
  /** Options shown in the "It's something else" dropdown for needsCheck items. */
  altCategories?: { value: string; label: string }[]
}

const TABLES: DetectedTable[] = [
  {
    id: 'field-ops',
    title: 'Field operations',
    confidence: 'high',
    meta: '142 rows · Jan–Oct 2025',
    snippet: {
      headers: ['Date', 'Field', 'Operation', 'Product', 'Rate'],
      rows: [
        {
          cells: ['8 Mar', 'Long Mead', 'Spraying', 'Roundup', '2.0 L/ha'],
        },
        {
          cells: ['15 Mar', 'Top Field', 'Drilling', 'Skyfall wheat', '—'],
        },
        {
          cells: ['22 Mar', 'Long Mead', 'Spraying', 'Atlantis', '0.4 kg/ha'],
        },
      ],
    },
  },
  {
    id: 'fertiliser',
    title: 'Fertiliser inputs',
    confidence: 'high',
    meta: '38 rows · separate heading block',
    snippet: {
      headers: ['Date', 'Field', 'Product', 'Rate'],
      rows: [
        { cells: ['12 Apr', 'Top Field', 'Nitram', '180 kg/ha'] },
        { cells: ['28 Apr', 'Top Field', 'Nitram', '90 kg/ha'] },
        { cells: ['14 May', 'Long Mead', 'CAN 27', '120 kg/ha'] },
      ],
    },
  },
  {
    id: 'fuel',
    title: "One table I'm not sure about",
    confidence: 'low',
    meta: 'rows 210–240, no clear heading',
    snippet: {
      // No obvious headers — show generic column letters so the user can see
      // exactly what Sandy is unsure about.
      headers: ['A', 'B', 'C', 'D'],
      rows: [
        {
          cells: ['red diesel', '1,240 L', 'machinery', '14 Aug'],
          highlight: [0, 1, 2],
        },
        {
          cells: ['red diesel', '980 L', 'drying', '21 Sep'],
          highlight: [0, 1, 2],
        },
        {
          cells: ['lubricant', '24 L', 'maintenance', '03 Oct'],
          highlight: [0, 1, 2],
        },
      ],
    },
    needsCheck: true,
    altCategories: [
      { value: 'fuel', label: 'Fuel & energy use' },
      { value: 'machinery', label: 'Machinery hours' },
      { value: 'inputs', label: 'Other inputs' },
      { value: 'misc', label: 'Something else (free text)' },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

type Decision = 'pending' | 'confirmed' | 'rejected' | 'skipped'

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Needs a quick check',
}

const CONFIDENCE_TONE: Record<Confidence, 'green' | 'orange' | 'red'> = {
  high: 'green',
  medium: 'orange',
  low: 'orange',
}

type SheetReviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export const SheetReviewModal = ({
  open,
  onOpenChange,
  onComplete,
}: SheetReviewModalProps) => {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    const seed: Record<string, Decision> = {}
    for (const t of TABLES) {
      // High-confidence tables default to confirmed so the happy path is just
      // "click next" — anything that needs a check stays pending.
      seed[t.id] = t.needsCheck ? 'pending' : 'confirmed'
    }
    return seed
  })
  const [altSelection, setAltSelection] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const setDecision = (id: string, next: Decision) =>
    setDecisions((curr) => ({ ...curr, [id]: next }))
  const setAlt = (id: string, value: string) =>
    setAltSelection((curr) => ({ ...curr, [id]: value }))

  const decidedCount = TABLES.filter(
    (t) => decisions[t.id] !== 'pending',
  ).length
  const progressPct = TABLES.length ? (decidedCount / TABLES.length) * 100 : 0

  const handleConfirm = () => {
    onComplete?.()
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Here's what I found — does this look right?"
      description="Tick what's correct. I handled the gaps and the different headings inside the sheet — you don't need to."
      maxWidth="720px"
      topBar={
        <div aria-hidden="true" className="h-1.5 w-full bg-bg-tertiary">
          <div
            className="h-full bg-bg-brand-primary transition-[width] duration-200 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Looks right
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {TABLES.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            decision={decisions[t.id]}
            altValue={altSelection[t.id] ?? null}
            onDecision={(next) => setDecision(t.id, next)}
            onAltChange={(value) => setAlt(t.id, value)}
          />
        ))}

        <div className="flex flex-col gap-2">
          <p className="text-md font-semibold text-text-primary">
            Anything else I should know about this file?
          </p>
          <p className="text-sm text-text-secondary">
            Optional. e.g. "Rates are in litres per hectare" · "Ignore the
            totals row at the bottom"
          </p>
          <TextInput
            value={notes}
            onValueChange={setNotes}
            aria-label="Anything else I should know about this file"
            placeholder="Add a note for Sandy"
          />
        </div>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Table card                                                                  */
/* -------------------------------------------------------------------------- */

const TableCard = ({
  table,
  decision,
  altValue,
  onDecision,
  onAltChange,
}: {
  table: DetectedTable
  decision: Decision
  altValue: string | null
  onDecision: (next: Decision) => void
  onAltChange: (value: string) => void
}) => (
  <Card className="flex flex-col gap-3">
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CheckGlyph state={decision === 'confirmed' ? 'on' : 'off'} />
          <h3 className="text-lg font-semibold text-text-primary">
            {table.title}
          </h3>
        </div>
        <p className="text-sm text-text-secondary">{table.meta}</p>
      </div>
      <Badge tone={CONFIDENCE_TONE[table.confidence]} size="sm">
        {CONFIDENCE_LABEL[table.confidence]}
      </Badge>
    </header>

    <div className="flex flex-col gap-2 rounded-md border-2 border-border-tertiary bg-bg-secondary p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
        A sample of how I read it
      </p>
      <SnippetTable snippet={table.snippet} />
    </div>

    {table.needsCheck ? (
      <NeedsCheckActions
        prompt={`This looks like ${
          table.altCategories?.[0]?.label.toLowerCase() ?? 'something'
        } — is it?`}
        confirmLabel={`Yes, it's ${
          table.altCategories?.[0]?.label.toLowerCase() ?? 'that'
        }`}
        altOptions={table.altCategories ?? []}
        decision={decision}
        altValue={altValue}
        onDecision={onDecision}
        onAltChange={onAltChange}
      />
    ) : (
      <YesNoActions decision={decision} onDecision={onDecision} />
    )}
  </Card>
)

const CheckGlyph = ({ state }: { state: 'on' | 'off' }) => (
  <span
    aria-hidden="true"
    className={
      state === 'on'
        ? 'grid size-5 place-items-center rounded-pill bg-bg-brand-primary text-bg-primary'
        : 'grid size-5 place-items-center rounded-pill border-2 border-border-secondary text-icon-secondary'
    }
  >
    {state === 'on' ? (
      // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — sibling text owns the label
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M5 12l4 4 10-10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <span className="size-1 rounded-pill bg-icon-secondary" />
    )}
  </span>
)

const YesNoActions = ({
  decision,
  onDecision,
}: {
  decision: Decision
  onDecision: (next: Decision) => void
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <Button
      variant={decision === 'confirmed' ? 'primary' : 'secondary'}
      onClick={() => onDecision('confirmed')}
    >
      Yes ✓
    </Button>
    <Button
      variant={decision === 'rejected' ? 'primary' : 'ghost'}
      onClick={() => onDecision('rejected')}
    >
      Not this →
    </Button>
  </div>
)

const NeedsCheckActions = ({
  prompt,
  confirmLabel,
  altOptions,
  decision,
  altValue,
  onDecision,
  onAltChange,
}: {
  prompt: string
  confirmLabel: string
  altOptions: { value: string; label: string }[]
  decision: Decision
  altValue: string | null
  onDecision: (next: Decision) => void
  onAltChange: (value: string) => void
}) => (
  <div className="flex flex-col gap-3">
    <p className="text-md text-text-primary">{prompt}</p>
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={decision === 'confirmed' ? 'primary' : 'secondary'}
        onClick={() => onDecision('confirmed')}
      >
        {confirmLabel}
      </Button>
      <div className="min-w-[220px]">
        <Select
          aria-label="It's something else"
          placeholder="It's something else"
          items={altOptions}
          value={altValue}
          onValueChange={(value) => {
            onAltChange(value ?? '')
            if (value) onDecision('rejected')
          }}
        />
      </div>
      <Button
        variant={decision === 'skipped' ? 'primary' : 'ghost'}
        onClick={() => onDecision('skipped')}
      >
        Skip this bit
      </Button>
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Snippet table                                                               */
/* -------------------------------------------------------------------------- */

const SnippetTable = ({ snippet }: { snippet: DetectedTable['snippet'] }) => (
  <div className="overflow-x-auto rounded-sm border border-border-tertiary bg-bg-primary">
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border-tertiary">
          {snippet.headers.map((header) => (
            <th
              key={header}
              className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {snippet.rows.map((row, i) => (
          <tr
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are stable per render
            key={i}
            className="border-b border-border-tertiary last:border-0"
          >
            {row.cells.map((cell, j) => {
              const isHighlighted = row.highlight?.includes(j) ?? false
              return (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: cells are stable per row
                  key={j}
                  className={
                    isHighlighted
                      ? 'px-2 py-1.5 text-sm tabular-nums text-text-brand-dark bg-sandy-100'
                      : 'px-2 py-1.5 text-sm tabular-nums text-text-primary'
                  }
                >
                  {cell}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
