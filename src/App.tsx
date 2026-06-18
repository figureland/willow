import { Navigate, Route, Routes } from 'react-router-dom'
import { PasscodeGate } from './components/auth/PasscodeGate'
import { AppWrapper } from './components/shell'
import { DataCheckPage } from './pages/DataCheckPage'
import { DataTablePage } from './pages/DataTablePage'
import { DesignSystemPage } from './pages/DesignSystemPage'
import {
  FarmFieldsAndCrops,
  FarmLayout,
  FarmOperations,
  FarmOverview,
  FarmUploads,
  MyFarmsIndex,
  MyFarmsLayout,
  OrganisationOverview,
} from './pages/my-farms'
import { PlaceholderPage } from './pages/PlaceholderPage'

export const App = () => (
  <PasscodeGate>
    <Routes>
      <Route element={<AppWrapper />}>
        <Route path="/" element={<DataCheckPage />} />
        <Route
          path="/sustainability"
          element={<PlaceholderPage title="Sustainability" />}
        />
        <Route
          path="/opportunities"
          element={<PlaceholderPage title="Opportunities" />}
        />
        <Route path="/ncvm" element={<PlaceholderPage title="NCVM" />} />
        <Route
          path="/sandy-setup"
          element={<PlaceholderPage title="Sandy setup" />}
        />
        <Route
          path="/sandy-ai"
          element={<PlaceholderPage title="Sandy AI agents" />}
        />

        <Route path="/my-farms" element={<MyFarmsLayout />}>
          <Route index element={<MyFarmsIndex />} />
          <Route path=":orgId" element={<OrganisationOverview />} />
        </Route>

        {/*
         * Each farm is its own landing page with title bar + tab bar, so it
         * sits OUTSIDE the MyFarmsLayout outlet (the layout's outer chrome
         * only applies to the top-level org switcher view).
         */}
        <Route path="/my-farms/:orgId/:farmId" element={<FarmLayout />}>
          <Route index element={<FarmOverview />} />
          <Route path="fields-and-crops" element={<FarmFieldsAndCrops />} />
          <Route
            path="fields-and-crops/:fieldId"
            element={<FarmFieldsAndCrops />}
          />
          <Route path="operations" element={<FarmOperations />} />
          <Route path="uploads" element={<FarmUploads />} />
        </Route>

        <Route path="/data-table" element={<DataTablePage />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </PasscodeGate>
)

export default App
