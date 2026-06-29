import clsx from 'clsx'
import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/* SuggestionCard — shared between the issues view + field view               */
/* -------------------------------------------------------------------------- */

export type SuggestionTone = 'smart' | 'neutral'

/**
 * Single-purpose "do this" card on the "How to fix" surface. Each card is
 * collapsed to one type size: a headline naming the action, a short
 * description of what it'll do, and a single CTA.
 *
 * - `smart` (default) → forest green for AI suggestions Sandy is confident
 *   enough to recommend.
 * - `neutral`        → grey for hand-offs into the manual editor where
 *   the user does the work themselves.
 */
export const SuggestionCard = ({
  headline,
  description,
  cta,
  tone = 'smart',
}: {
  headline: string
  description?: string
  cta?: ReactNode
  tone?: SuggestionTone
}) => {
  const isSmart = tone === 'smart'
  return (
    <div
      className={clsx(
        'flex h-full flex-1 flex-col gap-3 rounded-xl p-5',
        'shadow-none transition-shadow duration-200 hover:shadow-md',
        isSmart
          ? 'bg-sandy-900 text-text-primary-inverse'
          : 'bg-bg-tertiary text-text-primary',
      )}
    >
      <div className="flex flex-1 flex-col gap-2">
        <h3
          className={clsx(
            'text-lg font-semibold leading-snug',
            isSmart ? 'text-sandy-300' : 'text-text-primary',
          )}
        >
          {headline}
        </h3>
        {description ? (
          <p
            className={clsx(
              'text-md',
              isSmart
                ? 'text-text-primary-inverse/80'
                : 'text-text-secondary',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {cta ? <div className="mt-2">{cta}</div> : null}
    </div>
  )
}
