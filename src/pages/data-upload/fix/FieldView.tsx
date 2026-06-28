import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { DataTable, type GridColDef } from '../../../components/ui'
import { type FieldIssue, FieldIssueCard } from './FieldIssueCard'
import {
  type CroppingRecord,
  FIELD_SUMMARIES,
  type FieldStatus,
  type FieldSummary,
  type OperationRecord,
} from './fix-records'
import { ISSUE_DEFAULTS, type RowIssue, worstSeverity } from './row-issues'
import { rowMatchesSeverity, useSeverityFilter } from './use-severity-filter'

/* -------------------------------------------------------------------------- */
/* Status pill                                                                 */
/* -------------------------------------------------------------------------- */

const STATUS_LABEL: Record<FieldStatus, string> = {
  blocked: 'Blocked',
  warning: 'Warning',
  good: 'Good',
}

const STATUS_PILL: Record<FieldStatus, string> = {
  blocked: 'bg-support-bg-red text-support-fg-red',
  warning: 'bg-support-bg-amber text-support-fg-amber',
  good: 'bg-support-bg-green text-support-fg-green',
}

const StatusPill = ({ status }: { status: FieldStatus }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      STATUS_PILL[status],
    )}
  >
    {STATUS_LABEL[status]}
  </span>
)

const MissingCell = () => <span className="text-text-secondary">—</span>

/* -------------------------------------------------------------------------- */
/* Per-field grids — re-use the same DataTable but with narrower columns       */
/* -------------------------------------------------------------------------- */

const CROPPING_COLUMNS: GridColDef<CroppingRecord>[] = [
  {
    field: 'harvestYear',
    headerName: 'Year',
    type: 'number',
    flex: 0.4,
    minWidth: 80,
    renderCell: ({ row }) => (
      <span className="tabular-nums">{row.harvestYear}</span>
    ),
  },
  { field: 'cropName', headerName: 'Crop', flex: 1, minWidth: 140 },
  {
    field: 'cropVariety',
    headerName: 'Variety',
    flex: 0.9,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.cropVariety === null ? <MissingCell /> : row.cropVariety,
  },
  {
    field: 'workingArea',
    headerName: 'Area (ha)',
    type: 'number',
    flex: 0.6,
    minWidth: 100,
    renderCell: ({ row }) =>
      row.workingArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.workingArea.toFixed(1)}</span>
      ),
  },
  {
    field: 'yield',
    headerName: 'Yield',
    type: 'number',
    flex: 0.6,
    minWidth: 100,
    renderCell: ({ row }) =>
      row.yield === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.yield.toFixed(2)}</span>
      ),
  },
  {
    field: 'plantingDate',
    headerName: 'Planting',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.plantingDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.plantingDate}</span>
      ),
  },
  {
    field: 'harvestDate',
    headerName: 'Harvest',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.harvestDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.harvestDate}</span>
      ),
  },
]

const OPERATION_COLUMNS: GridColDef<OperationRecord>[] = [
  {
    field: 'operationGroup',
    headerName: 'Group',
    flex: 1,
    minWidth: 140,
  },
  {
    field: 'operationType',
    headerName: 'Type',
    flex: 1,
    minWidth: 140,
  },
  {
    field: 'operationDate',
    headerName: 'Date',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.operationDate === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.operationDate}</span>
      ),
  },
  {
    field: 'productName',
    headerName: 'Product',
    flex: 1.1,
    minWidth: 150,
    renderCell: ({ row }) =>
      row.productName === null ? <MissingCell /> : row.productName,
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    flex: 0.7,
    minWidth: 110,
    renderCell: ({ row }) =>
      row.quantity === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.quantity.toFixed(2)}</span>
      ),
  },
  {
    field: 'unit',
    headerName: 'Unit',
    flex: 0.5,
    minWidth: 80,
    renderCell: ({ row }) => (row.unit === null ? <MissingCell /> : row.unit),
  },
  {
    field: 'appliedArea',
    headerName: 'Applied (ha)',
    type: 'number',
    flex: 0.8,
    minWidth: 120,
    renderCell: ({ row }) =>
      row.appliedArea === null ? (
        <MissingCell />
      ) : (
        <span className="tabular-nums">{row.appliedArea.toFixed(1)}</span>
      ),
  },
]

