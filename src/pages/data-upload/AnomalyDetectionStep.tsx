import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Button,
  DataTable,
  type GridColDef,
  IconArrowLeft,
  IconArrowRight,
  IconSpotCheck,
  IconTrend,
} from '../../components/ui'
import {
  ANOMALIES,
  type Anomaly,
  type AnomalyColumn,
  COLUMNS_FOR,
  type ComparisonPoint,
  getAnomaly,
  type RegionalAnomaly,
  type SpotAnomaly,
  type TrendAnomaly,
} from './anomalies'
import { type AnomalyRowMap, useAnomalyState } from './anomaly-state'
import { SelectionActionBar } from './fix/fix-grid-bits'
import { type EditableField, RecordEditorSheet } from './fix/RecordEditorSheet'

/* -------------------------------------------------------------------------- */
/* Tones — sunflower for quick fixes, lagoon (teal) for long-term trends      */
/* -------------------------------------------------------------------------- */
/*
 * Two parallel palettes:
 *   - Sunflower (anchored on #FFEE8C at 400) — spot anomalies / "quick fixes".
 *   - Lagoon    (anchored on #85DFE2 at 400) — trend + regional anomalies.
 *
 * The 400 stop carries the surface / hero background; the 900 stop carries
 * the iconography and accent eyebrow so the dark-on-colour pairing stays
 * solidly legible.
 */

type Tone = {
  surface: string
  pageBg: string
  icon: string
  accent: string
  bodyText: string
  bodySecondary: string
  backChip: string
  backChipRing: string
  focusRing: string
  expandedRing: string
  cellHighlight: string
  chartBar: string
  chartBarCurrent: string
  chartLabelCurrent: string
}

const SUNFLOWER_TONE: Tone = {
  surface: 'bg-sunflower-400',
  pageBg: 'bg-sunflower-400',
  icon: 'text-sunflower-900',
  accent: 'text-sunflower-900',
  bodyText: 'text-sunflower-950',
  bodySecondary: 'text-sunflower-900/80',
  backChip: 'bg-sunflower-200 hover:bg-sunflower-300 text-sunflower-900',
  backChipRing: 'focus-visible:ring-sunflower-700/40',
  focusRing: 'focus-visible:ring-sunflower-700/40',
  expandedRing: 'ring-2 ring-sunflower-900/40',
  cellHighlight: 'bg-sunflower-200',
  chartBar: 'bg-sunflower-300',
  chartBarCurrent: 'bg-sunflower-700',
  chartLabelCurrent: 'text-sunflower-900',
}

const LAGOON_TONE: Tone = {
  surface: 'bg-lagoon-400',
  pageBg: 'bg-lagoon-400',
  icon: 'text-lagoon-900',
  accent: 'text-lagoon-900',
  bodyText: 'text-lagoon-950',
  bodySecondary: 'text-lagoon-900/80',
  backChip: 'bg-lagoon-200 hover:bg-lagoon-300 text-lagoon-900',
  backChipRing: 'focus-visible:ring-lagoon-700/40',
  focusRing: 'focus-visible:ring-lagoon-700/40',
  expandedRing: 'ring-2 ring-lagoon-900/40',
  cellHighlight: 'bg-lagoon-200',
  chartBar: 'bg-lagoon-300',
  chartBarCurrent: 'bg-lagoon-700',
  chartLabelCurrent: 'text-lagoon-900',
}

const toneFor = (kind: Anomaly['kind']): Tone =>
  kind === 'spot' ? SUNFLOWER_TONE : LAGOON_TONE

/* -------------------------------------------------------------------------- */
/* Step entry — routes between the list view and the comparison detail view  */
/* -------------------------------------------------------------------------- */

export const AnomalyDetectionStep = () => {
  const { panelId } = useParams<{ panelId?: string }>()
  const activeAnomaly = panelId ? getAnomaly(panelId) : undefined

  if (activeAnomaly && activeAnomaly.kind !== 'spot') {
    return <ComparisonAnomalyDetail anomaly={activeAnomaly} />
  }

  return <AnomalyList />
}

