import { Toolbar } from '@base-ui/react/toolbar'
import clsx from 'clsx'
import type { ReactNode } from 'react'

export type SegmentedControlOption<Value extends string = string> = {
  value: Value
  label: ReactNode
  leadingIcon?: ReactNode
  disabled?: boolean
}

export type SegmentedControlProps<Value extends string = string> = {
  options: SegmentedControlOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  /** Accessible label for the toolbar. */
  ariaLabel?: string
  className?: string
}

/**
 * Pill-style toggle for switching between a small set of mutually exclusive
 * views (e.g. List vs Map). Built on Base UI's Toolbar primitive so arrow
 * keys move between segments and ARIA roles are correct.
 */
export const SegmentedControl = <Value extends string = string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  className,
}: SegmentedControlProps<Value>) => (
  <Toolbar.Root
    aria-label={ariaLabel}
    className={clsx(
      'inline-flex p-1 rounded-md bg-bg-tertiary',
      'border border-border-tertiary',
      className,
    )}
  >
    {options.map((option) => {
      const selected = option.value === value
      return (
        <Toolbar.Button
          key={option.value}
          disabled={option.disabled}
          aria-pressed={selected}
          onClick={() => onValueChange(option.value)}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-md font-medium',
            'transition-colors cursor-pointer select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
            selected
              ? 'bg-bg-primary text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
            'disabled:cursor-not-allowed disabled:text-text-disabled',
          )}
        >
          {option.leadingIcon ? (
            <span className="size-5 grid place-items-center shrink-0">
              {option.leadingIcon}
            </span>
          ) : null}
          {option.label}
        </Toolbar.Button>
      )
    })}
  </Toolbar.Root>
)
