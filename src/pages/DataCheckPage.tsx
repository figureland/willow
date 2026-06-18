import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/shell'
import { Button, Card, IconPlus, Tab, TabBar, Tabs } from '../components/ui'

const SyncReportButton = ({ disabled = false }: { disabled?: boolean }) => (
  <Button variant="primary" disabled={disabled} leadingIcon={<IconPlus />}>
    Sync report
  </Button>
)

export const DataCheckPage = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState('cropping')

  return (
    <AppShell
      header={{
        title: 'Data check',
        onBack: () => navigate(-1),
        actions: <SyncReportButton disabled />,
        tabs: (
          <Tabs value={tab} onValueChange={setTab}>
            <TabBar>
              <Tab value="cropping">Cropping (24)</Tab>
              <Tab value="operational">Operational (5)</Tab>
              <Tab value="manufacture">Manufacture fertiliser (10)</Tab>
              <Tab value="organic">Organic fertiliser (32)</Tab>
              <Tab value="soil">Soil (15)</Tab>
              <Tab value="livestock">Livestock data (48)</Tab>
              <Tab value="energy">Energy &amp; emissions (12)</Tab>
              <Tab value="water">Water usage (9)</Tab>
              <Tab value="contracts">Contracts (3)</Tab>
              <Tab value="invoices">Invoices &amp; receipts (104)</Tab>
            </TabBar>
          </Tabs>
        ),
      }}
      footer={<SyncReportButton disabled />}
    >
      <Card className="min-h-[420px]">
        <p className="text-text-secondary">
          Screen content for the “{tab}” tab. The tab bar lives in the header
          via <code>AppHeader.tabs</code>, so every screen can opt in without
          changing the shell.
        </p>
      </Card>
    </AppShell>
  )
}
