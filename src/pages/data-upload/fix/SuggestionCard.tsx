import clsx from 'clsx'
import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/* SuggestionCard — shared between the issues view + field view               */
/* -------------------------------------------------------------------------- */

/**
 * Tray-style card used in the "How to fix" surface. Forest-green background,
 * white headline + body, change-line punched out in bright sandy green so
 * the value being applied reads as the headline of the suggestion.
 */
export const SuggestionCard = ({
  title,
  description,
  changeLine,
  cta,
}: {
  title: string
  description?: string
  changeLine?: string
  cta?: ReactNode
}) => (
  <div
    className={clsx(
      'flex h-full flex-1 flex-col gap-3 rounded-xl bg-sandy-900 p-5 text-text-primary-inverse',
      'shadow-none transition-shadow duration-200 hover:shadow-md',
    )}
  >
    <div className="flex flex-1 flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-sandy-300">
        {title}
      </h3>
      {description ? (
        <p className="text-md text-text-primary-inverse/80">{description}</p>
      ) : null}
      {changeLine ? (
        <p className="mt-1 text-lg font-semibold leading-snug text-sandy-300">
          {changeLine}
        </p>
      ) : null}
    </div>
    {cta ? <div className="mt-2">{cta}</div> : null}
  </div>
)
