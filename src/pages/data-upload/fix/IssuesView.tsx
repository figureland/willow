import clsx from 'clsx'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Button,
  DataTable,
  type GridColDef,
  Modal,
} from '../../../components/ui'
import { IconArrowLeft } from '../../../components/ui/icons'
import { actionColumn, SelectionActionBar, statusColumn } from './fix-grid-bits'
import type { CroppingRecord, OperationRecord } from './fix-records'
import { useFixState } from './fix-state'
import {
  buildIssueGroups,
  type FixableRecord,
  type IssueGroup,
  projectRecord,
  type RecordType,
} from './issue-groups'
import { type EditableField, RecordEditorSheet } from './RecordEditorSheet'
import { RowStatusPip, StatusHaloBadge } from './RowStatusPip'
import {
  buildOperationFieldFields,
  CROPPING_FIELD_FIELDS,
} from './record-editor-schemas'
import type { IssueSeverity } from './row-issues'
import { SuggestionCard } from './SuggestionCard'

/* -------------------------------------------------------------------------- */
/* IssuesView — sidebar of issues + per-issue fix workflow                    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Sidebar — list of issues                                                    */
/* -------------------------------------------------------------------------- */

const IssueRow = ({
  group,
  isActive,
  resolved,
  href,
}: {
  group: IssueGroup
  isActive: boolean
  resolved: boolean
  href: string
}) => (
  <li>
    <Link
      to={href}
      className={clsx(
        'flex w-full items-center gap-3 border-b-2 border-border-tertiary px-4 py-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
        isActive
          ? 'bg-bg-tertiary text-text-primary'
          : 'bg-bg-primary text-text-primary hover:bg-bg-secondary',
      )}
    >
      <StatusHaloBadge status={resolved ? 'clean' : group.severity} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-md font-medium">{group.title}</span>
        <span className="truncate text-xs text-text-secondary">
          {resolved
            ? 'Resolved'
            : `${group.recordIds.length} ${
                group.recordIds.length === 1 ? 'record' : 'records'
              } · ${group.brokenFieldLabels.join(', ') || 'see rows'}`}
        </span>
      </div>
    </Link>
  </li>
)

/* -------------------------------------------------------------------------- */
/* IssueCardList — card-style list (cards layout)                              */
/* -------------------------------------------------------------------------- */

/**
 * Compact issue card — borrows the structure of the Refine step's issue
 * cards: a status indicator, a short headline + sub-line, and the whole
 * card is the click target. Renders as a `<Link>` so the destination URL
 * is visible on hover and middle-click / cmd-click work natively.
 */
const IssueCardItem = ({
  group,
  resolved,
  href,
}: {
  group: IssueGroup
  resolved: boolean
  href: string
}) => (
  <Link
    to={href}
    className={clsx(
      'group flex w-full items-start gap-3 rounded-xl border-2 border-transparent p-5 text-left shadow-sm transition-all duration-200',
      'hover:border-border-tertiary hover:shadow-md',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      resolved ? 'bg-support-bg-green/60' : 'bg-bg-primary',
    )}
  >
    <span className="mt-1 shrink-0">
      <RowStatusPip status={resolved ? 'clean' : group.severity} />
    </span>
    <div className="flex max-w-[640px] flex-1 flex-col gap-1">
      <p className="text-md font-medium text-text-primary">{group.title}</p>
      <p className="text-sm text-text-secondary">
        {resolved
          ? 'Resolved'
          : `${group.recordIds.length} ${
              group.recordIds.length === 1 ? 'record' : 'records'
            } · ${group.brokenFieldLabels.join(', ') || 'see rows'}`}
      </p>
    </div>
  </Link>
)

