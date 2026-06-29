import clsx from 'clsx'
import { Tooltip } from '../../../components/ui'
import type { RowIssue } from './row-issues'

/* -------------------------------------------------------------------------- */
/* RowStatusPip — tiny solid-coloured circle with a white glyph                */
/* -------------------------------------------------------------------------- */

/**
 * Three states across every Fix data grid:
 *
 * - `clean`    → solid green circle with a white tick.
 * - `warning`  → solid amber circle with a white "!".
 * - `blocking` → solid red circle with a white "×".
 *
 * Sits before the action column so the row's health reads at a glance.
 * Pair with the existing soft row-tint backgrounds for blocking rows — the
 * pip is the punchier signal; the tint is the ambient one.
 */
export type RowStatus = 'clean' | 'warning' | 'blocking'

const TONE: Record<RowStatus, string> = {
  clean: 'bg-support-fg-green',
  warning: 'bg-support-fg-amber',
  blocking: 'bg-support-fg-red',
}

const TITLE: Record<RowStatus, string> = {
  clean: 'No issues',
  warning: 'Warning',
  blocking: 'Blocking issue',
}

/**
 * The bare pip with no tooltip wrapping. Useful where the surrounding element
 * already carries the label (e.g. a button row with the issue text inline).
 */
const PipMark = ({ status }: { status: RowStatus }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'grid size-4 place-items-center rounded-full text-text-primary-inverse',
      TONE[status],
    )}
  >
    {status === 'clean' ? (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : status === 'warning' ? (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="10.75" y="5" width="2.5" height="9" rx="1" />
        <circle cx="12" cy="18" r="1.75" />
      </svg>
    ) : (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    )}
  </span>
)

/**
 * Pip wrapped in a hover-tooltip that lists every active issue on the row.
 * Pass `issues` whenever the pip is rendered from a record context — the
 * tooltip body lifts straight off the catalogue messages already attached to
 * the row.
 */
export const RowStatusPip = ({
  status,
  issues,
  onClick,
}: {
  status: RowStatus
  /** Active issues on the row — when provided, surfaced in the hover tooltip. */
  issues?: RowIssue[]
  /** When provided, the pip becomes a button with a hover/active ring so the
   *  user can tell it's clickable as well as hoverable. */
  onClick?: () => void
}) => {
  const label = TITLE[status]
  const tooltipContent = (
    <div className="flex max-w-[260px] flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      {issues && issues.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {issues.map((issue, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: messages can repeat across fields
              key={`${issue.code ?? issue.message}-${i}`}
              className="text-sm leading-snug text-text-primary"
            >
              · {issue.message}
            </li>
          ))}
        </ul>
      ) : status === 'clean' ? (
        <p className="text-sm text-text-secondary">No active issues.</p>
      ) : null}
    </div>
  )
  const inner = onClick ? (
    <button
      type="button"
      onClick={(e) => {
        // Stop the row's click handler / selection from firing — clicking
        // the pip is a distinct affordance.
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      className={clsx(
        'inline-flex items-center justify-center rounded-full p-0.5',
        'transition-colors duration-150',
        'hover:bg-black/15 active:bg-black/25',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      )}
    >
      <PipMark status={status} />
    </button>
  ) : (
    <span role="img" aria-label={label} className="inline-flex">
      <PipMark status={status} />
    </span>
  )
  return <Tooltip content={tooltipContent}>{inner}</Tooltip>
}

/**
 * Resolve a row's status pip from its issue list. Removed/edited overrides
 * live in the consuming view (they already set their own row classes).
 */
export const statusFor = (
  issues: { severity: 'blocking' | 'warning' }[],
): RowStatus => {
  if (!issues || issues.length === 0) return 'clean'
  return issues.some((i) => i.severity === 'blocking') ? 'blocking' : 'warning'
}

/* -------------------------------------------------------------------------- */
/* StatusHaloBadge — pip wrapped in a tinted disc for sidebar list items     */
/* -------------------------------------------------------------------------- */

const HALO: Record<RowStatus, string> = {
  clean: 'bg-support-bg-green',
  warning: 'bg-support-bg-amber',
  blocking: 'bg-support-bg-red',
}

/**
 * Larger presentation of the pip used in sidebar list items so issues and
 * fields read with the same visual weight. The pip itself stays small inside
 * a 40px tinted halo.
 */
export const StatusHaloBadge = ({
  status,
  issues,
  onClick,
}: {
  status: RowStatus
  /** Forwarded to the inner pip so the tooltip lists active issues. */
  issues?: RowIssue[]
  /** When provided, the inner pip becomes clickable. */
  onClick?: () => void
}) => (
  <span
    className={clsx(
      'grid size-10 shrink-0 place-items-center rounded-full',
      HALO[status],
    )}
  >
    <RowStatusPip status={status} issues={issues} onClick={onClick} />
  </span>
)
