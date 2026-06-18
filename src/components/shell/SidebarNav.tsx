import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandLogo } from '../ui/BrandLogo'
import {
  IconMenuCollapse,
  IconMenuFarm,
  IconMenuFinancial,
  IconMenuHide,
  IconMenuHome,
  IconMenuOpportunities,
  IconMenuSustainability,
  IconMenuUtilities,
  IconPalette,
  IconTable,
} from '../ui/icons'

export type SidebarItem = {
  id: string
  /** Short uppercase label, shown when the sidebar is expanded. */
  label: string
  icon: ReactNode
  /** Route to navigate to. Items without an href render as plain buttons. */
  href?: string
}

export type SidebarNavProps = {
  items?: SidebarItem[]
  /**
   * Override the active item. When omitted, the active item is inferred from
   * the current pathname matching `item.href`.
   */
  activeId?: string
  onSelect?: (id: string) => void
  /** Expanded layout shows the brand logo + text labels alongside each icon. */
  expanded?: boolean
  onToggle?: () => void
}

export const SIDEBAR_WIDTH_COLLAPSED = 88
export const SIDEBAR_WIDTH_EXPANDED = 320

/* ----------------------------- Layout invariants ----------------------------
 * Every state of the sidebar shares the same vertical metrics so toggling
 * never reflows the icons:
 *
 *   - 24px outer padding
 *   - 40px header row (toggle button + optional brand lockup)
 *   - 24px gap between header and nav list
 *   - 24px gap between nav items
 *   - 40px tall nav rows; 40×40 icon slot pinned to the left
 *
 * The only thing that changes between states is whether the label slot is
 * visible and whether the nav widens from 88 → 320px.
 * --------------------------------------------------------------------------- */

const ITEM_ICON_SIZE = 40
const ITEM_GAP = 12 // px between icon slot and label

export const DEFAULT_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: <IconMenuHome />, href: '/' },
  {
    id: 'my-farms',
    label: 'My farms',
    icon: <IconMenuFarm />,
    href: '/my-farms',
  },
  {
    id: 'sustainability',
    label: 'Sustainability',
    icon: <IconMenuSustainability />,
    href: '/sustainability',
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    icon: <IconMenuOpportunities />,
    href: '/opportunities',
  },
  { id: 'ncvm', label: 'NCVM', icon: <IconMenuFinancial />, href: '/ncvm' },
  {
    id: 'sandy-setup',
    label: 'Sandy setup',
    icon: <IconMenuUtilities />,
    href: '/sandy-setup',
  },
  {
    id: 'sandy-ai',
    label: 'Sandy AI agents',
    icon: <IconPalette />,
    href: '/sandy-ai',
  },
  {
    id: 'data-table',
    label: 'Data table',
    icon: <IconTable />,
    href: '/data-table',
  },
  {
    id: 'design-system',
    label: 'Design system',
    icon: <IconPalette />,
    href: '/design-system',
  },
]

const iconSlotClass = (isActive: boolean) =>
  clsx(
    'shrink-0 grid place-items-center rounded-md',
    'size-10 border-2 transition-colors',
    isActive
      ? 'bg-sandy-100 border-border-tertiary-focus text-icon-brand'
      : 'border-transparent text-icon-primary',
  )

const itemRowClass = clsx(
  'group flex items-center h-10 w-full rounded-md',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
  'transition-colors',
)

export const SidebarNav = ({
  items = DEFAULT_SIDEBAR_ITEMS,
  activeId,
  onSelect,
  expanded = false,
  onToggle,
}: SidebarNavProps) => {
  const { pathname } = useLocation()
  // Match the most specific item: exact match wins over prefix match. The
  // prefix match is what makes sub-routes like /my-farms/:orgId/:farmId light
  // up the parent "My farms" entry.
  const isMatch = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`)
  const exact = items.find((item) => item.href && item.href === pathname)
  const prefix = items.find((item) => item.href && isMatch(item.href))
  const inferredActiveId = (exact ?? prefix)?.id
  const currentActiveId = activeId ?? inferredActiveId

  return (
    <nav
      aria-label="Primary"
      data-expanded={expanded || undefined}
      className={clsx(
        'fixed top-0 left-0 z-20 h-screen bg-bg-primary',
        'flex flex-col p-6 gap-6 overflow-hidden',
        'border-r border-border-secondary',
        'transition-[width] duration-300 ease-out',
        expanded
          ? `w-[${SIDEBAR_WIDTH_EXPANDED}px]`
          : `w-[${SIDEBAR_WIDTH_COLLAPSED}px]`,
      )}
      style={{
        width: expanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
      }}
    >
      {/* Header row — always 40px tall, toggle pinned to the left.
          The brand lockup fades in next to the toggle in the expanded state
          but the toggle itself never moves. */}
      <header className="flex items-center h-10 shrink-0 gap-3">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
            className={clsx(
              'shrink-0 size-10 grid place-items-center rounded-md text-icon-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
              'hover:bg-bg-tertiary transition-colors',
            )}
          >
            <span className="size-6 grid place-items-center">
              {expanded ? <IconMenuHide /> : <IconMenuCollapse />}
            </span>
          </button>
        ) : null}
        <span
          className={clsx(
            'flex items-center min-w-0 text-text-primary',
            'transition-opacity duration-200',
            expanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <BrandLogo height={28} />
        </span>
      </header>

      <ul className="flex flex-col gap-6 overflow-y-auto overflow-x-hidden">
        {items.map((item) => {
          const isActive = item.id === currentActiveId
          const row = (
            <>
              <span className={iconSlotClass(isActive)}>
                <span className="size-6 grid place-items-center">
                  {item.icon}
                </span>
              </span>
              <span
                className={clsx(
                  'flex-1 min-w-0 truncate text-sm font-bold uppercase tracking-[0.5px]',
                  'transition-opacity duration-200',
                  expanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
                  isActive ? 'text-text-primary' : 'text-text-secondary',
                  'group-hover:text-text-primary',
                )}
              >
                {item.label}
              </span>
            </>
          )

          const commonProps = {
            'aria-label': item.label,
            'aria-current': isActive ? ('page' as const) : undefined,
            className: itemRowClass,
            style: { gap: ITEM_GAP } as const,
            onClick: () => onSelect?.(item.id),
          }

          return (
            <li
              key={item.id}
              style={{
                width: expanded ? SIDEBAR_WIDTH_EXPANDED - 48 : ITEM_ICON_SIZE,
              }}
            >
              {item.href ? (
                <Link to={item.href} {...commonProps}>
                  {row}
                </Link>
              ) : (
                <button type="button" {...commonProps}>
                  {row}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
