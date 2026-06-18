import clsx from 'clsx'
import type { SVGProps } from 'react'

export type SpinnerProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  /** Stroke thickness in user units (24×24 viewBox). Default 2.5. */
  strokeWidth?: number
  label?: string
}

/**
 * A small spinning indicator. Renders at the current text colour and
 * spins via the Tailwind `animate-spin` keyframes (already in v4 by default).
 *
 * Used as the leading icon inside `<Button loading />`, but exported so the
 * rest of the prototype can drop it inline wherever it makes sense.
 */
export const Spinner = ({
  size = 20,
  strokeWidth = 2.5,
  className,
  label = 'Loading',
  ...rest
}: SpinnerProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    role="status"
    aria-label={label}
    className={clsx('animate-spin', className)}
    {...rest}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth={strokeWidth}
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
)
