import { useMemo } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/shell'
import { Select, type SelectOption } from '../../components/ui'
import { CENTRAL_USER, ORGANISATIONS } from '../../data'
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

  return (
    <AppShell
      header={{
        title: 'My farms',
        showBack: false,
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
