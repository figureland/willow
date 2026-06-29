import {
  DataGrid,
  type DataGridProps,
  type GridColDef,
  gridPageCountSelector,
  gridPageSelector,
  gridPageSizeSelector,
  gridRowCountSelector,
  useGridApiContext,
  useGridRootProps,
  useGridSelector,
} from '@mui/x-data-grid'
import clsx from 'clsx'
import type { ChangeEvent } from 'react'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { IconChevronDown } from './icons'
import { Select } from './Select'
import { TextInput } from './TextInput'

export type { GridColDef } from '@mui/x-data-grid'

export type DataTableProps<Row extends Record<string, unknown>> = Omit<
  DataGridProps<Row>,
  'columns' | 'rows' | 'slots' | 'slotProps' | 'checkboxSelection'
> & {
  rows: Row[]
  columns: GridColDef<Row>[]
  pageSizeOptions?: number[]
  defaultPageSize?: number
  /**
   * Whether rows can be selected via the checkbox column.
   * Defaults to `true`. Pass `false` to hide the checkbox column entirely.
   */
  selectable?: boolean
  className?: string
}

/**
 * Themed wrapper around MUI X DataGrid. Maps every visual slot onto our
 * design tokens. Use it for any tabular data in the prototype — column
 * configuration, row models, sorting and pagination behaviour all come from
 * the underlying DataGrid API.
 */
export const DataTable = <Row extends Record<string, unknown>>({
  rows,
  columns,
  pageSizeOptions = [5, 10, 20, 50],
  defaultPageSize = 10,
  selectable = true,
  className,
  initialState,
  ...rest
}: DataTableProps<Row>) => (
  <div className={clsx('rounded-xl overflow-hidden bg-bg-primary', className)}>
    <DataGrid
      rows={rows}
      columns={columns}
      checkboxSelection={selectable}
      disableRowSelectionOnClick
      pageSizeOptions={pageSizeOptions}
      pagination
      /*
       * Grow with the rendered rows so the page (AppShell's main column)
       * owns scrolling — no nested vertical scrollbar competing with the
       * outer one.
       */
      autoHeight
      columnHeaderHeight={40}
      rowHeight={36}
      initialState={{
        pagination: { paginationModel: { pageSize: defaultPageSize, page: 0 } },
        ...initialState,
      }}
      slots={{
        baseCheckbox: TokenCheckbox,
        columnSortedAscendingIcon: AscIcon,
        columnSortedDescendingIcon: DescIcon,
        columnUnsortedIcon: UnsortedIcon,
        pagination: TokenPagination,
      }}
      sx={tableSx}
      {...rest}
    />
  </div>
)

/* -------------------------------------------------------------------------- */
/* Token-driven DataGrid theme                                                 */
/* -------------------------------------------------------------------------- */

