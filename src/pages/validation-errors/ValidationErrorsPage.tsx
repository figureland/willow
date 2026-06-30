import clsx from 'clsx'
import { type ReactNode, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui'
import {
  DATA_CATEGORY_LABEL,
  REFINEMENT_TASK_LABEL,
  UX_ITEM_KIND_LABEL,
  VALIDATION_BY_CODE,
  VALIDATION_SEVERITY_LABEL,
  VALIDATION_TYPE_LABEL,
  type ValidationError,
  type ValidationSeverity,
} from './validation-errors'
import { KanbanView } from './views/KanbanView'

/* -------------------------------------------------------------------------- */
/* UX Content page — one column per upload step, kind-tagged cards inside      */
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
    { label: 'Kind', value: UX_ITEM_KIND_LABEL[error.uxKind] },
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
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export const ValidationErrorsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Selection state — kept in the URL so back/forward works and the detail
  // pane never shows a hidden record.
  const activeCode = searchParams.get('code') ?? ''
  const setActiveCode = (code: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (code) params.set('code', code)
    else params.delete('code')
    setSearchParams(params, { replace: true })
  }

  const activeError = activeCode
    ? (VALIDATION_BY_CODE[activeCode] ?? null)
    : null

  return (
    <div className="flex h-screen min-h-0 flex-col bg-bg-secondary">
      <header className="flex items-center justify-between gap-4 border-b-2 border-border-tertiary bg-bg-primary px-6 py-3">
        <h1 className="text-md font-semibold text-text-primary">
          UX Content: Validation, Feedback and Suggestions
        </h1>
      </header>

      <KanbanLayout
        activeError={activeError}
        activeCode={activeError?.code ?? null}
        onSelect={setActiveCode}
        onDismiss={() => setActiveCode(null)}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Kanban layout — keeps the click-outside / Escape dismiss wiring local       */
/* -------------------------------------------------------------------------- */

const KanbanLayout = ({
  activeError,
  activeCode,
  onSelect,
  onDismiss,
}: {
  activeError: ValidationError | null
  activeCode: string | null
  onSelect: (code: string) => void
  onDismiss: () => void
}) => {
  // Outside-click + Escape dismiss the open detail. Clicks inside the right-
  // hand panel or on any kanban card (marked with `data-kanban-card`) are
  // treated as "still interacting" — every other click closes.
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!activeError) return
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      if (target.closest('[data-kanban-card]')) return
      onDismiss()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [activeError, onDismiss])

  return (
    <div className="flex flex-1 min-h-0">
      <KanbanView activeCode={activeCode} onSelect={onSelect} />
      {activeError ? (
        <aside
          ref={panelRef}
          className="flex w-[520px] shrink-0 flex-col overflow-y-auto border-l-2 border-border-tertiary bg-bg-primary p-6"
        >
          <DetailPanel error={activeError} />
        </aside>
      ) : null}
    </div>
  )
}
