import clsx from 'clsx'
import type { ReactNode } from 'react'
import { IconArrowLeft } from '../ui/icons'

export type AppHeaderProps = {
  title: ReactNode
  /** Hide the back arrow when the screen is a top-level destination. */
  showBack?: boolean
  onBack?: () => void
  /** Right-aligned actions — primary CTAs, secondary buttons, menus etc. */
  actions?: ReactNode
  /**
   * Optional row rendered below the title — typically a `<TabBar>` from the
   * Tabs primitive. When provided, the header's bottom border is suppressed
   * so the tab bar can own its own divider.
   */
  tabs?: ReactNode
  className?: string
}

export const AppHeader = ({
  title,
  showBack = true,
  onBack,
  actions,
  tabs,
  className,
}: AppHeaderProps) => (
  <header
    className={clsx(
      'w-full bg-bg-primary',
      tabs ? 'pt-6' : 'border-b-2 border-border-tertiary py-6',
      'px-8',
      className,
    )}
  >
    <div className="flex items-center gap-4">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className={clsx(
            'size-6 grid place-items-center text-icon-brand',
            'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
          )}
        >
          <IconArrowLeft />
        </button>
      ) : null}

      <h1 className="flex-1 min-w-0 text-2xl font-semibold leading-9 text-text-primary truncate">
        {title}
      </h1>

      {actions ? (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>

    {tabs ? <div className="mt-6">{tabs}</div> : null}
  </header>
)
