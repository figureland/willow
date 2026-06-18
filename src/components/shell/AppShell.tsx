import clsx from 'clsx'
import type { ReactNode } from 'react'
import { AppHeader, type AppHeaderProps } from './AppHeader'

export type AppShellProps = {
  /** Props for the screen header — title, back action, right-aligned CTAs, optional tabs. */
  header: AppHeaderProps
  /** Optional footer for page-level actions ("additional actions" in the Figma). */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Per-page chrome. Renders the header, a scrollable main column, and an
 * optional footer card. Always mounted *inside* an `<AppWrapper>` (the
 * sidebar + background live there, not here).
 */
export const AppShell = ({
  header,
  footer,
  children,
  className,
}: AppShellProps) => (
  <div className={clsx('flex flex-1 flex-col', className)}>
    <AppHeader {...header} />

    <main className="flex-1 flex flex-col gap-2 p-8 pt-6">{children}</main>

    {footer ? (
      <div className="px-8 pb-8">
        <div
          className={clsx(
            'rounded-lg bg-bg-primary',
            'border-2 border-bg-tertiary',
            'p-4 flex items-center justify-end gap-2',
          )}
        >
          {footer}
        </div>
      </div>
    ) : null}
  </div>
)
