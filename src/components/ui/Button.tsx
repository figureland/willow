import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  /**
   * When true the button is disabled and the spinning loader replaces the
   * leading icon. Opt-in only — buttons render with no spinner by default.
   */
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

const base = clsx(
  'inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
  'font-sans font-semibold tracking-[0.15px]',
  'rounded-md border transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40 focus-visible:ring-offset-1',
  'disabled:cursor-not-allowed',
)

const variants: Record<Variant, string> = {
  // Brand green using the button-primary token ramp (sandy-600 → 700 hover → 800 active).
  primary: clsx(
    'bg-button-primary text-text-primary-inverse border-button-primary',
    'hover:bg-button-primary-hover hover:border-button-primary-hover',
    'active:bg-button-primary-active active:border-button-primary-active',
    'disabled:bg-button-disabled disabled:border-border-disabled disabled:text-text-disabled',
  ),
  secondary: clsx(
    'bg-bg-primary text-text-primary border-border-secondary',
    'hover:border-border-secondary-hover hover:bg-bg-secondary',
    'active:border-border-secondary-active',
    'disabled:bg-button-disabled disabled:border-border-disabled disabled:text-text-disabled',
  ),
  ghost: clsx(
    'bg-transparent text-text-primary border-transparent',
    'hover:bg-button-tertiary',
    'active:bg-button-tertiary-hover',
    'disabled:text-text-disabled',
  ),
}

const sizes: Record<Size, string> = {
  // Mirrors Figma's button: 16/24 text, ~16px icon-to-text gap on a 42-44px tall surface
  md: 'text-md leading-[24px] py-[8px] pl-[10px] pr-[13px]',
  lg: 'text-md leading-[24px] py-[10px] px-[16px]',
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  children,
  ref,
  ...rest
}: ButtonProps) => {
  // When loading, the spinner takes the leading icon's slot so the label and
  // overall width don't jump. If the caller passed no leading icon we still
  // reserve the same slot for the spinner.
  const renderedLeading = loading ? <Spinner /> : leadingIcon

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {renderedLeading ? (
        <span className="size-6 grid place-items-center shrink-0">
          {renderedLeading}
        </span>
      ) : null}
      {/* Overpass's metrics make text sit ~2px above the optical centre, so
          the text node carries its own pt-[2px] while the icon slots stay
          centred — this keeps icon + label aligned to the same baseline. */}
      <span className="pt-[2px]">{children}</span>
      {trailingIcon ? (
        <span className="size-6 grid place-items-center shrink-0">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  )
}