const issueRowClass = (
  issues: { length: number },
  sev: ReturnType<typeof worstSeverity>,
) => {
  if (issues.length === 0) return ''
  if (sev === 'blocking') return 'row-issue-blocking'
  if (sev === 'warning') return 'row-issue-warning'
  return ''
}

/* -------------------------------------------------------------------------- */
/* Field-issue aggregation                                                     */
/* -------------------------------------------------------------------------- */

type IssueSource =
  | { kind: 'cropping'; record: CroppingRecord }
  | { kind: 'operation'; record: OperationRecord }

const describeCroppingSource = (r: CroppingRecord): string =>
  `Cropping · ${r.cropName} ${r.harvestYear}${
    r.cropVariety ? ` · ${r.cropVariety}` : ''
  }`

const describeOperationSource = (r: OperationRecord): string =>
  `Operation · ${r.operationGroup} · ${r.operationType} ${r.harvestYear}`

const headlineFor = (issue: RowIssue, source: IssueSource): string => {
  const label = ISSUE_DEFAULTS[issue.code].label
  if (issue.columnName) return `${issue.columnName} — ${label.toLowerCase()}`
  if (source.kind === 'cropping' && issue.code === 'duplicate-cropping')
    return `Duplicate cropping record on ${source.record.cropName} ${source.record.harvestYear}`
  if (source.kind === 'operation' && issue.code === 'duplicate-operation')
    return `Duplicate ${source.record.operationType.toLowerCase()} operation`
  return label
}

const buildFieldIssues = (field: FieldSummary): FieldIssue[] => {
  const out: FieldIssue[] = []
  for (const record of field.croppingRecords) {
    for (const [idx, issue] of record.issues.entries()) {
      out.push({
        id: `${record.id}-${idx}`,
        severity: issue.severity,
        headline: headlineFor(issue, { kind: 'cropping', record }),
        context: describeCroppingSource(record),
      })
    }
  }
  for (const record of field.operationRecords) {
    for (const [idx, issue] of record.issues.entries()) {
      out.push({
        id: `${record.id}-${idx}`,
        severity: issue.severity,
        headline: headlineFor(issue, { kind: 'operation', record }),
        context: describeOperationSource(record),
      })
    }
  }
  const rank: Record<RowIssue['severity'], number> = { blocking: 0, warning: 1 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 1)
}

