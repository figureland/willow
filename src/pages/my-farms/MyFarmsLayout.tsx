import { useMemo } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/shell'
import {
  Button,
  IconChevronRight,
  Select,
  type SelectOption,
} from '../../components/ui'
import { CENTRAL_USER, getOrganisation, ORGANISATIONS } from '../../data'
import { isCentralAccount } from '../../types'

type MyFarmsParams = {
  orgId?: string
}

/**
 * Top-level layout for /my-farms/*. Hosts the Organisation switcher when the
 * user has a central account; otherwise renders just the bare page chrome.
 *
 * Per-farm chrome (back breadcrumb, tab bar) lives in `<FarmLayout>` nested
 * under `/my-farms/:orgId/:farmId/*` and is rendered by the router on top of
 * this outlet.
 */
export const MyFarmsLayout = () => {
  const navigate = useNavigate()
  const { orgId } = useParams<MyFarmsParams>()

  // Today we hard-code the central-account user. Future work: read from a
  // session/context provider.
  const user = CENTRAL_USER
  const central = isCentralAccount(user)

  const orgOptions: SelectOption[] = useMemo(
    () =>
      ORGANISATIONS.filter((o) => user.organisationIds.includes(o.id)).map(
        (o) => ({ value: o.id, label: o.name }),
      ),
    [],
  )

  const organisation = orgId ? getOrganisation(orgId) : undefined

  const breadcrumb = (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-md text-text-secondary"
    >
      {organisation ? (
        <>
          <Link
            to="/my-farms"
            className="hover:text-text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            My farms
          </Link>
          <IconChevronRight size={16} className="text-icon-secondary" />
          <span
            aria-current="page"
            className="font-semibold text-text-primary truncate"
          >
            {organisation.name}
          </span>
        </>
      ) : (
        <span
          aria-current="page"
          className="font-semibold text-text-primary truncate"
        >
          My farms
        </span>
      )}
    </nav>
  )

  return (
    <AppShell
      header={{
        title: breadcrumb,
        titleVariant: 'breadcrumb',
        showBack: false,
        actions: (
          <Button variant="primary" onClick={() => navigate('/data-upload')}>
            Create data upload
          </Button>
        ),
      }}
    >
      {central ? (
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Organisation"
            value={orgId ?? null}
            onValueChange={(next) => next && navigate(`/my-farms/${next}`)}
            items={orgOptions}
            clearable={false}
            width={280}
          />
        </div>
      ) : null}

      <div className="mt-2">
        <Outlet />
      </div>
    </AppShell>
  )
}
