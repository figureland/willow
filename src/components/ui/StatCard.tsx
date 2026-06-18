import clsx from 'clsx'
import type { ReactNode } from 'react'
import { IconArrowUpRight } from './icons'

export type StatCardProps = {
  /** Small label above the value, e.g. "Total production". */
  label: ReactNode
  /** The headline metric — usually a number or short string. */
  value: ReactNode
  /**
   * Optional 24×24 leading icon shown next to the label. Pass one of the
   * IconXxx components or any 24px SVG that uses `currentColor`.
   */
  icon?: ReactNode
  /**
   * Short unit / qualifier shown after the value (e.g. "t", "acre",
   * "growers", "(2 programs)").
   */
  unit?: ReactNode
  /**
   * Optional trailing badge (typically a `<TrendBadge />`) shown at the
   * end of the value row.
   */
  badge?: ReactNode
  /**
   * When `true`, renders the up-and-right arrow in the title row to signal
   * that the card links to a deeper view. Mirrors the Figma "production"
   * and "investment" variants.
   */
  hasLink?: boolean
  className?: string
}

/**
 * Stat card from the Sandy "Card-main-CPG" component. Anatomy:
 *
 *   ┌──────────────────────────────┐
 *   │ [icon] Label              ↗ │
 *   │                              │
 *   │ Value  unit       [badge]    │
 *   └──────────────────────────────┘
 *
 * Designed to sit in a horizontal row of equal-width cards (use a CSS grid
 * or flex on the parent and let the card fill the available width).
 */
export const StatCard = ({
  label,
  value,
  icon,
  unit,
  badge,
  hasLink = false,
  className,
}: StatCardProps) => (
  <div
    className={clsx(
      'flex flex-col gap-6 rounded-xl border-2 border-border-tertiary bg-bg-primary p-6',
      className,
    )}
  >
    <div className="flex items-center gap-1.5">
      {icon ? (
        <span className="text-icon-secondary shrink-0">{icon}</span>
      ) : null}
      <span className="flex-1 min-w-0 font-semibold text-md text-text-secondary tracking-[0.15px]">
        {label}
      </span>
      {hasLink ? (
        <span aria-hidden="true" className="shrink-0 text-icon-brand">
          <IconArrowUpRight size={24} />
        </span>
      ) : null}
    </div>

    <div className="flex items-center gap-1">
      <span className="font-semibold text-xl text-text-primary leading-7">
        {value}
      </span>
      {unit ? (
        <span className="flex-1 min-w-0 pt-1 text-md text-text-primary tracking-[0.25px]">
          {unit}
        </span>
      ) : null}
      {badge ? <span className="shrink-0">{badge}</span> : null}
    </div>
  </div>
)
