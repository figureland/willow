import { PasscodeGate } from './components/auth/PasscodeGate'

export const App = () => (
  <PasscodeGate>
    <main className="min-h-full grid place-items-center px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Willow
        </h1>
        <p className="text-sm text-neutral-500">
          You're in. Build something good.
        </p>
      </div>
    </main>
  </PasscodeGate>
)

export default App
