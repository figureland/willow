import clsx from 'clsx'
import { Button, type GridColDef } from '../../../components/ui'
import { RowStatusPip, statusFor } from './RowStatusPip'
import type { RowIssue } from './row-issues'

/* -------------------------------------------------------------------------- */
/* Shared row chrome — status pip, action pill, selection action bar          */
/* -------------------------------------------------------------------------- */

export type RowAction = 'create' | 'edit' | 'delete'

const ACTION_LABEL: Record<RowAction, string> = {
  create: 'CREATE',
  edit: 'EDIT',
  delete: 'DELETE',
}

export const ActionPill = ({ action }: { action: RowAction }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-[0.15px]',
      'bg-text-secondary/10 text-text-secondary',
    )}
  >
    {ACTION_LABEL[action]}
  </span>
)

export const actionFor = (
  rowId: string,
  edited: Set<string>,
  removed: Set<string>,
): RowAction => {
  if (removed.has(rowId)) return 'delete'
  if (edited.has(rowId)) return 'edit'
  return 'create'
}

export const statusColumn = <Row extends { id: string; issues: RowIssue[] }>(
  removed: Set<string>,
  /** Optional override — rows where this returns true render as clean. */
  cleanOverride?: (rowId: string) => boolean,
  /** Optional click handler — fires when the user clicks the pip itself.
   *  Provides the row's id so callers can open an editor / drill-down. */
  onPipClick?: (rowId: string) => void,
): GridColDef<Row> => ({
  field: '__status',
  headerName: '',
  sortable: false,
  filterable: false,
  width: 36,
  align: 'center',
  headerAlign: 'center',
  renderCell: ({ row }) => {
    const isClean = removed.has(row.id) || cleanOverride?.(row.id)
    return (
      <RowStatusPip
        status={isClean ? 'clean' : statusFor(row.issues)}
        // Forward the issue list so the hover-tooltip can summarise what's
        // wrong with the row.
        issues={isClean ? undefined : row.issues}
        onClick={onPipClick ? () => onPipClick(row.id) : undefined}
      />
    )
  },
})

export const actionColumn = <Row extends { id: string }>(
  edited: Set<string>,
  removed: Set<string>,
): GridColDef<Row> => ({
  field: '__action',
  headerName: 'Action',
  sortable: false,
  filterable: false,
  width: 96,
  renderCell: ({ row }) => (
    <ActionPill action={actionFor(row.id, edited, removed)} />
  ),
})

/* -------------------------------------------------------------------------- */
/* Bottom selection action bar — Delete (destructive) + Edit                  */
/* -------------------------------------------------------------------------- */

export const SelectionActionBar = ({
  count,
  recordLabel,
  onEdit,
  onDelete,
  onClear,
}: {
  count: number
  recordLabel: string
  onEdit: () => void
  onDelete: () => void
  onClear: () => void
}) => (
  <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-6 pb-6">
    <div className="pointer-events-auto flex items-center gap-4 rounded-pill border-2 border-border-tertiary bg-bg-primary px-4 py-2 shadow-xl">
      <div className="flex items-center gap-3">
        <span className="text-md font-medium text-text-primary">
          {count} {count === 1 ? recordLabel : `${recordLabel}s`} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-text-secondary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Clear
        </button>
      </div>
      <div className="h-6 w-px bg-border-tertiary" />
      <div className="flex items-center gap-2">
        <Button variant="destructive" onClick={onDelete}>
          Delete {count === 1 ? 'record' : `${count} records`}
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Edit {count === 1 ? 'record' : `${count} records`}
        </Button>
      </div>
    </div>
  </div>
)
