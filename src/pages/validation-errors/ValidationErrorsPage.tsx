import clsx from 'clsx'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge, SegmentedControl } from '../../components/ui'
import {
  areaOf,
  DATA_CATEGORY_LABEL,
  REFINEMENT_TASK_LABEL,
  VALIDATION_AREA_LABEL,
  VALIDATION_AREA_ORDER,
  VALIDATION_BY_CODE,
  VALIDATION_ERRORS,
  VALIDATION_SEVERITY_LABEL,
  VALIDATION_TYPE_LABEL,
  type ValidationArea,
  type ValidationError,
  type ValidationSeverity,
} from './validation-errors'
import { KanbanView } from './views/KanbanView'

/* -------------------------------------------------------------------------- */
/* ValidationPage — categories rail + sidebar list + detail panel             */
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

/* -------------------------------------------------------------------------- */
/* Categories rail (far left)                                                  */
/* -------------------------------------------------------------------------- */

const CategoriesRail = ({
  areas,
  active,
  countByArea,
  onSelect,
}: {
  areas: ValidationArea[]
  active: ValidationArea
  countByArea: Record<ValidationArea, number>
  onSelect: (next: ValidationArea) => void
}) => (
  <nav
    aria-label="Validation categories"
    className="flex w-[200px] shrink-0 flex-col border-r-2 border-border-tertiary bg-bg-primary"
  >
    <ol className="flex flex-col gap-0.5 p-2">
      {areas.map((area) => {
        const count = countByArea[area]
        const isActive = area === active
        return (
          <li key={area}>
            <button
              type="button"
              onClick={() => onSelect(area)}
              aria-current={isActive ? 'true' : undefined}
              className={clsx(
                'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-md transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
                isActive
                  ? 'bg-sandy-100 font-medium text-text-brand-dark'
                  : 'text-text-primary hover:bg-bg-tertiary',
              )}
            >
              <span>{VALIDATION_AREA_LABEL[area]}</span>
              <span
                className={clsx(
                  'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                  isActive
                    ? 'bg-bg-primary text-text-brand-dark'
                    : 'bg-bg-tertiary text-text-secondary',
                )}
              >
                {count}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  </nav>
)

/* -------------------------------------------------------------------------- */
/* Sidebar list item                                                           */
/* -------------------------------------------------------------------------- */

type SidebarItemProps = {
  error: ValidationError
  active: boolean
  onSelect: () => void
}

const SidebarItem = ({ error, active, onSelect }: SidebarItemProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={active ? 'true' : undefined}
    className={clsx(
      'flex w-full flex-col items-start gap-1.5 rounded-lg border-2 px-3 py-3 text-left transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      active
        ? 'border-border-primary bg-bg-tertiary'
        : 'border-transparent bg-bg-primary hover:border-border-tertiary hover:bg-bg-secondary',
    )}
  >
    <span className="text-md font-medium leading-snug text-text-primary">
      {error.title}
    </span>
    <SeverityBadge severity={error.severity} />
  </button>
)

/* -------------------------------------------------------------------------- */
/* Detail panel                                                                */
/* -------------------------------------------------------------------------- */

const DetailRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {label}
    </span>
    {children}
  </div>
)

const DetailPanel = ({ error }: { error: ValidationError }) => {
  const isRefinement = error.area === 'refinement'
  const metaRows: Array<{ label: string; value: ReactNode }> = [
    { label: 'Severity', value: <SeverityBadge severity={error.severity} /> },
    { label: 'Type', value: VALIDATION_TYPE_LABEL[error.type] },
  ]
  if (error.dataCategories && error.dataCategories.length > 0) {
    metaRows.push({
      label:
        error.dataCategories.length === 1 ? 'Data category' : 'Data categories',
      value: error.dataCategories.map((c) => DATA_CATEGORY_LABEL[c]).join(', '),
    })
  }
  if (error.refinementTask) {
    metaRows.push({
      label: 'Refinement task',
      value: REFINEMENT_TASK_LABEL[error.refinementTask],
    })
  }
  metaRows.push({
    label: 'Code',
    value: (
      <code className="font-mono text-xs text-text-primary">{error.code}</code>
    ),
  })
  return (
    <article className="flex flex-col gap-6 rounded-xl bg-bg-primary p-6 shadow-sm">
      <header className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary">
          {error.title}
        </h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {metaRows.map((row, idx) => (
              <tr
                key={row.label}
                className={clsx(
                  'align-middle',
                  idx > 0 && 'border-t border-border-tertiary',
                )}
              >
                <th
                  scope="row"
                  className="w-[160px] py-2 pr-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-text-secondary"
                >
                  {row.label}
                </th>
                <td className="py-2 align-middle text-md text-text-primary">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </header>

      <DetailRow label="Description">
        <p className="text-md leading-relaxed text-text-primary">
          {error.uxCopy}
        </p>
      </DetailRow>

      {error.source ? (
        <DetailRow label="Source">
          <div className="flex flex-col gap-1 rounded-md border-2 border-border-tertiary bg-bg-secondary px-3 py-2.5 text-sm">
            <p className="leading-relaxed text-text-primary">
              <span className="text-text-secondary">Sheet </span>
              <code className="font-mono text-text-primary">
                {error.source.sheet}
              </code>
              <span className="text-text-secondary"> · column </span>
              <code className="font-mono text-text-primary">
                {error.source.column}
              </code>
            </p>
            {error.source.join ? (
              <p className="leading-relaxed text-text-secondary">
                Joined via{' '}
                <code className="font-mono text-text-primary">
                  {error.source.join.viaColumn}
                </code>
                {', returning '}
                <code className="font-mono text-text-primary">
                  {error.source.join.lookupSheet}.
                  {error.source.join.returnColumn}
                </code>
              </p>
            ) : null}
            {error.source.transform ? (
              <p className="leading-relaxed text-text-secondary">
                Transform: {error.source.transform}
              </p>
            ) : null}
          </div>
        </DetailRow>
      ) : null}

      {error.messageTemplate ? (
        <DetailRow label="Message template">
          <code className="block whitespace-pre-wrap rounded-md border-2 border-border-tertiary bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary">
            {error.messageTemplate}
          </code>
        </DetailRow>
      ) : null}

      <DetailRow label={isRefinement ? 'How Sandy reads it' : 'Trigger'}>
        <p className="text-md leading-relaxed text-text-secondary">
          {error.trigger}
        </p>
      </DetailRow>

      {error.example ? (
        <DetailRow label="Example">
          <p className="text-md leading-relaxed text-text-secondary">
            {error.example}
          </p>
        </DetailRow>
      ) : null}

      {error.properties && error.properties.length > 0 ? (
        <DetailRow
          label={
            error.refinementTask === 'value-mapping'
              ? 'Controlled-vocab properties'
              : 'Properties Sandy needs to find'
          }
        >
          <div className="overflow-hidden rounded-lg border-2 border-border-tertiary">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-bg-secondary text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Property</th>
                  <th className="w-[100px] px-3 py-2 text-left">Required</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {error.properties.map((p, idx) => (
                  <tr
                    key={p.property}
                    className={clsx(
                      'align-middle',
                      idx > 0 && 'border-t border-border-tertiary',
                    )}
                  >
                    <td className="px-3 py-2 text-md font-medium text-text-primary">
                      {p.label}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {p.required ? (
                        <Badge tone="red" size="sm">
                          Required
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm">
                          Optional
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-text-secondary">
                      {p.note ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailRow>
      ) : null}

      <DetailRow label="Actions">
        <ol className="flex flex-col gap-2">
          {error.actions.map((path, idx) => (
            <li
              key={path.kind}
              className="flex flex-col gap-1 rounded-lg border-2 border-border-tertiary bg-bg-secondary px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-md font-medium text-text-primary">
                  {path.label}
                </span>
                {idx === 0 ? (
                  <Badge tone="green" size="sm">
                    Recommended
                  </Badge>
                ) : null}
                {!path.resolves ? (
                  <Badge tone="neutral" size="sm">
                    Informational
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm leading-snug text-text-secondary">
                {path.outcome}
              </p>
            </li>
          ))}
        </ol>
      </DetailRow>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* Refinement sidebar — flat, ordered by data category then step               */
/* -------------------------------------------------------------------------- */

const RefinementSidebar = ({
  entries,
  activeCode,
  onSelect,
}: {
  entries: ValidationError[]
  activeCode: string | null
  onSelect: (code: string) => void
}) => {
  // Sort by data category, then step. Categories appear in the order they
  // first surface in the entry list (matches the catalogue's declaration
  // order — Operations first, then Cropping, then anything else).
  const categoryFirstSeen = new Map<string, number>()
  for (let i = 0; i < entries.length; i++) {
    const cat = entries[i].dataCategories?.[0] ?? 'zz-unspecified'
    if (!categoryFirstSeen.has(cat)) categoryFirstSeen.set(cat, i)
  }
  const sorted = [...entries].sort((a, b) => {
    const ca = a.dataCategories?.[0] ?? 'zz-unspecified'
    const cb = b.dataCategories?.[0] ?? 'zz-unspecified'
    const da =
      (categoryFirstSeen.get(ca) ?? 0) - (categoryFirstSeen.get(cb) ?? 0)
    if (da !== 0) return da
    return (a.step ?? 0) - (b.step ?? 0)
  })
  return (
    <ol className="flex flex-col">
      {sorted.map((e) => (
        <li key={e.code} className="py-0.5">
          <SidebarItem
            error={e}
            active={e.code === activeCode}
            onSelect={() => onSelect(e.code)}
          />
        </li>
      ))}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

type ViewMode = 'list' | 'kanban'

const VIEW_OPTIONS = [
  { value: 'list' as const, label: 'List' },
  { value: 'kanban' as const, label: 'Kanban' },
]

const isViewMode = (v: string | null | undefined): v is ViewMode =>
  v === 'list' || v === 'kanban'

export const ValidationErrorsPage = () => {
  const navigate = useNavigate()
  const { viewId } = useParams<{ viewId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const view: ViewMode = isViewMode(viewId) ? viewId : 'list'
  const setView = (next: ViewMode) => {
    // Preserve current query (active code selection) on navigation.
    const search = searchParams.toString()
    navigate(`/validation/${next}${search ? `?${search}` : ''}`, {
      replace: true,
    })
  }

  // If somebody lands on a bogus view id, snap to list.
  useEffect(() => {
    if (viewId && !isViewMode(viewId)) {
      navigate('/validation/list', { replace: true })
    }
  }, [viewId, navigate])

  // Counts per area drive the badges on the categories rail.
  const countByArea = useMemo(() => {
    const counts: Record<ValidationArea, number> = {
      refinement: 0,
      fixes: 0,
      completeness: 0,
      anomalies: 0,
    }
    for (const e of VALIDATION_ERRORS) counts[areaOf(e)] += 1
    return counts
  }, [])

  // Default to the first area that has any validations (Fixes, today).
  const [activeArea, setActiveArea] = useState<ValidationArea>(
    () =>
      VALIDATION_AREA_ORDER.find((a) => countByArea[a] > 0) ??
      VALIDATION_AREA_ORDER[0],
  )

  const filtered = useMemo(
    () => VALIDATION_ERRORS.filter((e) => areaOf(e) === activeArea),
    [activeArea],
  )

  // Selection state — kept across views via URL so back/forward works and
  // the detail pane never shows a hidden record.
  const activeCode = searchParams.get('code') ?? filtered[0]?.code ?? ''
  const setActiveCode = (code: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (code) params.set('code', code)
    else params.delete('code')
    setSearchParams(params, { replace: true })
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: setSearchParams is stable
  useEffect(() => {
    // When the user switches area in List view, snap to the first entry of
    // the new area so the detail panel always has something to render.
    if (view !== 'list' || filtered.length === 0) return
    if (!filtered.some((e) => e.code === activeCode)) {
      const params = new URLSearchParams(searchParams)
      params.set('code', filtered[0].code)
      setSearchParams(params, { replace: true })
    }
  }, [view, filtered, activeCode])

  const activeInList = filtered.find((e) => e.code === activeCode)
  const activeAnywhere = activeCode
    ? (VALIDATION_BY_CODE[activeCode] ?? null)
    : null

  return (
    <div className="flex h-screen min-h-0 flex-col bg-bg-secondary">
      <header className="flex items-center justify-between gap-4 border-b-2 border-border-tertiary bg-bg-primary px-6 py-3">
        <h1 className="text-md font-semibold text-text-primary">Validation</h1>
        <SegmentedControl<ViewMode>
          ariaLabel="View mode"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={setView}
        />
      </header>

      {view === 'list' ? (
        <div className="flex flex-1 min-h-0">
          <CategoriesRail
            areas={VALIDATION_AREA_ORDER}
            active={activeArea}
            countByArea={countByArea}
            onSelect={setActiveArea}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-1 min-h-0">
              <aside className="flex w-[340px] shrink-0 flex-col border-r-2 border-border-tertiary bg-bg-primary">
                <div className="flex-1 overflow-y-auto px-2 py-2">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-6 text-sm text-text-secondary">
                      No validations defined in{' '}
                      {VALIDATION_AREA_LABEL[activeArea]} yet.
                    </p>
                  ) : activeArea === 'refinement' ? (
                    <RefinementSidebar
                      entries={filtered}
                      activeCode={activeInList?.code ?? null}
                      onSelect={setActiveCode}
                    />
                  ) : (
                    <ol className="flex flex-col">
                      {filtered.map((e) => (
                        <li key={e.code} className="py-0.5">
                          <SidebarItem
                            error={e}
                            active={e.code === activeInList?.code}
                            onSelect={() => setActiveCode(e.code)}
                          />
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </aside>

              <main className="flex-1 overflow-y-auto px-8 py-8">
                {activeInList ? (
                  <div className="mx-auto w-full max-w-[820px]">
                    <DetailPanel error={activeInList} />
                  </div>
                ) : (
                  <p className="text-md text-text-secondary">
                    No validations defined in{' '}
                    {VALIDATION_AREA_LABEL[activeArea]} yet.
                  </p>
                )}
              </main>
            </div>
          </div>
        </div>
      ) : null}

      {view === 'kanban' ? (
        <div className="flex flex-1 min-h-0">
          <KanbanView
            activeCode={activeAnywhere?.code ?? null}
            onSelect={setActiveCode}
          />
          {activeAnywhere ? (
            <aside className="flex w-[420px] shrink-0 flex-col overflow-y-auto border-l-2 border-border-tertiary bg-bg-primary p-6">
              <DetailPanel error={activeAnywhere} />
            </aside>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
