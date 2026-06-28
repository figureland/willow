import clsx from 'clsx'
import { useState } from 'react'
import { Button } from '../../../components/ui'
import type { IssueSeverity } from './row-issues'

/* -------------------------------------------------------------------------- */
/* FieldIssueCard — same visual template as IssuesView's FixIssueCard, scoped */
/* to field-level row issues (no affected-records modal).                     */
/* -------------------------------------------------------------------------- */

export type FieldIssue = {
  id: string
  severity: IssueSeverity
  headline: string
  context: string
  affectedSummary?: string
}

type Resolution = 'pending' | 'fixed' | 'ignored'

const isResolved = (r: Resolution) => r === 'fixed' || r === 'ignored'

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
}

const SeverityPill = ({ severity }: { severity: IssueSeverity }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      severity === 'blocking'
        ? 'bg-support-bg-red text-support-fg-red'
        : 'bg-support-bg-amber text-support-fg-amber',
    )}
  >
    {SEVERITY_LABEL[severity]}
  </span>
)

const StatusIndicator = ({ resolved }: { resolved: boolean }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors',
      resolved
        ? 'border-support-fg-green bg-support-fg-green text-text-primary-inverse'
        : 'border-border-secondary bg-bg-primary',
    )}
  >
    {resolved ? (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <title>Resolved</title>
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : null}
  </span>
)

type FieldIssueCardProps = {
  issue: FieldIssue
  isActive: boolean
  onFocus: () => void
}

export const FieldIssueCard = ({
  issue,
  isActive,
  onFocus,
}: FieldIssueCardProps) => {
  const [resolution, setResolution] = useState<Resolution>('pending')
  const resolved = isResolved(resolution)
  const resolvedLabel =
    resolution === 'fixed'
      ? 'Fixed'
      : resolution === 'ignored'
        ? 'Ignored'
        : null

  if (!isActive) {
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: also focusable via tab
      // biome-ignore lint/a11y/noStaticElementInteractions: card reads as a row
      <article
        onClick={onFocus}
        className={clsx(
          'group flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent bg-bg-primary p-5 shadow-sm transition-all duration-200',
          'hover:border-border-tertiary hover:shadow-md',
          resolved && 'opacity-70',
        )}
      >
        <StatusIndicator resolved={resolved} />
        <SeverityPill severity={issue.severity} />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-md font-medium text-text-primary">
            {issue.headline}
          </p>
          <p className="text-sm text-text-secondary">{issue.context}</p>
        </div>
        {resolvedLabel ? (
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-text-brand-dark">
            <span>{resolvedLabel}</span>
          </span>
        ) : null}
      </article>
    )
  }

  return (
    <article
      className={clsx(
        'relative flex flex-col gap-4 rounded-xl bg-bg-primary p-6 shadow-md transition-all duration-200',
        resolved && 'opacity-90',
      )}
    >
      <div className="flex items-start gap-3">
        <StatusIndicator resolved={resolved} />
        <SeverityPill severity={issue.severity} />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-lg font-medium leading-7 text-text-primary">
            {issue.headline}
          </p>
          <p className="text-sm text-text-secondary">{issue.context}</p>
          {issue.affectedSummary ? (
            <p className="text-xs font-medium text-text-secondary">
              {issue.affectedSummary}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="primary"
          onClick={() => setResolution('fixed')}
          disabled={resolution === 'fixed'}
        >
          Resolve
        </Button>
        <Button
          variant="secondary"
          onClick={() => setResolution('ignored')}
          disabled={resolution === 'ignored'}
        >
          Ignore
        </Button>
        {resolvedLabel ? (
          <button
            type="button"
            onClick={() => setResolution('pending')}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-support-bg-green px-3 py-1 text-sm font-semibold text-text-brand-dark hover:bg-support-bg-green/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            <span>{resolvedLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Undo</span>
          </button>
        ) : null}
      </div>
    </article>
  )
}