/* -------------------------------------------------------------------------- */
/* Save / discard bar — same shape as FixIssuesPage                          */
/* -------------------------------------------------------------------------- */

const SaveBar = () => {
  const { hasUnsavedChanges, saveChanges, discardChanges } = useAnomalyState()
  if (!hasUnsavedChanges) return null
  return (
    <div className="sticky top-[88px] z-20 flex flex-wrap items-center gap-3 border-b-2 border-border-tertiary bg-bg-primary px-8 py-3">
      <p className="text-sm text-text-secondary">
        You have unsaved changes — save to validate them against the rest of
        your upload.
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" onClick={discardChanges}>
          Discard changes
        </Button>
        <Button variant="primary" onClick={saveChanges}>
          Save changes
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Anomaly list — grid of cornflower-yellow cards                             */
/* -------------------------------------------------------------------------- */

const AnomalyList = () => {
  // One spot anomaly expanded at a time — keeps the page short.
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const quickFixes = ANOMALIES.filter((a) => a.kind === 'spot')
  const longTermTrends = ANOMALIES.filter((a) => a.kind !== 'spot')

  return (
    <div className="flex flex-col pb-24">
      <SaveBar />

      <section>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-8 py-10">
          <h1 className="text-3xl font-semibold text-text-primary">
            Worth a second look
          </h1>
          <p className="max-w-[640px] text-md text-text-secondary">
            Before you submit your data, we noticed a few unusual things that
            might be worth reviewing.
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-8 pt-8">
        {quickFixes.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-text-primary">
              Quick fixes
            </h2>
            {/* Quick fixes stack full-width — each row is its own surface
                that expands inline with the editable grid below the header. */}
            <div className="flex flex-col gap-4">
              {quickFixes.map((anomaly) => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  expanded={expandedId === anomaly.id}
                  onToggleExpand={() =>
                    setExpandedId((curr) =>
                      curr === anomaly.id ? null : anomaly.id,
                    )
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {longTermTrends.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-text-primary">
              Long-term trends
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {longTermTrends.map((anomaly) => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  expanded={false}
                  onToggleExpand={() => {
                    /* trend cards are real Links; no toggle */
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Anomaly card — square-ish tile with a large brown icon over yellow         */
/* -------------------------------------------------------------------------- */

const AnomalyIcon = ({ kind }: { kind: Anomaly['kind'] }) =>
  kind === 'spot' ? <IconSpotCheck size={56} /> : <IconTrend size={56} />

const AnomalyCard = ({
  anomaly,
  expanded,
  onToggleExpand,
}: {
  anomaly: Anomaly
  expanded: boolean
  onToggleExpand: () => void
}) => {
  const isSpot = anomaly.kind === 'spot'
  const tone = toneFor(anomaly.kind)
  const { editedIdsFor } = useAnomalyState()
  const editedIds = editedIdsFor(anomaly.id)
  // A spot anomaly is "applied" once every row Sandy was about to correct
  // has been touched by the user (either via Apply change or batch edit).
  const applied = isSpot && anomaly.rows.every((row) => editedIds.has(row.id))

  // Spot anomalies expand inline into the same yellow surface: the header
  // becomes a click target that toggles the body, and the body renders the
  // editable grid + Apply change footer beneath it.
  if (isSpot) {
    return (
      <div
        className={clsx(
          'flex w-full flex-col rounded-xl',
          tone.surface,
          'transition-all duration-200 ease-out',
          expanded && tone.expandedRing,
          applied && 'opacity-60',
        )}
      >
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          disabled={applied}
          className={clsx(
            'group flex w-full items-center gap-4 rounded-xl px-5 py-5 text-left',
            'transition-colors',
            !expanded && !applied && 'hover:bg-sunflower-500',
            'focus-visible:outline-none focus-visible:ring-2',
            tone.focusRing,
            applied && 'cursor-default',
          )}
        >
          <span className={clsx('shrink-0', tone.icon)}>
            <AnomalyIcon kind={anomaly.kind} />
          </span>
          <div className="flex flex-1 flex-col gap-1.5 min-w-0">
            <p
              className={clsx(
                'text-lg font-semibold leading-snug',
                tone.bodyText,
              )}
            >
              {anomaly.title}
            </p>
            <p className={clsx('text-sm', tone.bodySecondary)}>
              {anomaly.scope}
            </p>
          </div>
          {applied ? (
            <span
              className={clsx(
                'grid size-8 shrink-0 place-items-center rounded-full',
                'bg-sunflower-900 text-sunflower-50',
              )}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                role="img"
                aria-label="Applied"
                focusable="false"
              >
                <title>Applied</title>
                <path
                  d="M5 12.5l4.5 4.5L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={clsx(
                'pointer-events-none shrink-0 transition-transform duration-200',
                tone.icon,
                expanded ? 'rotate-90' : 'rotate-0',
              )}
            >
              <IconArrowRight size={20} />
            </span>
          )}
        </button>

        {expanded && !applied ? (
          <SpotAnomalyInline
            anomaly={anomaly as SpotAnomaly}
            tone={tone}
            onClose={onToggleExpand}
          />
        ) : null}
      </div>
    )
  }

  // Long-term-trend / regional cards link out to the detail subroute.
  return (
    <Link
      to={`/data-upload/anomaly-detection/${anomaly.id}`}
      className={clsx(
        'group relative flex h-full w-full flex-col gap-4 rounded-xl px-5 py-5 text-left',
        tone.surface,
        'transition-all duration-200 ease-out will-change-transform',
        'shadow-none hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]',
        'focus-visible:outline-none focus-visible:ring-2',
        tone.focusRing,
      )}
    >
      <span className={clsx('shrink-0', tone.icon)}>
        <AnomalyIcon kind={anomaly.kind} />
      </span>
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <p
          className={clsx('text-lg font-semibold leading-snug', tone.bodyText)}
        >
          {anomaly.title}
        </p>
        <p className={clsx('text-sm', tone.bodySecondary)}>{anomaly.scope}</p>
      </div>
      <span
        aria-hidden="true"
        className={clsx(
          'pointer-events-none mt-auto shrink-0 self-end',
          tone.icon,
          'opacity-0 translate-y-1 transition-all duration-200 ease-out',
          'group-hover:opacity-100 group-hover:translate-y-0',
        )}
      >
        <IconArrowRight size={20} />
      </span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Spot anomaly — inline editable grid + selection action bar                 */
/* -------------------------------------------------------------------------- */

type EditableAnomalyRow = AnomalyRowMap & { id: string }

const buildEditableFields = (
  columns: AnomalyColumn[],
): EditableField<EditableAnomalyRow>[] =>
  columns.map((col) => ({
    kind: 'text',
    key: col.key,
    rowKey: col.key as keyof EditableAnomalyRow & string,
    label: col.label,
    fromInput: col.numeric
      ? (raw) => {
          const n = Number(raw.trim())
          return Number.isFinite(n)
            ? (n as EditableAnomalyRow[keyof EditableAnomalyRow])
            : undefined
        }
      : (raw) => raw as EditableAnomalyRow[keyof EditableAnomalyRow],
  }))

const SpotAnomalyInline = ({
  anomaly,
  tone,
  onClose,
}: {
  anomaly: SpotAnomaly
  tone: Tone
  onClose: () => void
}) => {
  const { rowsFor, editedIdsFor, removedIdsFor, patchRows, removeRows } =
    useAnomalyState()
  const liveRows = rowsFor(anomaly.id)
  const editedIds = editedIdsFor(anomaly.id)
  const removedIds = removedIdsFor(anomaly.id)

  const columns = COLUMNS_FOR[anomaly.id] ?? []
  const fields = useMemo(() => buildEditableFields(columns), [columns])
  const gridColumns = useMemo(
    () =>
      buildAnomalyColumns<EditableAnomalyRow>(
        columns,
        anomaly.columnKey,
        editedIds,
        removedIds,
      ),
    [columns, anomaly.columnKey, editedIds, removedIds],
  )

  const rows: EditableAnomalyRow[] = useMemo(
    () =>
      anomaly.rows.map((row) => {
        const live = liveRows[row.id] ?? row.cells
        return { id: row.id, ...live }
      }),
    [anomaly.rows, liveRows],
  )

  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const [editorOpen, setEditorOpen] = useState(false)

  const selectedRecords = useMemo(
    () => rows.filter((r) => selection.has(r.id)),
    [rows, selection],
  )

  const onSave = (patch: Partial<EditableAnomalyRow>) => {
    const { id: _ignored, ...patchCells } = patch as {
      id?: string
    } & AnomalyRowMap
    patchRows(anomaly.id, selection, patchCells)
    setEditorOpen(false)
    setSelection(new Set())
  }

  // Sandy's suggested correction — applies the `suggestedValue` to every row
  // attached to this anomaly. The user can also batch-edit individual rows
  // via the selection action bar; the two paths converge on the same patch.
  const applyChange = () => {
    for (const row of anomaly.rows) {
      patchRows(anomaly.id, [row.id], {
        [anomaly.columnKey]: row.suggestedValue,
      })
    }
    onClose()
  }

  const allEdited = anomaly.rows.every((row) => editedIds.has(row.id))

  return (
    <div
      className={clsx(
        'flex flex-col gap-4 rounded-b-xl px-5 pb-5',
        tone.surface,
      )}
    >
      <p className={clsx('text-md', tone.bodySecondary)}>
        {anomaly.observation}
      </p>

      <DataTable<EditableAnomalyRow>
        rows={rows}
        columns={gridColumns}
        selectable
        hideFooter
        isRowSelectable={({ row }) => !removedIds.has(row.id)}
        rowSelectionModel={{ type: 'include', ids: selection }}
        onRowSelectionModelChange={(model) => {
          setSelection(new Set(Array.from(model.ids).map(String)))
        }}
        getRowClassName={({ row }) => {
          if (removedIds.has(row.id)) return 'row-removed'
          if (editedIds.has(row.id)) return 'row-edited'
          return ''
        }}
        className="rounded-md border-2 border-sunflower-500 bg-bg-primary"
      />

      <footer className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={applyChange}
          disabled={allEdited}
          // Brand primary is sandy-green; the anomaly surface is sunflower,
          // so the Apply CTA gets a dark molasses fill to read as a punchy
          // "apply" against the yellow card.
          className={clsx(
            'border-sunflower-900 bg-sunflower-900 text-sunflower-50',
            'hover:border-sunflower-950 hover:bg-sunflower-950',
            'active:border-sunflower-950 active:bg-sunflower-950',
          )}
        >
          {allEdited ? 'Change applied' : 'Apply change'}
        </Button>
      </footer>

      {selection.size > 0 ? (
        <SelectionActionBar
          count={selection.size}
          recordLabel="record"
          onEdit={() => setEditorOpen(true)}
          onDelete={() => removeRows(anomaly.id, selection)}
          onClear={() => setSelection(new Set())}
        />
      ) : null}

      <RecordEditorSheet<EditableAnomalyRow>
        open={editorOpen}
        onOpenChange={setEditorOpen}
        records={selectedRecords}
        fields={fields}
        recordLabel="record"
        onSave={onSave}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Comparison anomaly detail — editable grid + selection action bar           */
/* -------------------------------------------------------------------------- */

const ComparisonAnomalyDetail = ({
  anomaly,
}: {
  anomaly: TrendAnomaly | RegionalAnomaly
}) => {
  const { rowsFor, editedIdsFor, removedIdsFor, patchRows, removeRows } =
    useAnomalyState()
  const liveRows = rowsFor(anomaly.id)
  const editedIds = editedIdsFor(anomaly.id)
  const removedIds = removedIdsFor(anomaly.id)

  const columns = COLUMNS_FOR[anomaly.id] ?? []
  const fields = useMemo(() => buildEditableFields(columns), [columns])
  const gridColumns = useMemo(
    () =>
      buildAnomalyColumns<EditableAnomalyRow>(
        columns,
        null,
        editedIds,
        removedIds,
      ),
    [columns, editedIds, removedIds],
  )

  const rows: EditableAnomalyRow[] = useMemo(
    () =>
      anomaly.rows.map((row) => {
        const live = liveRows[row.id] ?? row.cells
        return { id: row.id, ...live }
      }),
    [anomaly.rows, liveRows],
  )

  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const [editorOpen, setEditorOpen] = useState(false)

  const selectedRecords = useMemo(
    () => rows.filter((r) => selection.has(r.id)),
    [rows, selection],
  )

  const onSave = (patch: Partial<EditableAnomalyRow>) => {
    const { id: _ignored, ...patchCells } = patch as {
      id?: string
    } & AnomalyRowMap
    patchRows(anomaly.id, selection, patchCells)
    setEditorOpen(false)
    setSelection(new Set())
  }

  const referenceLabel =
    anomaly.kind === 'trend' ? anomaly.comparisonLabel : `vs. ${anomaly.region}`
  const tone = toneFor(anomaly.kind)

  return (
    <div className="flex flex-col pb-24">
      <SaveBar />

      {/* Full-bleed hero — tone-coloured surface, deep accent for type. */}
      <section className={clsx(tone.pageBg, tone.bodyText)}>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-8 py-10">
          <div className="self-start">
            <Link
              to="/data-upload/anomaly-detection"
              className={clsx(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold',
                tone.backChip,
                'focus-visible:outline-none focus-visible:ring-2',
                tone.backChipRing,
              )}
            >
              <IconArrowLeft size={16} />
              Back to anomalies
            </Link>
          </div>
          <header className="flex flex-col gap-2">
            <p
              className={clsx(
                'text-xs font-semibold uppercase tracking-wide',
                tone.accent,
              )}
            >
              {referenceLabel}
            </p>
            <h1
              className={clsx(
                'max-w-[820px] text-3xl font-semibold leading-tight',
                tone.bodyText,
              )}
            >
              {anomaly.title}
            </h1>
            <p className={clsx('max-w-[680px] text-md', tone.bodySecondary)}>
              {anomaly.observation}
            </p>
          </header>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-8 pt-8">
        <ComparisonChart
          series={anomaly.series}
          currentIndex={anomaly.currentIndex}
          unit={anomaly.unit}
          tone={tone}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-text-primary">
            Affected records
          </h2>
          <DataTable<EditableAnomalyRow>
            rows={rows}
            columns={gridColumns}
            selectable
            hideFooter
            isRowSelectable={({ row }) => !removedIds.has(row.id)}
            rowSelectionModel={{ type: 'include', ids: selection }}
            onRowSelectionModelChange={(model) => {
              setSelection(new Set(Array.from(model.ids).map(String)))
            }}
            getRowClassName={({ row }) => {
              if (removedIds.has(row.id)) return 'row-removed'
              if (editedIds.has(row.id)) return 'row-edited'
              return ''
            }}
            className="border-2 border-border-tertiary"
          />
        </section>
      </div>

      {selection.size > 0 ? (
        <SelectionActionBar
          count={selection.size}
          recordLabel="record"
          onEdit={() => setEditorOpen(true)}
          onDelete={() => removeRows(anomaly.id, selection)}
          onClear={() => setSelection(new Set())}
        />
      ) : null}

      <RecordEditorSheet<EditableAnomalyRow>
        open={editorOpen}
        onOpenChange={setEditorOpen}
        records={selectedRecords}
        fields={fields}
        recordLabel="record"
        onSave={onSave}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* ComparisonChart — minimal bar chart, current bar highlighted               */
/* -------------------------------------------------------------------------- */

const ComparisonChart = ({
  series,
  currentIndex,
  unit,
  tone,
}: {
  series: ComparisonPoint[]
  currentIndex: number
  unit: string
  tone: Tone
}) => {
  const max = Math.max(...series.map((p) => p.value), 1)
  return (
    <section className="flex flex-col gap-4 rounded-xl border-2 border-border-tertiary bg-bg-primary p-6">
      {/* Three-row grid per column — value label · bar well · axis label.
          The middle row is `1fr` and pinned to a 240px container height, so
          each bar's percent height resolves against a real number (otherwise
          the well collapses to its content and all bars look ~4px tall). */}
      <div
        className="grid h-60 gap-x-4"
        style={{
          gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`,
          gridTemplateRows: 'auto 1fr auto',
        }}
      >
        {series.map((point, i) => {
          const isCurrent = i === currentIndex
          return (
            <span
              key={`${point.label}-value`}
              className={clsx(
                'flex items-end justify-center text-sm font-semibold tabular-nums',
                isCurrent ? tone.chartLabelCurrent : 'text-text-secondary',
              )}
              style={{ gridColumn: i + 1, gridRow: 1 }}
            >
              {point.value} {unit}
            </span>
          )
        })}
        {series.map((point, i) => {
          const heightPct = (point.value / max) * 100
          const isCurrent = i === currentIndex
          return (
            <div
              key={`${point.label}-bar`}
              className="flex items-end pt-2"
              style={{ gridColumn: i + 1, gridRow: 2 }}
            >
              <div
                aria-hidden="true"
                className={clsx(
                  'w-full rounded-md transition-all',
                  isCurrent ? tone.chartBarCurrent : tone.chartBar,
                )}
                style={{ height: `${heightPct}%`, minHeight: '4px' }}
              />
            </div>
          )
        })}
        {series.map((point, i) => {
          const isCurrent = i === currentIndex
          return (
            <span
              key={`${point.label}-axis`}
              className={clsx(
                'pt-2 text-center text-xs font-medium',
                isCurrent ? 'text-text-primary' : 'text-text-secondary',
              )}
              style={{ gridColumn: i + 1, gridRow: 3 }}
            >
              {point.label}
            </span>
          )
        })}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Shared grid column builder                                                 */
/* -------------------------------------------------------------------------- */

const buildAnomalyColumns = <Row extends { id: string }>(
  columns: AnomalyColumn[],
  highlightKey: string | null,
  editedIds: Set<string>,
  removedIds: Set<string>,
): GridColDef<Row>[] =>
  columns.map((col) => ({
    field: col.key,
    headerName: col.label,
    flex: 1,
    minWidth: 120,
    sortable: false,
    filterable: false,
    type: col.numeric ? 'number' : 'string',
    cellClassName: ({ row }) => {
      // Edited / removed rows outrank the warning highlight — the user's
      // intent wins once they've touched the row.
      if (removedIds.has((row as { id: string }).id)) return ''
      if (editedIds.has((row as { id: string }).id)) return ''
      return col.key === highlightKey ? 'cell-issue-warning' : ''
    },
    renderCell: ({ row }) => {
      // biome-ignore lint/suspicious/noExplicitAny: row shape varies by anomaly
      const value = (row as any)[col.key]
      if (value === undefined || value === null || value === '') {
        return <span className="text-text-secondary">—</span>
      }
      return (
        <span className={col.numeric ? 'tabular-nums' : undefined}>
          {String(value)}
          {col.unit ? ` ${col.unit}` : ''}
        </span>
      )
    },
  }))
