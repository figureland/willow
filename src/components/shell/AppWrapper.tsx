import clsx from 'clsx'
import { type CSSProperties, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import { useLocalStorageState } from '../../lib/useLocalStorageState'
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  SidebarNav,
  type SidebarNavProps,
} from './SidebarNav'

const SIDEBAR_STORAGE_KEY = 'willow:sidebar-expanded'

export type AppWrapperProps = {
  /** Optional override for the sidebar items / active state. */
  sidebar?: SidebarNavProps
  /** First-visit default. After that, the user's last choice wins. */
  defaultSidebarExpanded?: boolean
  className?: string
}

type ShellContextValue = {
  sidebarExpanded: boolean
  toggleSidebar: () => void
  sidebarWidth: number
}

const ShellContext = createContext<ShellContextValue | null>(null)

/** Read the global shell state from inside any page that lives under the wrapper. */
export const useShell = (): ShellContextValue => {
  const ctx = useContext(ShellContext)
  if (!ctx) {
    throw new Error('useShell must be used inside <AppWrapper>')
  }
  return ctx
}

/**
 * Global app chrome — mounted ONCE at the router level. Owns:
 *
 *   - the fixed left sidebar (`<SidebarNav>`)
 *   - the page background colour
 *   - the scrollable main column (with the matching margin-left so the
 *     sidebar's fixed positioning still leaves room for content)
 *
 * Pages render inside via React Router's `<Outlet>` and use `<AppShell>` for
 * their per-page header / footer chrome.
 *
 * Use it as a layout route:
 *
 * ```tsx
 * <Routes>
 *   <Route element={<AppWrapper />}>
 *     <Route path="/" element={<DataCheckPage />} />
 *     <Route path="/design-system" element={<DesignSystemPage />} />
 *   </Route>
 * </Routes>
 * ```
 */
export const AppWrapper = ({
  sidebar,
  defaultSidebarExpanded = false,
  className,
}: AppWrapperProps) => {
  const isControlled = sidebar?.expanded !== undefined
  const [persistedExpanded, setPersistedExpanded] =
    useLocalStorageState<boolean>(SIDEBAR_STORAGE_KEY, defaultSidebarExpanded)
  const expanded = isControlled
    ? (sidebar?.expanded as boolean)
    : persistedExpanded
  const toggleSidebar = () => {
    sidebar?.onToggle?.()
    if (!isControlled) setPersistedExpanded((v) => !v)
  }

  const sidebarWidth = expanded
    ? SIDEBAR_WIDTH_EXPANDED
    : SIDEBAR_WIDTH_COLLAPSED

  const mainStyle: CSSProperties = {
    marginLeft: sidebarWidth,
    transition: 'margin-left 300ms ease-out',
  }

  return (
    <ShellContext.Provider
      value={{ sidebarExpanded: expanded, toggleSidebar, sidebarWidth }}
    >
      <div className="min-h-screen bg-bg-secondary">
        <SidebarNav {...sidebar} expanded={expanded} onToggle={toggleSidebar} />

        <div
          style={mainStyle}
          className={clsx('flex min-h-screen flex-col', className)}
        >
          <Outlet />
        </div>
      </div>
    </ShellContext.Provider>
  )
}