const tableSx = {
  border: '2px solid var(--color-border-tertiary)',
  borderRadius: '12px',
  fontFamily: 'inherit',
  color: 'var(--color-text-primary)',
  letterSpacing: '0.25px',
  backgroundColor: 'var(--color-bg-primary)',
  /*
   * Suppress MUI's built-in hairline row dividers (they paint `borderBottom:
   * 1px solid var(--DataGrid-rowBorderColor)` on the row, cells, AND the
   * empty filler row). We draw our own 2px slate-100 divider on the row.
   */
  '--DataGrid-rowBorderColor': 'transparent',

  /* Column headers */
  '& .MuiDataGrid-columnHeaders': {
    borderBottom: '2px solid var(--color-slate-100)',
    backgroundColor: 'var(--color-bg-primary)',
  },
  /*
   * MUI v9 emits its own font shorthand for the data grid with higher
   * specificity than our `sx` rules. We win it back by chaining the class
   * twice (`.MuiDataGrid-columnHeader.MuiDataGrid-columnHeader`) — same
   * element, double specificity, no need for `!important`.
   */
  '& .MuiDataGrid-columnHeader.MuiDataGrid-columnHeader': {
    paddingInline: '12px',
    color: 'var(--color-text-secondary)',
    fontFamily: 'inherit',
    fontWeight: 500,
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0.15px',
    textTransform: 'uppercase',
    outline: 'none',
  },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 500 },
  '& .MuiDataGrid-columnSeparator': { display: 'none' },
  '& .MuiDataGrid-menuIcon': { display: 'none' },
  '& .MuiDataGrid-iconButtonContainer': {
    opacity: 0,
    transition: 'opacity 120ms ease',
  },
  '& .MuiDataGrid-columnHeader:hover .MuiDataGrid-iconButtonContainer': {
    opacity: 1,
  },
  '& .MuiDataGrid-columnHeader--sorted .MuiDataGrid-iconButtonContainer': {
    opacity: 1,
  },

  /* Cells + rows */
  '& .MuiDataGrid-row': {
    borderBottom: '2px solid var(--color-slate-100)',
  },
  '& .MuiDataGrid-row:last-of-type': { borderBottom: 'none' },
  '& .MuiDataGrid-row:hover': {
    backgroundColor: 'var(--color-bg-secondary)',
  },
  '& .MuiDataGrid-row.Mui-selected': {
    backgroundColor: 'var(--color-sandy-100)',
  },
  '& .MuiDataGrid-row.Mui-selected:hover': {
    backgroundColor: 'var(--color-sandy-100)',
  },
  // Selection accent — a 3px sandy bar inside the row's left edge, drawn via
  // box-shadow so it sits on top of any background tint (severity, edited,
  // removed). This is the row-level highlight that survives regardless of
  // the row colour state.
  '& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover': {
    boxShadow: 'inset 3px 0 0 0 var(--color-sandy-600)',
  },
  // Severity-tinted rows. Consumers opt in via `getRowClassName` returning
  // `row-issue-blocking` / `row-issue-warning`. Hover states preserved.
  '& .MuiDataGrid-row.row-issue-blocking': {
    backgroundColor: 'var(--color-support-bg-red)',
  },
  '& .MuiDataGrid-row.row-issue-blocking:hover': {
    backgroundColor: 'var(--color-support-bg-red)',
  },
  '& .MuiDataGrid-row.row-issue-warning': {
    backgroundColor: 'var(--color-support-bg-amber)',
  },
  '& .MuiDataGrid-row.row-issue-warning:hover': {
    backgroundColor: 'var(--color-support-bg-amber)',
  },
  // Edited rows — pale blue tint signals the row carries unsaved changes.
  // `row-edited` outranks the severity tints (consumers should not return
  // both simultaneously; if they do, edited takes precedence).
  '& .MuiDataGrid-row.row-edited, & .MuiDataGrid-row.row-edited:hover': {
    backgroundColor: 'var(--color-support-bg-blue)',
  },
  // Removed rows — kept in the table for visibility but rendered as a
  // strikethrough at reduced opacity, so the user can undo before saving.
  '& .MuiDataGrid-row.row-removed, & .MuiDataGrid-row.row-removed:hover': {
    opacity: 0.5,
    textDecoration: 'line-through',
    textDecorationColor: 'var(--color-text-secondary)',
  },
  // Severity-tinted cells. Consumers opt in via `cellClassName` returning
  // `cell-issue-blocking` / `cell-issue-warning`. Used by Fix-issue cards to
  // highlight the specific column(s) driving an issue.
  '& .MuiDataGrid-cell.cell-issue-blocking': {
    backgroundColor: 'var(--color-support-bg-red)',
    fontWeight: 500,
  },
  '& .MuiDataGrid-cell.cell-issue-warning': {
    backgroundColor: 'var(--color-support-bg-amber)',
    fontWeight: 500,
  },
  '& .MuiDataGrid-cell.cell-issue-clean': {
    backgroundColor: 'var(--color-support-bg-green)',
    color: 'var(--color-text-brand-dark)',
    fontWeight: 500,
  },
  // Severity-tinted column headers. Consumers opt in via `headerClassName`.
  '& .MuiDataGrid-columnHeader.header-issue-blocking': {
    backgroundColor: 'var(--color-support-bg-red)',
  },
  '& .MuiDataGrid-columnHeader.header-issue-warning': {
    backgroundColor: 'var(--color-support-bg-amber)',
  },
  '& .MuiDataGrid-cell.MuiDataGrid-cell': {
    paddingInline: '12px',
    paddingBlock: '6px',
    color: 'var(--color-text-primary)',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '20px',
    borderTop: 'none',
    borderBottom: 'none',
    outline: 'none !important',
    display: 'flex',
    alignItems: 'center',
  },

  /*
   * Checkbox column — MUI sets the cell width to 50px. Our global header/cell
   * paddingInline of 24px would leave just 2px of usable space, cropping the
   * checkbox. Zero the padding here and centre the box inside instead.
   */
  '& .MuiDataGrid-columnHeaderCheckbox, & .MuiDataGrid-cellCheckbox': {
    paddingInline: '0 !important',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '& .MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-columnHeaderTitleContainerContent':
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: 0,
    },
  '& .MuiDataGrid-columnHeaderCheckbox .MuiDataGrid-checkboxInput, & .MuiDataGrid-cellCheckbox .MuiDataGrid-checkboxInput':
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

  '& .MuiDataGrid-footerContainer': {
    borderTop: '2px solid var(--color-slate-100)',
    minHeight: '64px',
  },

  '& .MuiDataGrid-virtualScroller': {
    backgroundColor: 'var(--color-bg-primary)',
  },
  '& .MuiDataGrid-overlay': {
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-secondary)',
  },
} as const

/* -------------------------------------------------------------------------- */
/* Slot overrides                                                              */
/* -------------------------------------------------------------------------- */

type BaseCheckboxProps = {
  checked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  // SwitchBase signature: (event, checked) — DataGrid relies on the second arg.
  onChange?: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void
  inputProps?: { 'aria-label'?: string }
  className?: string
}