const FieldIssuesSection = ({ field }: { field: FieldSummary }) => {
  const issues = useMemo(() => buildFieldIssues(field), [field])
  const [activeId, setActiveId] = useState<string | null>(issues[0]?.id ?? null)

  if (issues.length === 0) return null

  // Reset active id when the field switches and the previous id is gone.
  const activeExists = issues.some((i) => i.id === activeId)
  const effectiveActiveId = activeExists ? activeId : (issues[0]?.id ?? null)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-lg font-medium text-text-primary">
          Issues ({issues.length})
        </h4>
      </div>
      <div className="flex flex-col gap-3">
        {issues.map((issue) => (
          <FieldIssueCard
            key={issue.id}
            issue={issue}
            isActive={effectiveActiveId === issue.id}
            onFocus={() => setActiveId(issue.id)}
          />
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Right-hand details pane                                                     */
/* -------------------------------------------------------------------------- */

const FieldDetails = ({ field }: { field: FieldSummary }) => {
  return (
    <div className="flex flex-col gap-6">
      <FieldIssuesSection field={field} />

      {field.croppingRecords.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-lg font-medium text-text-primary">
              Cropping ({field.croppingRecords.length})
            </h4>
            {field.croppingIssueCount > 0 ? (
              <p className="text-sm text-text-secondary">
                {field.croppingIssueCount}{' '}
                {field.croppingIssueCount === 1 ? 'issue' : 'issues'} found
              </p>
            ) : null}
          </div>
          <DataTable<CroppingRecord>
            rows={field.croppingRecords}
            columns={CROPPING_COLUMNS}
            selectable={false}
            hideFooter
            getRowClassName={({ row }) =>
              issueRowClass(row.issues, worstSeverity(row.issues))
            }
          />
        </section>
      ) : null}

      {field.operationRecords.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-lg font-medium text-text-primary">
              Operations ({field.operationRecords.length})
            </h4>
            {field.operationIssueCount > 0 ? (
              <p className="text-sm text-text-secondary">
                {field.operationIssueCount}{' '}
                {field.operationIssueCount === 1 ? 'issue' : 'issues'} found
              </p>
            ) : null}
          </div>
          <DataTable<OperationRecord>
            rows={field.operationRecords}
            columns={OPERATION_COLUMNS}
            selectable={false}
            hideFooter
            getRowClassName={({ row }) =>
              issueRowClass(row.issues, worstSeverity(row.issues))
            }
          />
        </section>
      ) : null}

      {field.croppingRecords.length === 0 &&
      field.operationRecords.length === 0 ? (
        <p className="text-md text-text-secondary">
          No records found for this field.
        </p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Left-hand field list                                                        */
/* -------------------------------------------------------------------------- */

const FieldList = ({
  fields,
  activeName,
  onSelect,
}: {
  fields: FieldSummary[]
  activeName: string | null
  onSelect: (name: string) => void
}) => (
  <ul className="flex flex-col">
    {fields.map((field) => {
      const isActive = field.name === activeName
      const issueCount = field.croppingIssueCount + field.operationIssueCount
      return (
        <li key={field.name}>
          <button
            type="button"
            onClick={() => onSelect(field.name)}
            className={clsx(
              'flex w-full items-center justify-between gap-3 border-b-2 border-border-tertiary px-4 py-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
              isActive
                ? 'bg-bg-tertiary text-text-primary'
                : 'bg-bg-primary text-text-primary hover:bg-bg-secondary',
            )}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-md font-medium">{field.name}</span>
              <span className="truncate text-xs text-text-secondary">
                {field.farmName} ·{' '}
                {issueCount === 0
                  ? 'No issues'
                  : `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`}
              </span>
            </div>
            <StatusPill status={field.status} />
          </button>
        </li>
      )
    })}
  </ul>
)

/* -------------------------------------------------------------------------- */
/* FieldView                                                                   */
/* -------------------------------------------------------------------------- */

const countIssuesInRows = (rows: { issues: RowIssue[] }[]): number =>
  rows.reduce((sum, r) => sum + r.issues.length, 0)

/**
 * Apply the severity filter to a field: keep only records whose worst issue
 * matches, then recompute issue counts so headers + sidebar reflect what the
 * user is actually looking at. Returns null if nothing in the field matches.
 */
const filterField = (
  field: FieldSummary,
  filter: ReturnType<typeof useSeverityFilter>,
): FieldSummary | null => {
  if (filter === 'all') return field
  const croppingRecords = field.croppingRecords.filter((r) =>
    rowMatchesSeverity(r.issues, filter),
  )
  const operationRecords = field.operationRecords.filter((r) =>
    rowMatchesSeverity(r.issues, filter),
  )
  if (croppingRecords.length === 0 && operationRecords.length === 0) return null
  return {
    ...field,
    croppingRecords,
    operationRecords,
    croppingIssueCount: countIssuesInRows(croppingRecords),
    operationIssueCount: countIssuesInRows(operationRecords),
  }
}

export const FieldView = () => {
  const filter = useSeverityFilter()
  const fields = useMemo(() => {
    const out: FieldSummary[] = []
    for (const f of FIELD_SUMMARIES) {
      const filtered = filterField(f, filter)
      if (filtered) out.push(filtered)
    }
    return out
  }, [filter])

  const [activeName, setActiveName] = useState<string | null>(
    FIELD_SUMMARIES[0]?.name ?? null,
  )
  const activeField =
    fields.find((f) => f.name === activeName) ?? fields[0] ?? null

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="flex w-[30%] min-w-[260px] max-w-[420px] flex-col border-r-2 border-border-tertiary bg-bg-primary">
        <div className="flex-1 overflow-y-auto">
          <FieldList
            fields={fields}
            activeName={activeField?.name ?? null}
            onSelect={setActiveName}
          />
        </div>
      </aside>
      <section className="flex-1 overflow-y-auto px-8 py-8">
        {activeField ? (
          <FieldDetails field={activeField} />
        ) : (
          <p className="text-md text-text-secondary">
            No fields match the current filter.
          </p>
        )}
      </section>
    </div>
  )
}
