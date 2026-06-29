import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import clsx from 'clsx'
import type { ReactNode } from 'react'

export type TooltipProps = {
  /** The element the tooltip is anchored to. Must be a single React node. */
  children: ReactNode
  /** Content rendered inside the popup. */
  content: ReactNode
  /** Where the tooltip should sit relative to its trigger. Defaults to `top`. */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** Tailwind override on the popup body. */
  className?: string
}

/**
 * Lightweight design-system wrapper around Base UI's accessible Tooltip
 * primitive. Renders the trigger inline (no wrapper element) and uses the
 * design tokens for the popup chrome.
 */
export const Tooltip = ({
  children,
  content,
  side = 'top',
  className,
}: TooltipProps) => (
  <BaseTooltip.Provider delay={120}>
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={<span className="inline-flex" />}>
        {children}
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={6} side={side} className="z-[60]">
          <BaseTooltip.Popup
            className={clsx(
              'z-[60] max-w-[280px] rounded-md border-2 border-border-tertiary bg-bg-primary',
              'px-3 py-2 shadow-[0_8px_8px_-2px_rgba(0,0,0,0.05)]',
              'text-sm text-text-primary outline-none',
              'origin-[var(--transform-origin)] transition-opacity duration-150 ease-out',
              'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
              className,
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  </BaseTooltip.Provider>
)
