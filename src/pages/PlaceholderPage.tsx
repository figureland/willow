import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell'
import { Card } from '../components/ui'

type PlaceholderPageProps = {
  title: string
  blurb?: string
}

/**
 * Stand-in screen used by the routes in the sidebar that don't yet have
 * real content. Renders the same shell + Card as every other prototype
 * screen so the surrounding chrome (sidebar highlight, header, footer slot)
 * works end-to-end.
 */
export const PlaceholderPage = ({ title, blurb }: PlaceholderPageProps) => {
  const navigate = useNavigate()
  return (
    <AppShell
      header={{
        title,
        onBack: () => navigate(-1),
      }}
    >
      <Card className="min-h-[420px]">
        <p className="text-text-secondary">
          {blurb ??
            `Placeholder for the ${title} screen. Drop the real content here when it's ready — the shell, sidebar and routing are already wired up.`}
        </p>
      </Card>
    </AppShell>
  )
}
