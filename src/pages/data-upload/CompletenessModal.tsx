import clsx from 'clsx'
import { Fragment } from 'react'
import { Button, Modal } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Public types — exported so CompletenessStep can author mock data            */
/* -------------------------------------------------------------------------- */

export type CompletenessChange =
  | { kind: 'add-cell'; rowId: string; column: string; value: string }
  | {
      kind: 'edit-cell'
      rowId: string
      column: string
      oldValue: string
      newValue: string
    }
  | { kind: 'remove-row'; rowId: string }
  | { kind: 'add-row'; rowId: string; cells: Record<string, string> }

export type CompletenessColumn = {
  key: string
  label: string
  numeric?: boolean
}

export type CompletenessTableRow = {
  id: string
  cells: Record<string, string>
}

export type CompletenessTable = {
  /** Section title shown above the grid, e.g. "Operations · Long Bottom". */
  title: string
  columns: CompletenessColumn[]
  /**
   * The user's existing rows for the affected scope (may be empty when Sandy
   * is reconstructing a whole table from scratch).
   */
  rows: CompletenessTableRow[]
  /** Changes Sandy will apply on accept. */
  changes: CompletenessChange[]
}

export type CompletenessModalIssue = {
  title: string
  /** Short paragraph (max ~400px wide) describing the gap + the proposal. */
  explanation: string
  /** Where Sandy drew the estimate from. One bullet per data source. */
  sources: string[]
  /** One or more tables Sandy modifies. */
  tables: CompletenessTable[]
}

export type CompletenessModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  issue: CompletenessModalIssue
  /** Fired when the user accepts the changes. The card collapses on accept. */
  onAccept: () => void
}

/* -------------------------------------------------------------------------- */
/* AI star — used on new rows, edited cells, and the row leading edge          */
/* -------------------------------------------------------------------------- */

