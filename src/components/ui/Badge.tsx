import clsx from 'clsx'
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'

export type BadgeTone = 'green' | 'orange' | 'red' | 'neutral'

export type BadgeSize = 'sm' | 'md' | 'lg'

export type BadgeProps = {
  /** Background + text colour pair. Defaults to `neutral`. */
  tone?: BadgeTone
  /** Visual scale — drives padding, type size, and icon size. */
  size?: BadgeSize
  /** Optional leading icon (e.g. a trend arrow). Coloured by the tone. */
  icon?: ReactNode
  /** Label rendered inside the badge. */
  children: ReactNode
  className?: string
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'gap-1 px-1.5 py-0.5 text-xs',
  md: 'gap-1.5 px-2 py-0.5 text-sm',
  lg: 'gap-2 pl-2 pr-3 py-1 text-md',
}

/** Pixel size handed to the icon's `size` prop so the SVG matches the badge. */
const iconPixelSize: Record<BadgeSize, number> = {
  sm: 12,
  md: 16,
  lg: 24,
}

const toneClasses: Record<BadgeTone, string> = {
  green: 'bg-support-bg-green text-text-brand-dark',
  // Amber/orange — the design system uses the amber ramp internally but the
  // semantic intent here is "warning", so we expose it as `orange` for
  // callers.
  orange: 'bg-support-bg-amber text-support-fg-amber',
  red: 'bg-support-bg-red text-support-fg-red',
  neutral: 'bg-bg-tertiary text-text-secondary',
}

/**
 * Generic badge. Unified radius, three sizes, three tones, optional leading
 * icon. Replaces the earlier TrendBadge / chip-status / chip-trend variants
 * — pair with a trend icon (e.g. `<IconTrendUp />`) for those use cases.
 *
 * When `icon` is a React element that accepts a `size` prop (e.g. any of the
 * `IconXxx` components) it's cloned with the size matched to the badge size
 * so the SVG actually scales — otherwise the icon's intrinsic size wins and
 * sm/md badges look oversized.
 */
export const Badge = ({
  tone = 'neutral',
  size = 'md',
  icon,
  children,
  className,
}: BadgeProps) => {
  const sizedIcon =
    isValidElement(icon) &&
    typeof (icon.props as { size?: unknown }).size !== 'string'
      ? cloneElement(icon as ReactElement<{ size?: number }>, {
          size: iconPixelSize[size],
        })
      : icon

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md font-semibold tracking-[0.15px] whitespace-nowrap',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
    >
      {sizedIcon ? (
        <span className="grid place-items-center shrink-0">{sizedIcon}</span>
      ) : null}
      {children}
    </span>
  )
}
