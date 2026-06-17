import clsx from 'clsx'
import type { ButtonHTMLAttributes, Ref } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

const variants: Record<Variant, string> = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-700 disabled:bg-neutral-300 disabled:text-neutral-500',
  secondary:
    'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-400',
  ghost:
    'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-base rounded-xl',
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ref,
  ...rest
}: ButtonProps) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    data-loading={loading || undefined}
    className={clsx(
      'inline-flex items-center justify-center gap-2 font-medium transition select-none',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15',
      'disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      className,
    )}
    {...rest}
  >
    {children}
  </button>
)
