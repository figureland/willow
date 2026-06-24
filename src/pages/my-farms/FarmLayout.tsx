import { useMemo } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { AppShell } from '../../components/shell'
import { Card, IconChevronRight, Tab, TabBar, Tabs } from '../../components/ui'
import { getFarm, getOrganisation } from '../../data'

type FarmParams = {
  orgId: string
  farmId: string
}

const FARM_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'fields-and-crops', label: 'Fields & Crops' },
  { value: 'operations', label: 'Operations' },
  { value: 'uploads', label: 'Uploads' },
] as const

type FarmTabValue = (typeof FARM_TABS)[number]['value']

/**
 * Landing layout for a single farm. Has its own title bar showing the farm
 * name, an "← All farms" back action that returns to the organisation
 * overview, and a tab bar (Overview / Fields & Crops / Operations / Uploads).
 *
 * Each tab is its own route; switching tabs navigates. The active tab is
 * inferred from the URL so the layout is fully back/forward friendly.
 */
export const FarmLayout = () => {
  const { orgId, farmId } = useParams<FarmParams>()
  const navigate = useNavigate()
  const location = useLocation()

  const farm = farmId ? getFarm(farmId) : undefined
  const organisation = orgId ? getOrganisation(orgId) : undefined

  const backHref = orgId ? `/my-farms/${orgId}` : '/my-farms'

  const activeTab: FarmTabValue = useMemo(() => {
    // /my-farms/:orgId/:farmId            → overview
    // /my-farms/:orgId/:farmId/<tab>/…    → tab
    const segments = location.pathname.split('/').filter(Boolean)
    // ['my-farms', orgId, farmId, maybeTab, ...]
    const candidate = segments[3] ?? 'overview'
    return (FARM_TABS.find((t) => t.value === candidate)?.value ??
      'overview') as FarmTabValue
  }, [location.pathname])

  if (!farm) {
    return (
      <AppShell
        header={{
          title: 'Farm not found',
          showBack: false,
        }}
      >
        <Card>
          <p className="text-text-secondary">
            We couldn't find a farm matching the URL.
          </p>
        </Card>
      </AppShell>
    )
  }

  const breadcrumb = (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-md text-text-secondary"
    >
      <Link
        to="/my-farms"
        className="hover:text-text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
      >
        My farms
      </Link>
      {organisation ? (
        <>
          <IconChevronRight size={16} className="text-icon-secondary" />
          <Link
            to={backHref}
            className="hover:text-text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            {organisation.name}
          </Link>
        </>
      ) : null}
      <IconChevronRight size={16} className="text-icon-secondary" />
      <span
        aria-current="page"
        className="font-semibold text-text-primary truncate"
      >
        {farm.name}
      </span>
    </nav>
  )

  return (
    <AppShell
      header={{
        title: breadcrumb,
        titleVariant: 'breadcrumb',
        showBack: false,
        tabs: (
          <Tabs
            value={activeTab}
            onValueChange={(next) => {
              const path =
                next === 'overview'
                  ? `/my-farms/${orgId}/${farmId}`
                  : `/my-farms/${orgId}/${farmId}/${next}`
              navigate(path)
            }}
          >
            <TabBar>
              {FARM_TABS.map((t) => (
                <Tab key={t.value} value={t.value}>
                  {t.label}
                </Tab>
              ))}
            </TabBar>
          </Tabs>
        ),
      }}
    >
      <Outlet />
    </AppShell>
  )
}
