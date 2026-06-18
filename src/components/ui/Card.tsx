import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

/**
 * The base content surface — matches the white card with the 2px tertiary
 * border seen across every prototype screen.
 */
export const Card = ({ className, children, ...rest }: CardProps) => (
  <div
    className={clsx(
      'rounded-lg bg-bg-primary border-2 border-border-tertiary p-6',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
)