const AIStar = ({ className }: { className?: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className={clsx('shrink-0 text-sandy-700', className)}
  >
    <title>Enhanced by Sandy</title>
    <path
      d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z"
      fill="currentColor"
    />
    <circle cx="19" cy="5" r="1.2" fill="currentColor" />
    <circle cx="5" cy="19" r="0.9" fill="currentColor" />
  </svg>
)

/* -------------------------------------------------------------------------- */
/* Summary sentence helper — counts changes across all tables                  */
/* -------------------------------------------------------------------------- */

const summariseChanges = (tables: CompletenessTable[]): string => {
  let cellsFilled = 0
  let rowsAdded = 0
  let rowsRemoved = 0
  for (const t of tables) {
    for (const c of t.changes) {
      if (c.kind === 'add-cell' || c.kind === 'edit-cell') cellsFilled += 1
      else if (c.kind === 'add-row') rowsAdded += 1
      else if (c.kind === 'remove-row') rowsRemoved += 1
    }
  }
  const parts: string[] = []
  if (cellsFilled > 0)
    parts.push(`${cellsFilled} ${cellsFilled === 1 ? 'cell' : 'cells'} filled`)
  if (rowsAdded > 0)
    parts.push(
      `${rowsAdded} new ${rowsAdded === 1 ? 'row' : 'rows'} across ${tables.length} ${tables.length === 1 ? 'table' : 'tables'}`,
    )
  if (rowsRemoved > 0)
    parts.push(`${rowsRemoved} ${rowsRemoved === 1 ? 'row' : 'rows'} removed`)
  return parts.length === 0 ? 'No changes' : parts.join(' · ')
}

/* -------------------------------------------------------------------------- */
/* Change preview table — overlays Sandy's proposed changes on existing rows   */
/* -------------------------------------------------------------------------- */

const ChangePreview = ({ table }: { table: CompletenessTable }) => {
  // Index changes by (rowId, column) for cell-level lookups, and by rowId
  // for row-level changes (remove-row, add-row).
  const cellChanges = new Map<string, CompletenessChange>()
  const rowChanges = new Map<string, CompletenessChange>()
  for (const c of table.changes) {
    if (c.kind === 'add-cell' || c.kind === 'edit-cell') {
      cellChanges.set(`${c.rowId}:${c.column}`, c)
    } else {
      rowChanges.set(c.rowId, c)
    }
  }

  const addRowEntries: Array<{ id: string; cells: Record<string, string> }> = []
  for (const c of table.changes) {
    if (c.kind === 'add-row') {
      addRowEntries.push({ id: c.rowId, cells: c.cells })
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {table.title}
      </h3>
      <div className="overflow-hidden rounded-lg border-2 border-border-tertiary">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-bg-secondary text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="w-8 px-2 py-2" />
              {table.columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-3 py-2',
                    col.numeric ? 'text-right' : 'text-left',
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 && addRowEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length + 1}
                  className="px-3 py-6 text-center text-sm text-text-secondary"
                >
                  No rows in this table.
                </td>
              </tr>
            ) : null}

            {table.rows.map((row) => {
              const rowChange = rowChanges.get(row.id)
              const isRemoved = rowChange?.kind === 'remove-row'
              return (
                <tr
                  key={row.id}
                  className={clsx(
                    'border-t border-border-tertiary align-middle',
                    isRemoved && 'bg-support-bg-amber',
                  )}
                >
                  <td className="px-2 py-2" />
                  {table.columns.map((col) => {
                    const change = cellChanges.get(`${row.id}:${col.key}`)
                    const changed =
                      !!change &&
                      (change.kind === 'add-cell' ||
                        change.kind === 'edit-cell')
                    return (
                      <td
                        key={col.key}
                        className={clsx(
                          'px-3 py-2 align-middle tabular-nums',
                          col.numeric ? 'text-right' : 'text-left',
                          isRemoved && 'text-text-secondary line-through',
                          changed &&
                            'rounded-md outline outline-2 -outline-offset-2 outline-sandy-500 bg-sandy-50',
                        )}
                      >
                        <ChangedCell
                          existing={row.cells[col.key]}
                          change={change}
                          isRemoved={isRemoved}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {addRowEntries.map((row) => (
              <tr
                key={row.id}
                className="border-t border-border-tertiary bg-sandy-50 align-middle"
              >
                <td className="px-2 py-2 align-middle">
                  <AIStar />
                </td>
                {table.columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-3 py-2 align-middle tabular-nums text-text-primary',
                      col.numeric ? 'text-right' : 'text-left',
                    )}
                  >
                    {row.cells[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/**
 * Cell renderer for the existing-rows pass. Now that the green outline
 * lives on the parent <td>, the inline ghost-pill is gone — for
 * add-cell we just show the new value; for edit-cell we show the new
 * value with the old beneath struck through.
 */
const ChangedCell = ({
  existing,
  change,
  isRemoved,
}: {
  existing: string | undefined
  change: CompletenessChange | undefined
  isRemoved: boolean
}) => {
  if (isRemoved) return <>{existing ?? ''}</>
  if (!change) return <>{existing ?? ''}</>
  if (change.kind === 'add-cell') {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-primary">
        <AIStar />
        {change.value}
      </span>
    )
  }
  if (change.kind === 'edit-cell') {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-primary">
        <AIStar />
        <span>{change.newValue}</span>
        <span className="text-text-secondary line-through">
          {change.oldValue}
        </span>
      </span>
    )
  }
  return <>{existing ?? ''}</>
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

export const CompletenessModal = ({
  open,
  onOpenChange,
  issue,
  onAccept,
}: CompletenessModalProps) => {
  const summary = summariseChanges(issue.tables)
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={issue.title}
      description={issue.explanation}
      maxWidth="1100px"
      unstyled
      fillHeight
    >
      <header className="flex items-start justify-between gap-6 border-b-2 border-border-tertiary px-8 py-6">
        <div className="flex flex-1 flex-col gap-3">
          <h2 className="text-3xl font-semibold leading-tight text-text-primary">
            {issue.title}
          </h2>
          <p className="max-w-[400px] text-md text-text-secondary">
            {issue.explanation}
          </p>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Changes
            </span>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-text-brand-dark">
              <AIStar />
              {summary}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
        {issue.tables.map((t) => (
          <Fragment key={t.title}>
            <ChangePreview table={t} />
          </Fragment>
        ))}
        {issue.sources.length > 0 ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Sources
            </span>
            <ul className="flex flex-col gap-1 text-sm text-text-secondary">
              {issue.sources.map((s) => (
                <li key={s} className="flex items-start gap-2 leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-block size-1 shrink-0 rounded-full bg-text-secondary"
                  />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t-2 border-border-tertiary px-8 py-4">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Skip
        </Button>
        <Button variant="primary" onClick={onAccept}>
          Make changes
        </Button>
      </footer>
    </Modal>
  )
}
