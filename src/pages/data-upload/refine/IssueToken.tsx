import clsx from 'clsx'
import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/* IssueToken — soft pill used inline in plain-English headlines               */
/* -------------------------------------------------------------------------- */

export type IssueTokenTone = 'neutral' | 'success'

export type IssueTokenProps = {
  /** Text content shown in the pill. */
  children: ReactNode
  /**
   * `neutral` (default) — light grey: source values pulled straight from the
   * user's file. `success` — soft green: Sandy's suggested match.
   */
  tone?: IssueTokenTone
}

const TONE: Record<IssueTokenTone, string> = {
  neutral: 'bg-bg-tertiary text-text-primary',
  success: 'bg-support-bg-green text-text-brand-dark',
}

export const IssueToken = ({ children, tone = 'neutral' }: IssueTokenProps) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-md px-1.5 py-0.5 font-medium whitespace-nowrap',
      TONE[tone],
    )}
  >
    {children}
  </span>
)
