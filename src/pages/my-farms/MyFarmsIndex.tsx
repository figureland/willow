import { Navigate } from 'react-router-dom'
import { Card } from '../../components/ui'
import { CENTRAL_USER, getFarmsForUser } from '../../data'
import { isCentralAccount } from '../../types'

/**
 * Landing page for /my-farms. Picks a sensible default destination based on
 * the user's account shape so the switchers above always have a selection.
 */
export const MyFarmsIndex = () => {
  const user = CENTRAL_USER
  const farms = getFarmsForUser(user)

  if (isCentralAccount(user)) {
    const firstOrg = user.organisationIds[0]
    if (firstOrg) {
      return <Navigate to={`/my-farms/${firstOrg}`} replace />
    }
  }

  if (farms.length > 0) {
    return (
      <Navigate
        to={`/my-farms/${farms[0].organisationId}/${farms[0].id}`}
        replace
      />
    )
  }

  return (
    <Card>
      <p className="text-text-secondary">
        You don't have access to any farms yet.
      </p>
    </Card>
  )
}