const IssueCardList = ({
  groups,
  resolvedIds,
  hrefForIssue,
  hrefForSeverity,
  activeSeverity,
}: {
  groups: IssueGroup[]
  resolvedIds: Set<string>
  hrefForIssue: (issueId: string) => string
  hrefForSeverity: (severity: 'all' | 'blocking' | 'warning') => string
  activeSeverity: 'all' | 'blocking' | 'warning'
}) => {
  const unresolved = groups.filter((g) => !resolvedIds.has(g.id))
  const mustFix = unresolved.filter((g) => g.severity === 'blocking').length
  const worthALook = unresolved.filter((g) => g.severity === 'warning').length
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold text-text-primary">
          We've checked all your records.
        </h1>
        <p className="text-md text-text-secondary">
          We need to fix a few issues before we can proceed.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryTile
          stat={mustFix}
          label="Must fix"
          tone="blocking"
          href={hrefForSeverity('blocking')}
          active={activeSeverity === 'blocking'}
        />
        <SummaryTile
          stat={worthALook}
          label="Worth a look"
          tone="warning"
          href={hrefForSeverity('warning')}
          active={activeSeverity === 'warning'}
        />
      </div>
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <IssueCardItem
            key={group.id}
            group={group}
            resolved={resolvedIds.has(group.id)}
            href={hrefForIssue(group.id)}
          />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* SummaryTile — large stat + label, optional anchor for filtering              */
/* -------------------------------------------------------------------------- */

const TILE_TONE: Record<'blocking' | 'warning' | 'neutral', string> = {
  // Solid strong fills with inverse text — the whole tile reads as a CTA.
  blocking: 'bg-support-fg-red text-text-primary-inverse',
  warning: 'bg-support-fg-amber text-text-primary-inverse',
  neutral: 'bg-text-primary text-text-primary-inverse',
}

const SummaryTile = ({
  stat,
  label,
  tone,
  href,
  active,
}: {
  stat: number | string
  label: string
  tone: 'blocking' | 'warning' | 'neutral'
  href?: string
  active?: boolean
}) => {
  const base = clsx(
    'flex flex-col gap-1 rounded-xl px-4 py-3 transition-all',
    TILE_TONE[tone],
    href &&
      'hover:shadow-md hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
    active && 'ring-2 ring-text-primary/30',
  )
  const body = (
    <>
      <span className="text-3xl font-semibold leading-none tabular-nums text-current">
        {stat}
      </span>
      <span className="text-sm font-medium text-current/90">{label}</span>
    </>
  )
  if (!href) {
    return <div className={base}>{body}</div>
  }
  return (
    <Link to={href} className={base}>
      {body}
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const fmt = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
  return v
}

const PREVIEW_COLUMNS_CROPPING: { key: string; label: string }[] = [
  { key: 'farmName', label: 'Farm' },
  { key: 'fieldName', label: 'Field' },
  { key: 'harvestYear', label: 'Year' },
  { key: 'cropName', label: 'Crop' },
  { key: 'workingArea', label: 'Area (ha)' },
  { key: 'yield', label: 'Yield (t/ha)' },
]

const PREVIEW_COLUMNS_OPERATION: { key: string; label: string }[] = [
  { key: 'farmName', label: 'Farm' },
  { key: 'fieldName', label: 'Field' },
  { key: 'harvestYear', label: 'Year' },
  { key: 'operationGroup', label: 'Group' },
  { key: 'operationType', label: 'Type' },
  { key: 'productName', label: 'Product' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit', label: 'Unit' },
]

const previewColumnsFor = (
  type: RecordType,
  brokenFieldKeys: string[],
  labels: string[],
): { key: string; label: string }[] => {
  const base =
    type === 'cropping' ? PREVIEW_COLUMNS_CROPPING : PREVIEW_COLUMNS_OPERATION
  const merged = [...base]
  brokenFieldKeys.forEach((key, i) => {
    if (!merged.some((c) => c.key === key)) {
      merged.push({ key, label: labels[i] ?? key })
    }
  })
  return merged
}

const NUMBER_KEYS = new Set([
  'workingArea',
  'yield',
  'totalYield',
  'quantity',
  'appliedArea',
  'harvestYear',
])

const coerceForKey = (key: string, raw: string): string | number => {
  if (NUMBER_KEYS.has(key)) {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  return raw
}

const labelFromColumns = (
  columns: { key: string; label: string }[],
  key: string,
): string => columns.find((c) => c.key === key)?.label ?? key

const buildPreviewColumns = (
  columns: { key: string; label: string }[],
  brokenKeys: string[],
  severity: IssueSeverity,
  resolvedIds: Set<string>,
  edited: Set<string>,
  removed: Set<string>,
  onPipClick: (rowId: string) => void,
): GridColDef<FixableRecord>[] => {
  const broken = new Set(brokenKeys)
  return [
    // Shared status + action chrome — same as the Data Table view, so the
    // user sees the same row presentation whichever entry point they used.
    statusColumn<FixableRecord>(
      removed,
      (id) => resolvedIds.has(id),
      onPipClick,
    ),
    actionColumn<FixableRecord>(edited, removed),
    ...columns.map<GridColDef<FixableRecord>>((col) => ({
      field: col.key,
      headerName: col.label,
      flex: 1,
      minWidth: 110,
      sortable: false,
      filterable: false,
      cellClassName: ({ row }) => {
        if (!broken.has(col.key)) return ''
        if (resolvedIds.has(row.id)) return 'cell-issue-clean'
        return severity === 'blocking'
          ? 'cell-issue-blocking'
          : 'cell-issue-warning'
      },
      renderCell: ({ row }) => (
        <span
          className={
            col.key === 'harvestYear' || NUMBER_KEYS.has(col.key)
              ? 'tabular-nums'
              : undefined
          }
        >
          {fmt(row.display[col.key])}
        </span>
      ),
    })),
  ]
}

/* -------------------------------------------------------------------------- */
/* SuggestionCard — solid white card for the two top-of-pane suggestions       */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* IssuePanel — the right pane for an active issue                            */
/* -------------------------------------------------------------------------- */

const IssuePanel = ({
  group,
  recordIndex,
  onApply,
  onResolved,
  wasResolved,
  editedIds,
  removedIds,
  onManualEdit,
  onManualDelete,
  onApplyValueForIssue,
  headerSlot,
  resolvedFooterSlot,
}: {
  group: IssueGroup
  recordIndex: Map<string, FixableRecord>
  onApply: (recordIds: string[], patch: Record<string, unknown>) => void
  onResolved: (issueId: string) => void
  wasResolved: boolean
  /** Edited/removed ids for the active record type — drives the action pill. */
  editedIds: Set<string>
  removedIds: Set<string>
  /** Triggered from the bottom action bar — opens the record editor sheet. */
  onManualEdit: (recordIds: string[]) => void
  /** Triggered from the bottom action bar — marks rows for removal. */
  onManualDelete: (recordIds: string[]) => void
  /**
   * Triggered from the "Apply a new value" suggestion — opens the same
   * editor sheet the data table uses, but scoped to just the broken fields
   * for this issue. The parent decides which records the patch lands on.
   */
  onApplyValueForIssue: (recordIds: string[], brokenKeys: string[]) => void
  /** Optional element rendered above the issue title — e.g. a back link. */
  headerSlot?: ReactNode
  /** Optional element rendered alongside the resolved banner — e.g. Next CTA. */
  resolvedFooterSlot?: ReactNode
}) => {
  // Snapshot the initial record ids so the preview grid keeps showing the
  // same rows after they're patched — otherwise they'd vanish from the issue
  // and the user wouldn't see the change land. Resolved ids stay highlighted
  // so the change is visible until the user navigates away.
  const [recordIds, setRecordIds] = useState<string[]>(group.recordIds)
  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() =>
    wasResolved ? new Set(group.recordIds) : new Set(),
  )

  // Reset transient state whenever the active issue changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: snapshot only on issue switch
  useEffect(() => {
    setRecordIds(group.recordIds)
    setSelection(new Set())
    setBusy(false)
    setResolvedIds(wasResolved ? new Set(group.recordIds) : new Set())
  }, [group.id])

  // Re-read live values so the patch shows up in the table.
  const rows = useMemo(
    () =>
      recordIds
        .map((id) => recordIndex.get(id))
        .filter((r): r is FixableRecord => r !== undefined),
    [recordIds, recordIndex],
  )

  const unresolvedRows = rows.filter((r) => !resolvedIds.has(r.id))

  const columns = previewColumnsFor(
    group.recordType,
    group.brokenFieldKeys,
    group.brokenFieldLabels,
  )

  // One apply resolves the whole issue. Selection is still surfaced as
  // contextual information but it doesn't scope the patch — the suggestion
  // disappears straight after, so partial fixes wouldn't be reachable.
  const applyPatch = (patch: Record<string, unknown>) => {
    const ids = unresolvedRows.map((r) => r.id)
    if (ids.length === 0 || Object.keys(patch).length === 0) return
    setBusy(true)
    // Brief "validation" pause — fade + spinner, then commit + reveal.
    window.setTimeout(() => {
      onApply(ids, patch)
      setResolvedIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.add(id)
        return next
      })
      setSelection(new Set())
      setBusy(false)
      onResolved(group.id)
    }, 700)
  }

  const sandyPatch = useMemo<Record<string, unknown>>(() => {
    const patch: Record<string, unknown> = {}
    for (const key of group.brokenFieldKeys) {
      const raw = group.sandySuggestion[key]
      if (raw === undefined) continue
      patch[key] = coerceForKey(key, raw)
    }
    return patch
  }, [group])

  const acceptSandy = () => applyPatch(sandyPatch)

  // "Set a new value" hands off to the data table's editor sheet — same UI,
  // but scoped to just the broken fields for this issue. Selecting the rows
  // first means the user can see exactly which records will be affected
  // before they confirm the change.
  const openValueEditor = () => {
    const ids = unresolvedRows.map((r) => r.id)
    if (ids.length === 0) return
    setSelection(new Set(ids))
    onApplyValueForIssue(ids, group.brokenFieldKeys)
  }

  const sandySummary = group.brokenFieldKeys
    .map((k) => {
      const v = group.sandySuggestion[k]
      return v ? `${labelFromColumns(columns, k)}: ${v}` : null
    })
    .filter((s): s is string => s !== null)
    .join(' · ')

  const targetCount =
    selection.size > 0 ? selection.size : unresolvedRows.length

  // One-line description of the change Sandy would make, e.g.
  //   "Update 4 records · Unit to L/ha"
  const sandyChangeLine = group.brokenFieldKeys
    .map((k) => {
      const v = group.sandySuggestion[k]
      return v ? `${labelFromColumns(columns, k)} to ${v}` : null
    })
    .filter((s): s is string => s !== null)
    .join(', ')

  const allResolved = resolvedIds.size > 0 && unresolvedRows.length === 0

  return (
    <div className="flex flex-col gap-6">
      {headerSlot ? <div>{headerSlot}</div> : null}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-text-primary">
          {group.title}
        </h1>
      </header>

      {/* Suggestions disappear once the user applies any fix — the resolved
       *  banner takes their place so the pane stays calm afterwards. */}
      {allResolved ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-support-bg-green px-4 py-3">
          <span className="inline-flex items-center gap-2 text-lg font-semibold text-text-brand-dark">
            <RowStatusPip status="clean" />
            Issue resolved · {resolvedIds.size}{' '}
            {resolvedIds.size === 1 ? 'record' : 'records'} fixed
          </span>
          {resolvedFooterSlot ? <div>{resolvedFooterSlot}</div> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            How to fix
          </h2>
          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
            {Object.keys(group.sandySuggestion).length > 0 ? (
              <SuggestionCard
                tone="smart"
                headline={
                  sandyChangeLine
                    ? `Update ${targetCount} ${targetCount === 1 ? 'record' : 'records'} ${sandyChangeLine}`
                    : `Update ${targetCount} ${targetCount === 1 ? 'record' : 'records'}`
                }
                description={`Based on the other records in this sheet, we'd set ${sandySummary || '—'}.`}
                cta={
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={acceptSandy}
                  >
                    Apply suggestion
                  </Button>
                }
              />
            ) : null}
            <SuggestionCard
              tone="neutral"
              headline={`Set ${group.brokenFieldLabels.join(', ') || 'a value'} yourself`}
              description="Open the record editor to pick a value across every record below."
              cta={
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={openValueEditor}
                >
                  Open editor
                </Button>
              }
            />
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {rows.length} affected {rows.length === 1 ? 'record' : 'records'}
      </h2>

      {/* Records grid — mirrors the Data Table view exactly. */}
      <div
        className={clsx(
          'relative transition-opacity duration-200',
          busy && 'opacity-40',
        )}
      >
        <DataTable<FixableRecord>
          rows={rows}
          columns={buildPreviewColumns(
            columns,
            group.brokenFieldKeys,
            group.severity,
            resolvedIds,
            editedIds,
            removedIds,
            (rowId) => onManualEdit([rowId]),
          )}
          // Once the issue is resolved the rows aren't selectable any more —
          // the suggestions are gone and the resolved banner says enough.
          selectable={!allResolved}
          hideFooter
          isRowSelectable={({ row }) =>
            !resolvedIds.has(row.id) && !removedIds.has(row.id)
          }
          rowSelectionModel={{ type: 'include', ids: selection }}
          onRowSelectionModelChange={(model) => {
            setSelection(new Set(Array.from(model.ids).map(String)))
          }}
        />
        {busy ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span
              role="status"
              aria-label="Validating"
              className="inline-block size-7 animate-spin rounded-full border-2 border-border-secondary border-t-sandy-600"
            />
          </div>
        ) : null}
      </div>

      {selection.size > 0 ? (
        <SelectionActionBar
          count={selection.size}
          recordLabel={
            group.recordType === 'cropping' ? 'cropping record' : 'operation'
          }
          onEdit={() => onManualEdit(Array.from(selection))}
          onDelete={() => onManualDelete(Array.from(selection))}
          onClear={() => setSelection(new Set())}
        />
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* IssuesView                                                                  */
/* -------------------------------------------------------------------------- */

export const IssuesView = () => {
  const {
    croppingRecords,
    operationRecords,
    editedCroppingIds,
    editedOperationIds,
    removedCroppingIds,
    removedOperationIds,
    patchCropping,
    patchOperations,
    removeCropping,
    removeOperations,
  } = useFixState()

  const groups = useMemo(
    () =>
      buildIssueGroups(croppingRecords, operationRecords, {
        editedCroppingIds,
        editedOperationIds,
        removedCroppingIds,
        removedOperationIds,
      }),
    [
      croppingRecords,
      operationRecords,
      editedCroppingIds,
      editedOperationIds,
      removedCroppingIds,
      removedOperationIds,
    ],
  )

  // Active issue lives in the URL so back/forward + refresh keep the user
  // on the same issue.
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const activeId = searchParams.get('issue')
  const rawSeverity = searchParams.get('severity')
  const activeSeverity: 'all' | 'blocking' | 'warning' =
    rawSeverity === 'blocking' || rawSeverity === 'warning'
      ? rawSeverity
      : 'all'

  /** Build a path that swaps the `issue` URL param, preserving other params. */
  const hrefForIssue = (id: string): string => {
    const params = new URLSearchParams(searchParams)
    params.set('issue', id)
    return `${location.pathname}?${params.toString()}`
  }
  /** Build a path that swaps the `severity` URL param. */
  const hrefForSeverity = (
    severity: 'all' | 'blocking' | 'warning',
  ): string => {
    const params = new URLSearchParams(searchParams)
    if (severity === 'all') params.delete('severity')
    else params.set('severity', severity)
    const qs = params.toString()
    return qs ? `${location.pathname}?${qs}` : location.pathname
  }

  const setActiveId = (id: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('issue', id)
    setSearchParams(params, { replace: true })
  }

  // Layout style — defaults to the card-list view. Opt into the legacy
  // sidebar variant via `?issueLayout=sidebar` for the cases where the
  // narrower master/detail layout reads better.
  const layout =
    searchParams.get('issueLayout') === 'sidebar' ? 'sidebar' : 'cards'
  // Track which issues the user has resolved during this visit so the
  // sidebar can keep them visible with a green pip even though
  // `buildIssueGroups` drops them once their records are edited.
  const [resolvedIssueIds, setResolvedIssueIds] = useState<Set<string>>(
    () => new Set(),
  )
  // Snapshot of resolved groups so the sidebar can render them after the
  // underlying data has changed and they've vanished from `groups`.
  const [resolvedSnapshots, setResolvedSnapshots] = useState<
    Map<string, IssueGroup>
  >(() => new Map())

  // Merge live (unresolved) groups with the snapshots of any the user has
  // already resolved. Resolved ones render at the bottom of the list.
  const sidebarGroups = useMemo<IssueGroup[]>(() => {
    const liveIds = new Set(groups.map((g) => g.id))
    const tail: IssueGroup[] = []
    for (const [id, snapshot] of resolvedSnapshots) {
      if (!liveIds.has(id)) tail.push(snapshot)
    }
    return [...groups, ...tail]
  }, [groups, resolvedSnapshots])

  // Sidebar mode falls back to the first issue when nothing's selected.
  // Cards mode requires an explicit URL id — no active issue means we show
  // the card list instead.
  const explicitActive = sidebarGroups.find((g) => g.id === activeId) ?? null
  const activeGroup =
    layout === 'cards'
      ? explicitActive
      : (explicitActive ?? sidebarGroups[0] ?? null)

  // Find the next unresolved issue after the active one — drives the
  // "Next issue" CTA on the resolved banner in cards mode.
  const nextIssue =
    activeGroup &&
    sidebarGroups.find(
      (g) => g.id !== activeGroup.id && !resolvedIssueIds.has(g.id),
    )

  const recordIndex = useMemo(() => {
    const map = new Map<string, FixableRecord>()
    for (const r of croppingRecords) map.set(r.id, projectRecord(r, 'cropping'))
    for (const r of operationRecords)
      map.set(r.id, projectRecord(r, 'operation'))
    return map
  }, [croppingRecords, operationRecords])

  const onApply = (
    type: RecordType,
    recordIds: string[],
    patch: Record<string, unknown>,
  ) => {
    // Issue-level fixes (Sandy + Apply value) auto-save — they don't need
    // the user to confirm again via the top-bar Save button.
    if (type === 'cropping') {
      patchCropping(recordIds, patch as Partial<CroppingRecord>, {
        autoSave: true,
      })
    } else {
      patchOperations(recordIds, patch as Partial<OperationRecord>, {
        autoSave: true,
      })
    }
  }

  const onResolved = (issueId: string) => {
    setResolvedIssueIds((prev) => {
      const next = new Set(prev)
      next.add(issueId)
      return next
    })
    // Snapshot the group so we can keep showing it in the sidebar even after
    // the underlying records leave the live issue pool.
    const live = groups.find((g) => g.id === issueId)
    if (live) {
      setResolvedSnapshots((prev) => {
        if (prev.has(issueId)) return prev
        const next = new Map(prev)
        next.set(issueId, live)
        return next
      })
    }
  }

  // Manual edit + delete state, scoped to the active issue. The bottom
  // action bar drives both — same flow as the Data Table view.
  const [editorIds, setEditorIds] = useState<string[] | null>(null)
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null)
  // When the user clicks "Apply a new value", restrict the editor to just
  // the issue's broken fields. Null means "show the full schema".
  const [editorFieldKeys, setEditorFieldKeys] = useState<string[] | null>(null)

  const activeEditedIds =
    activeGroup?.recordType === 'cropping'
      ? editedCroppingIds
      : editedOperationIds
  const activeRemovedIds =
    activeGroup?.recordType === 'cropping'
      ? removedCroppingIds
      : removedOperationIds

  const onManualEdit = (ids: string[]) => {
    setEditorFieldKeys(null) // full schema for general edits
    setEditorIds(ids)
  }
  const onManualDelete = (ids: string[]) => setDeleteIds(ids)
  const onApplyValueForIssue = (ids: string[], brokenKeys: string[]) => {
    // Scope to broken fields so the editor only shows what the issue needs
    // fixed. Farm/Field/etc. stay in the original records — the user just
    // doesn't see them in the editor.
    setEditorFieldKeys(brokenKeys)
    setEditorIds(ids)
  }

  // Filter the editor's field schema by `editorFieldKeys` when scoped (e.g.
  // launched from "Apply a new value"). Each scoped key matches a text /
  // select field's `rowKey`; the composite Farm/Field is never targeted, so
  // it's safely excluded by the rowKey-based filter.
  const filterFields = <Row,>(
    schema: EditableField<Row>[],
  ): EditableField<Row>[] => {
    if (!editorFieldKeys) return schema
    const wanted = new Set(editorFieldKeys)
    return schema.filter((f) => {
      // Composite + farm-field rows don't have a single rowKey, so they
      // never match the broken-key filter — drop them in scoped mode.
      if (f.kind === 'composite' || f.kind === 'farm-field') return false
      return wanted.has(f.rowKey)
    })
  }

  const editorRecords = useMemo(() => {
    if (!editorIds || !activeGroup) return []
    if (activeGroup.recordType === 'cropping') {
      return croppingRecords.filter((r) => editorIds.includes(r.id))
    }
    return operationRecords.filter((r) => editorIds.includes(r.id))
  }, [editorIds, activeGroup, croppingRecords, operationRecords])

  const applyManualPatch = (patch: Record<string, unknown>) => {
    if (!editorIds || !activeGroup) return
    if (activeGroup.recordType === 'cropping') {
      patchCropping(editorIds, patch as Partial<CroppingRecord>)
    } else {
      patchOperations(editorIds, patch as Partial<OperationRecord>)
    }
    setEditorIds(null)
    setEditorFieldKeys(null)
  }

  const confirmDelete = () => {
    if (!deleteIds || !activeGroup) return
    if (activeGroup.recordType === 'cropping') {
      removeCropping(deleteIds)
    } else {
      removeOperations(deleteIds)
    }
    setDeleteIds(null)
  }

  if (sidebarGroups.length === 0) {
    return <AllResolvedState />
  }

  const panel = activeGroup ? (
    <IssuePanel
      key={activeGroup.id}
      group={activeGroup}
      recordIndex={recordIndex}
      onApply={(ids, patch) => onApply(activeGroup.recordType, ids, patch)}
      onResolved={onResolved}
      wasResolved={resolvedIssueIds.has(activeGroup.id)}
      editedIds={activeEditedIds}
      removedIds={activeRemovedIds}
      onManualEdit={onManualEdit}
      onManualDelete={onManualDelete}
      onApplyValueForIssue={onApplyValueForIssue}
      headerSlot={
        layout === 'cards' ? (
          <Link
            to={(() => {
              const params = new URLSearchParams(searchParams)
              params.delete('issue')
              const qs = params.toString()
              return qs ? `${location.pathname}?${qs}` : location.pathname
            })()}
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            <IconArrowLeft size={16} />
            Back to issues
          </Link>
        ) : null
      }
      resolvedFooterSlot={
        layout === 'cards' && nextIssue ? (
          <Button variant="primary" to={hrefForIssue(nextIssue.id)}>
            Next issue
          </Button>
        ) : null
      }
    />
  ) : null

  return (
    <div className="flex flex-1 min-h-0">
      {layout === 'sidebar' ? (
        <>
          <aside className="flex w-[30%] min-w-[280px] max-w-[420px] flex-col border-r-2 border-border-tertiary bg-bg-primary">
            <div className="border-b-2 border-border-tertiary px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                Issues ({sidebarGroups.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ul className="flex flex-col">
                {sidebarGroups.map((group) => (
                  <IssueRow
                    key={group.id}
                    group={group}
                    isActive={activeGroup?.id === group.id}
                    resolved={resolvedIssueIds.has(group.id)}
                    href={hrefForIssue(group.id)}
                  />
                ))}
              </ul>
            </div>
          </aside>
          <section className="flex-1 overflow-y-auto px-8 py-8 pb-24">
            {panel ?? (
              <p className="text-md text-text-secondary">
                Select an issue from the list.
              </p>
            )}
          </section>
        </>
      ) : (
        <section className="flex-1 overflow-y-auto px-8 py-8 pb-24">
          {activeGroup ? (
            <div className="mx-auto w-full max-w-[1100px]">{panel}</div>
          ) : (
            <IssueCardList
              groups={sidebarGroups}
              resolvedIds={resolvedIssueIds}
              hrefForIssue={hrefForIssue}
              hrefForSeverity={hrefForSeverity}
              activeSeverity={activeSeverity}
            />
          )}
        </section>
      )}

      {activeGroup?.recordType === 'cropping' && editorIds ? (
        <RecordEditorSheet<CroppingRecord>
          open
          onOpenChange={(next) => {
            if (!next) {
              setEditorIds(null)
              setEditorFieldKeys(null)
            }
          }}
          records={editorRecords as CroppingRecord[]}
          fields={filterFields(CROPPING_FIELD_FIELDS)}
          recordLabel="cropping record"
          onSave={applyManualPatch}
          getProvenance={(row) => row.provenance}
          compact={editorFieldKeys !== null}
        />
      ) : null}
      {activeGroup?.recordType === 'operation' && editorIds ? (
        <RecordEditorSheet<OperationRecord>
          open
          onOpenChange={(next) => {
            if (!next) {
              setEditorIds(null)
              setEditorFieldKeys(null)
            }
          }}
          records={editorRecords as OperationRecord[]}
          fields={filterFields(
            buildOperationFieldFields(editorRecords as OperationRecord[]),
          )}
          recordLabel="operation"
          onSave={applyManualPatch}
          getProvenance={(row) => row.provenance}
          compact={editorFieldKeys !== null}
        />
      ) : null}

      <Modal
        open={deleteIds !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteIds(null)
        }}
        title={`Delete ${deleteIds?.length ?? 0} ${
          (deleteIds?.length ?? 0) === 1 ? 'record' : 'records'
        }?`}
        description="The selected rows will be marked for removal. Save or discard from the bar above."
        maxWidth="440px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteIds(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete {deleteIds?.length ?? 0}{' '}
              {(deleteIds?.length ?? 0) === 1 ? 'record' : 'records'}
            </Button>
          </>
        }
      >
        <p className="text-md text-text-secondary">
          Deleted rows stay visible until you save — they appear with a
          strikethrough so you can review the change first.
        </p>
      </Modal>
    </div>
  )
}

const AllResolvedState = () => (
  <div className="mx-auto flex max-w-[480px] flex-col items-center gap-3 px-8 py-24 text-center">
    <span className="inline-flex size-12 items-center justify-center rounded-full bg-support-bg-green text-text-brand-dark">
      <RowStatusPip status="clean" />
    </span>
    <h2 className="text-xl font-semibold text-text-primary">
      No issues left to resolve
    </h2>
    <p className="text-md text-text-secondary">
      Save your changes to lock them in, or move on to the next step.
    </p>
  </div>
)
