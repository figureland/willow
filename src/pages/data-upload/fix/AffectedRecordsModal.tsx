import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Button, Modal } from '../../../components/ui'
import type { AffectedRecords, AffectedRow, Cell } from './affected-records'

/* -------------------------------------------------------------------------- */
/* AffectedRecordsModal — before / after snapshot with per-row exclude         */
/* -------------------------------------------------------------------------- */

const fmtCell = (value: Cell): string => {
  if (value === null) return '—'
  if (typeof value === 'number') return value.toString()
  return value
}

const RecordsTable = ({
  records,
  variant,
  excluded,
  onToggle,
}: {
  records: AffectedRecords
  variant: 'before' | 'after'
  excluded: Set<string>
  /** Toggle a row's exclusion. Only wired on the `before` table. */
  onToggle?: (rowId: string) => void
}) => {
  const rows = variant === 'before' ? records.before : records.after
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border-tertiary">
      <header
        className={clsx(
          'flex items-center justify-between gap-2 border-b border-border-tertiary px-4 py-2.5 text-sm font-semibold',
          variant === 'before'
            ? 'bg-support-bg-red/40 text-text-primary'
            : 'bg-support-bg-green/40 text-text-primary',
        )}
      >
        <span>{variant === 'before' ? 'Before' : 'After'}</span>
        <span className="text-xs font-medium text-text-secondary">
          {rows.length} {rows.length === 1 ? 'record' : 'records'}
        </span>
      </header>
      <div className="max-h-[320px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-bg-secondary text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <tr>
              {onToggle ? <th className="w-10 px-3 py-2 text-left" /> : null}
              {records.columns.map((col) => (
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={records.columns.length + (onToggle ? 1 : 0)}
                  className="px-3 py-6 text-center text-sm text-text-secondary"
                >
                  No records after fix
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isExcluded = excluded.has(row.id)
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      'border-t border-border-tertiary transition-colors',
                      isExcluded && 'bg-bg-tertiary text-text-secondary',
                    )}
                  >
                    {onToggle ? (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Include row ${row.id}`}
                          checked={!isExcluded}
                          onChange={() => onToggle(row.id)}
                          className="size-4 cursor-pointer accent-button-primary"
                        />
                      </td>
                    ) : null}
                    {records.columns.map((col) => (
                      <RecordCell
                        key={col.key}
                        row={row}
                        colKey={col.key}
                        numeric={col.numeric}
                        excluded={isExcluded}
                      />
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const RecordCell = ({
  row,
  colKey,
  numeric,
  excluded,
}: {
  row: AffectedRow
  colKey: string
  numeric?: boolean
  excluded: boolean
}) => {
  const highlighted = row.highlight?.includes(colKey) ?? false
  return (
    <td
      className={clsx(
        'px-3 py-2 tabular-nums',
        numeric ? 'text-right' : 'text-left',
        highlighted && !excluded && 'bg-support-bg-amber/40 font-medium',
        excluded && 'line-through',
      )}
    >
      {fmtCell(row.cells[colKey])}
    </td>
  )
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

export type AffectedRecordsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Card headline — rendered as the modal title. */
  title: string
  /** Subline rendered under the title. */
  description?: string
  records: AffectedRecords
  /** Already-excluded row ids from a previous open (preserved across reopens). */
  initialExcluded?: string[]
  /** Called when the user confirms. Receives the final excluded-id list. */
  onResolve: (excludedIds: string[]) => void
}

export const AffectedRecordsModal = ({
  open,
  onOpenChange,
  title,
  description,
  records,
  initialExcluded,
  onResolve,
}: AffectedRecordsModalProps) => {
  const [excluded, setExcluded] = useState<Set<string>>(
    () => new Set(initialExcluded ?? []),
  )

  // Reset when reopened, so the user always sees the saved selection.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only sync on open
  useEffect(() => {
    if (open) setExcluded(new Set(initialExcluded ?? []))
  }, [open])

  const toggle = (rowId: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })

  const includedCount = records.before.length - excluded.size

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      maxWidth="980px"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-secondary">
            {includedCount} of {records.before.length} records will be fixed
            {excluded.size > 0 ? ` · ${excluded.size} excluded` : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => onResolve(Array.from(excluded))}
            >
              Resolve
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Uncheck any row you want to exclude from the fix. Excluded rows are
          left untouched in your upload.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RecordsTable
            records={records}
            variant="before"
            excluded={excluded}
            onToggle={toggle}
          />
          <RecordsTable records={records} variant="after" excluded={excluded} />
        </div>
      </div>
    </Modal>
  )
}
