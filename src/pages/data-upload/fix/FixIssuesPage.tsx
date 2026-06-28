import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, SegmentedControl } from '../../../components/ui'
import { CroppingTableView } from './CroppingTableView'
import { FieldView } from './FieldView'
import { IssuesView } from './IssuesView'

/* -------------------------------------------------------------------------- */
/* FixIssuesPage — loader → intro → tabbed page                                */
/* -------------------------------------------------------------------------- */

/**
 * Module-scope latch — once the user has been shown the loader + intro in
 * this browser session, subsequent visits to the Fix step skip straight to
 * the page. Resets on full page refresh, which is what we want for the
 * prototype.
 */
let hasSeenIntro = false

const setSeen = () => {
  hasSeenIntro = true
}

type Stage = 'loading' | 'intro' | 'page'

export const FixIssuesPage = () => {
  const [stage, setStage] = useState<Stage>(() =>
    hasSeenIntro ? 'page' : 'loading',
  )

  if (stage === 'loading') {
    return (
      <FixLoader
        onDone={() => {
          setStage('intro')
        }}
      />
    )
  }
  if (stage === 'intro') {
    return (
      <FixIntro
        onContinue={() => {
          setSeen()
          setStage('page')
        }}
      />
    )
  }
  return <FixPage />
}

/* -------------------------------------------------------------------------- */
/* Loader — pulsing graphic + cycling status line                              */
/* -------------------------------------------------------------------------- */

type LoaderStep = { message: string; durationMs: number }

const LOADER_STEPS: LoaderStep[] = [
  { message: 'Processing your files…', durationMs: 2500 },
  { message: 'Loading 5 farms…', durationMs: 2500 },
  { message: 'Loading 781 fields…', durationMs: 3000 },
  { message: 'Reading 26,211 records…', durationMs: 4000 },
  { message: 'Resolving 17 issues…', durationMs: 4000 },
  { message: 'Preparing your data…', durationMs: 2000 },
]

const FixLoader = ({ onDone }: { onDone: () => void }) => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (index >= LOADER_STEPS.length) {
      onDone()
      return
    }
    const step = LOADER_STEPS[index]
    const t = window.setTimeout(() => setIndex((i) => i + 1), step.durationMs)
    return () => window.clearTimeout(t)
  }, [index, onDone])

  const current = LOADER_STEPS[Math.min(index, LOADER_STEPS.length - 1)]

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center bg-bg-secondary px-8 py-16">
      <div className="flex max-w-[480px] flex-col items-center gap-6 text-center">
        <ThinkingDots />
        {/*
         * Crossfade between messages — keyed on the message so React
         * remounts the <p>, replaying the animation. `aria-live="polite"`
         * so screen readers announce each new line without interrupting.
         */}
        <p
          key={current.message}
          aria-live="polite"
          className="fix-loader-message text-md text-text-secondary"
        >
          {current.message}
        </p>
        <style>{`
          @keyframes fix-loader-dot {
            0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
            40% { opacity: 1; transform: scale(1); }
          }
          .fix-loader-dot {
            animation: fix-loader-dot 1.2s ease-in-out infinite;
          }
          @keyframes fix-loader-fade {
            from { opacity: 0; transform: translateY(2px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fix-loader-message {
            animation: fix-loader-fade 250ms ease-out;
          }
        `}</style>
      </div>
    </div>
  )
}

/** Three pulsing dots — minimal, brand-neutral. */
const ThinkingDots = () => (
  <div className="flex items-center gap-2" aria-hidden="true">
    <span
      className="fix-loader-dot size-3 rounded-full bg-text-brand-dark"
      style={{ animationDelay: '0s' }}
    />
    <span
      className="fix-loader-dot size-3 rounded-full bg-text-brand-dark"
      style={{ animationDelay: '0.2s' }}
    />
    <span
      className="fix-loader-dot size-3 rounded-full bg-text-brand-dark"
      style={{ animationDelay: '0.4s' }}
    />
  </div>
)

/* -------------------------------------------------------------------------- */
/* Intro — handoff between loader and the Fix page proper                      */
/* -------------------------------------------------------------------------- */

const FixIntro = ({ onContinue }: { onContinue: () => void }) => (
  <div className="flex flex-1 min-h-0 items-center justify-center bg-bg-secondary px-8 py-16">
    <div className="flex max-w-[520px] flex-col items-center gap-6 text-center">
      <h1 className="text-3xl font-semibold text-text-primary">
        We've processed your data
      </h1>
      <p className="text-md leading-relaxed text-text-secondary">
        We picked up a few issues that we couldn't resolve automatically. Let's
        go through them together.
      </p>
      <Button variant="primary" onClick={onContinue}>
        Review issues
      </Button>
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Page — the real Fix step body, shown once the user dismisses the intro     */
/* -------------------------------------------------------------------------- */

type FixView = 'issue' | 'cropping' | 'field'

const VIEW_OPTIONS = [
  { value: 'issue' as const, label: 'Issue Type' },
  { value: 'cropping' as const, label: 'Cropping Table' },
  { value: 'field' as const, label: 'Field' },
]

const DEFAULT_VIEW: FixView = 'issue'

const isFixView = (v: string | null): v is FixView =>
  v === 'issue' || v === 'cropping' || v === 'field'

const FixPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('view')
  const view: FixView = isFixView(raw) ? raw : DEFAULT_VIEW
  const setView = (next: FixView) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b-2 border-border-tertiary bg-bg-primary px-8 py-3">
        <span className="text-sm font-medium text-text-secondary">
          Group issues by:
        </span>
        <SegmentedControl<FixView>
          ariaLabel="Group issues by"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={setView}
        />
      </div>
      <div className="flex flex-1 min-h-0 flex-col">
        {view === 'issue' ? (
          <div className="flex-1 overflow-auto">
            <IssuesView />
          </div>
        ) : null}
        {view === 'cropping' ? (
          <div className="flex-1 overflow-auto">
            <CroppingTableView />
          </div>
        ) : null}
        {view === 'field' ? <FieldView /> : null}
      </div>
    </div>
  )
}
