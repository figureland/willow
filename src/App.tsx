import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { PasscodeGate } from './components/auth/PasscodeGate'
import { AppWrapper } from './components/shell'
import { DataTablePage } from './pages/DataTablePage'
import { DesignSystemPage } from './pages/DesignSystemPage'
import { DataUploadWizard } from './pages/data-upload/DataUploadWizard'
import { PastUploadsPage } from './pages/data-upload/PastUploadsPage'
import { UploadSummaryPage } from './pages/data-upload/UploadSummaryPage'
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
import { ValidationErrorsPage } from './pages/validation-errors/ValidationErrorsPage'

export const App = () => (
  <PasscodeGate>
    <Toaster
      position="bottom-center"
      richColors
      toastOptions={{
        // Pin to the design-system type tokens so toasts match the rest of
        // the prototype's chrome. text-lg keeps the title comfortably above
        // the body default so the notification reads as bold and immediate.
        className:
          'text-lg tracking-[0.15px] font-sans border-2 border-border-tertiary',
      }}
    />
    {/* Dev-only Agentation overlay. Vite injects `import.meta.env.DEV`
        based on the build mode, so this disappears entirely from the
        production bundle. */}
    {/* {import.meta.env.DEV ? (
      <Agentation endpoint="http://localhost:4747" />
    ) : null} */}
    <Routes>
      <Route element={<AppWrapper />}>
        <Route path="/" element={<PlaceholderPage title="Home" />} />
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
        <Route path="/data-upload" element={<DataUploadWizard />} />
        <Route path="/data-upload/past" element={<PastUploadsPage />} />
        <Route
          path="/data-upload/past/:uploadId"
          element={<UploadSummaryPage />}
        />
        <Route path="/data-upload/:stepId" element={<DataUploadWizard />} />
        <Route
          path="/data-upload/:stepId/:panelId"
          element={<DataUploadWizard />}
        />
        <Route path="/design-system" element={<DesignSystemPage />} />
      </Route>
      <Route path="/validation" element={<ValidationErrorsPage />} />
      <Route
        path="/validation/:viewId"
        element={<Navigate to="/validation" replace />}
      />
      <Route
        path="/validation-errors"
        element={<Navigate to="/validation" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </PasscodeGate>
)

export default App
