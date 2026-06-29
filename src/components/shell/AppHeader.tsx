import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft } from '../ui/icons'

export type AppHeaderProps = {
  title: ReactNode
  /**
   * Visual treatment for the title slot.
   *   - `heading` (default): renders inside an `<h1>` with the page-title type
   *     scale. Use for normal screen titles.
   *   - `breadcrumb`: renders the title as a plain row at body type size, with
   *     no wrapping heading element. Use when `title` is itself a breadcrumb
   *     or another non-heading node.
   */
  titleVariant?: 'heading' | 'breadcrumb'
  /** Hide the back arrow when the screen is a top-level destination. */
  showBack?: boolean
  /**
   * When the back arrow always routes to the same URL, prefer `backTo` over
   * `onBack` — it renders as a real `<Link>` so cmd-click / middle-click work
   * and the browser shows the URL on hover. Falls back to `onBack` (button)
   * when the back action is dynamic (e.g. `navigate(-1)`).
   */
  backTo?: string
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
  titleVariant = 'heading',
  showBack = true,
  backTo,
  onBack,
  actions,
  tabs,
  className,
}: AppHeaderProps) => {
  const backClassName = clsx(
    'size-6 grid place-items-center text-icon-brand',
    'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
  )
  const backNode = showBack ? (
    backTo ? (
      <Link to={backTo} aria-label="Go back" className={backClassName}>
        <IconArrowLeft />
      </Link>
    ) : (
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className={backClassName}
      >
        <IconArrowLeft />
      </button>
    )
  ) : null

  return (
    <header
      className={clsx(
        'w-full bg-bg-primary',
        tabs ? 'pt-6' : 'border-b-2 border-border-tertiary py-6',
        'px-8',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {backNode}

        {titleVariant === 'heading' ? (
          <h1 className="flex-1 min-w-0 text-2xl font-semibold leading-9 text-text-primary truncate">
            {title}
          </h1>
        ) : (
          <div className="flex-1 min-w-0">{title}</div>
        )}

        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>

      {tabs ? <div className="mt-6">{tabs}</div> : null}
    </header>
  )
}