/**
 * Adapt our Base UI <Checkbox> into the shape MUI DataGrid's baseCheckbox
 * slot expects. The grid wires its select-all / row-select handlers up to
 * `onChange(event, checked)`, so we must fire that two-arg signature with a
 * synthetic event whose `target.checked` reflects the new state.
 */
const TokenCheckbox = ({
  checked,
  indeterminate,
  disabled,
  onChange,
  inputProps,
  className,
}: BaseCheckboxProps) => (
  <Checkbox
    checked={!!checked}
    indeterminate={!!indeterminate}
    disabled={disabled}
    aria-label={inputProps?.['aria-label']}
    className={className}
    onCheckedChange={(next) => {
      if (!onChange) return
      // MUI's row-selection handler reads `event.shiftKey` AND
      // `event.nativeEvent.shiftKey` (for click-with-shift range selection),
      // plus `target.checked` for the new value. Synthesise enough of the
      // SyntheticEvent shape that those reads don't throw.
      const fakeEvent = {
        target: { checked: next, type: 'checkbox' },
        currentTarget: { checked: next, type: 'checkbox' },
        shiftKey: false,
        nativeEvent: { shiftKey: false },
        preventDefault() {},
        stopPropagation() {},
      } as unknown as ChangeEvent<HTMLInputElement>
      onChange(fakeEvent, next)
    }}
  />
)

// MUI passes through non-DOM props (e.g. `sortingOrder`) to slot icons. Only
// forward `className` to keep React from warning about unknown DOM attributes.
const AscIcon = ({ className }: { className?: string }) => (
  <span className={clsx('inline-flex text-icon-secondary', className)}>
    <IconChevronDown size={16} className="rotate-180" />
  </span>
)
const DescIcon = ({ className }: { className?: string }) => (
  <span className={clsx('inline-flex text-icon-secondary', className)}>
    <IconChevronDown size={16} />
  </span>
)
const UnsortedIcon = ({ className }: { className?: string }) => (
  <span className={clsx('inline-flex text-icon-secondary', className)}>
    <SortUnsetGlyph />
  </span>
)

const SortUnsetGlyph = () => (
  <svg
    width="12"
    height="16"
    viewBox="0 0 12 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M6 1l3 4H3l3-4ZM6 15l-3-4h6l-3 4Z"
      fill="currentColor"
      opacity="0.4"
    />
  </svg>
)

/* -------------------------------------------------------------------------- */
/* Pagination footer — composed of design-system primitives                    */
/* -------------------------------------------------------------------------- */

const TokenPagination = () => {
  const apiRef = useGridApiContext()
  const rootProps = useGridRootProps()
  const page = useGridSelector(apiRef, gridPageSelector)
  const pageSize = useGridSelector(apiRef, gridPageSizeSelector)
  const pageCount = useGridSelector(apiRef, gridPageCountSelector)
  const total = useGridSelector(apiRef, gridRowCountSelector)

  const safePageCount = Math.max(1, pageCount || 1)
  const startRow = total === 0 ? 0 : page * pageSize + 1
  const endRow = Math.min(total, (page + 1) * pageSize)

  const goToPage = (next: number) => {
    const clamped = Math.max(0, Math.min(safePageCount - 1, next))
    apiRef.current.setPage(clamped)
  }

  const pageSizeOptions = (
    (rootProps.pageSizeOptions as Array<
      number | { value: number; label: string }
    >) ?? [5, 10, 20, 50]
  ).map((s) => (typeof s === 'number' ? s : s.value))

  return (
    <div className="flex flex-1 flex-wrap items-center gap-6 px-8 py-3 text-md text-text-primary">
      <span className="shrink-0">
        Showing {startRow}-{endRow} of {total}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <span>Items per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(next) => apiRef.current.setPageSize(Number(next))}
          clearable={false}
          width={96}
          items={pageSizeOptions.map((size) => ({
            value: String(size),
            label: String(size),
          }))}
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 min-w-0">
        <span className="shrink-0">Page</span>
        <TextInput
          value={String(page + 1)}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Current page"
          fullWidth={false}
          className="w-16"
          onValueChange={(next) => {
            const n = Number(next)
            if (Number.isFinite(n) && n >= 1 && n <= safePageCount) {
              goToPage(n - 1)
            }
          }}
        />
        <span className="shrink-0">of {safePageCount}</span>

        <Button
          variant="ghost"
          size="md"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => goToPage(page - 1)}
          leadingIcon={<IconChevronDown size={20} className="rotate-90" />}
        >
          <span className="sr-only">Previous</span>
        </Button>
        <Button
          variant="ghost"
          size="md"
          aria-label="Next page"
          disabled={page >= safePageCount - 1}
          onClick={() => goToPage(page + 1)}
          leadingIcon={<IconChevronDown size={20} className="-rotate-90" />}
        >
          <span className="sr-only">Next</span>
        </Button>
      </div>
    </div>
  )
}
