import clsx from 'clsx'
import { useMemo, useState } from 'react'
import {
  Badge,
  DataTable,
  type GridColDef,
  IconSearch,
  TextInput,
} from '../../components/ui'
import {
  VALIDATION_ERRORS,
  VALIDATION_SCOPE_LABEL,
  VALIDATION_SEVERITY_LABEL,
  VALIDATION_TYPE_LABEL,
  type ValidationError,
  type ValidationSeverity,
  type ValidationType,
} from './validation-errors'

/* -------------------------------------------------------------------------- */
/* ValidationErrorsPage — standalone reference of every validation Sandy fires*/
/* -------------------------------------------------------------------------- */

const SEVERITY_TONE: Record<ValidationSeverity, 'red' | 'orange'> = {
  blocking: 'red',
  warning: 'orange',
}

const SeverityBadge = ({ severity }: { severity: ValidationSeverity }) => (
  <Badge tone={SEVERITY_TONE[severity]} size="sm">
    {VALIDATION_SEVERITY_LABEL[severity]}
  </Badge>
)

const TypeBadge = ({ type }: { type: ValidationType }) => (
  <Badge tone="neutral" size="sm">
    {VALIDATION_TYPE_LABEL[type]}
  </Badge>
)

/* -------------------------------------------------------------------------- */
/* Filter pill row                                                             */
/* -------------------------------------------------------------------------- */

const FilterPills = <T extends string>({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: T[]
  value: T | 'all'
  onChange: (next: T | 'all') => void
  labelFor: (option: T) => string
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <PillButton
      active={value === 'all'}
      onClick={() => onChange('all')}
      label="All"
    />
    {options.map((option) => (
      <PillButton
        key={option}
        active={value === option}
        onClick={() => onChange(option)}
        label={labelFor(option)}
      />
    ))}
  </div>
)

const PillButton = ({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'inline-flex items-center rounded-full border-2 px-3 py-1 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      active
        ? 'border-button-primary bg-button-primary text-text-primary-inverse'
        : 'border-border-tertiary bg-bg-primary text-text-secondary hover:bg-bg-secondary',
    )}
  >
    {label}
  </button>
)

/* -------------------------------------------------------------------------- */
/* Column model                                                                */
/* -------------------------------------------------------------------------- */

type Row = ValidationError & { id: string }

const COLUMNS: GridColDef<Row>[] = [
  {
    field: 'severity',
    headerName: 'Severity',
    width: 120,
    renderCell: ({ row }) => <SeverityBadge severity={row.severity} />,
    sortable: true,
  },
  {
    field: 'type',
    headerName: 'Validation type',
    width: 160,
    renderCell: ({ row }) => <TypeBadge type={row.type} />,
    sortable: true,
  },
  {
    field: 'scope',
    headerName: 'Scope',
    width: 130,
    valueFormatter: (value: ValidationError['scope']) =>
      VALIDATION_SCOPE_LABEL[value],
  },
  {
    field: 'code',
    headerName: 'Code',
    width: 240,
    renderCell: ({ row }) => (
      <code className="font-mono text-xs text-text-secondary">{row.code}</code>
    ),
  },
  {
    field: 'title',
    headerName: 'Title',
    flex: 1,
    minWidth: 200,
  },
  {
    field: 'uxCopy',
    headerName: 'UX copy',
    flex: 1.5,
    minWidth: 280,
    renderCell: ({ row }) => (
      <span className="block whitespace-normal text-sm leading-snug text-text-primary">
        {row.uxCopy}
      </span>
    ),
  },
  {
    field: 'messageTemplate',
    headerName: 'Message template',
    flex: 1,
    minWidth: 240,
    renderCell: ({ row }) => (
      <code className="block whitespace-normal font-mono text-xs text-text-secondary">
        {row.messageTemplate}
      </code>
    ),
  },
  {
    field: 'trigger',
    headerName: 'Trigger',
    flex: 1.2,
    minWidth: 240,
    renderCell: ({ row }) => (
      <span className="block whitespace-normal text-sm leading-snug text-text-secondary">
        {row.trigger}
      </span>
    ),
  },
  {
    field: 'actions',
    headerName: 'Suggested actions',
    flex: 1,
    minWidth: 220,
    sortable: false,
    renderCell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1">
        {row.actions.map((action) => (
          <Badge key={action.kind} tone="neutral" size="sm">
            {action.label}
          </Badge>
        ))}
      </div>
    ),
  },
]

const ALL_TYPES = Object.keys(VALIDATION_TYPE_LABEL) as ValidationType[]
const ALL_SEVERITIES = Object.keys(
  VALIDATION_SEVERITY_LABEL,
) as ValidationSeverity[]

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export const ValidationErrorsPage = () => {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ValidationType | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<
    ValidationSeverity | 'all'
  >('all')

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VALIDATION_ERRORS.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false
      if (severityFilter !== 'all' && e.severity !== severityFilter)
        return false
      if (!q) return true
      return (
        e.code.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.uxCopy.toLowerCase().includes(q) ||
        e.messageTemplate.toLowerCase().includes(q) ||
        e.trigger.toLowerCase().includes(q) ||
        (e.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      )
    }).map((e) => ({ ...e, id: e.code }))
  }, [query, typeFilter, severityFilter])

  return (
    <div className="min-h-screen bg-bg-secondary">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-8 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Reference
          </p>
          <h1 className="text-3xl font-semibold text-text-primary">
            Data-onboarding validation errors
          </h1>
          <p className="max-w-[820px] text-md text-text-secondary">
            Every validation Sandy fires during upload, normalised onto one
            envelope. Use this catalogue to wire new UI states, align server
            messages, or look up the suggested action for a given code.
          </p>
        </header>

        <section className="flex flex-col gap-3 rounded-xl bg-bg-primary p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full max-w-[360px]">
              <TextInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search code, title, copy, trigger…"
                leadingIcon={<IconSearch />}
                aria-label="Search validation errors"
              />
            </div>
            <p className="text-sm text-text-secondary">
              Showing {rows.length} of {VALIDATION_ERRORS.length} errors
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Validation type
            </span>
            <FilterPills
              options={ALL_TYPES}
              value={typeFilter}
              onChange={setTypeFilter}
              labelFor={(t) => VALIDATION_TYPE_LABEL[t]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Severity
            </span>
            <FilterPills
              options={ALL_SEVERITIES}
              value={severityFilter}
              onChange={setSeverityFilter}
              labelFor={(s) => VALIDATION_SEVERITY_LABEL[s]}
            />
          </div>
        </section>

        <DataTable
          rows={rows}
          columns={COLUMNS}
          selectable={false}
          defaultPageSize={rows.length || 1}
          pageSizeOptions={[rows.length || 1]}
          hideFooter
          getRowHeight={() => 'auto'}
        />
      </div>
    </div>
  )
}
