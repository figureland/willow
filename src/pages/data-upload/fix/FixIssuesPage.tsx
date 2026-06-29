import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, SegmentedControl } from '../../../components/ui'
import { DataTableView } from './DataTableView'
import { FieldView } from './FieldView'
import { useFixState } from './fix-state'
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
  { message: 'Processing your files…', durationMs: 900 },
  { message: 'Loading 5 farms…', durationMs: 900 },
  { message: 'Loading 781 fields…', durationMs: 1100 },
  { message: 'Reading 26,211 records…', durationMs: 1400 },
  { message: 'Resolving 17 issues…', durationMs: 1400 },
  { message: 'Preparing your data…', durationMs: 800 },
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

type FixView = 'issue' | 'data' | 'field'

const VIEW_OPTIONS = [
  { value: 'issue' as const, label: 'Issue Type' },
  { value: 'data' as const, label: 'Data Table' },
  { value: 'field' as const, label: 'Field' },
]

const DEFAULT_VIEW: FixView = 'issue'

const isFixView = (v: string | null): v is FixView =>
  v === 'issue' || v === 'data' || v === 'field'

type SeverityFilter = 'all' | 'blocking' | 'warning'

const SEVERITY_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'blocking' as const, label: 'Blocking' },
  { value: 'warning' as const, label: 'Warning' },
]

const isSeverityFilter = (v: string | null): v is SeverityFilter =>
  v === 'all' || v === 'blocking' || v === 'warning'

const FixPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawView = searchParams.get('view')
  const view: FixView = isFixView(rawView) ? rawView : DEFAULT_VIEW
  const setView = (next: FixView) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', next)
    setSearchParams(params, { replace: true })
  }

  const rawSeverity = searchParams.get('severity')
  const severity: SeverityFilter = isSeverityFilter(rawSeverity)
    ? rawSeverity
    : 'all'
  const setSeverity = (next: SeverityFilter) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('severity')
    else params.set('severity', next)
    setSearchParams(params, { replace: true })
  }

  const { hasUnsavedChanges, saveChanges, discardChanges } = useFixState()

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-3 border-b-2 border-border-tertiary bg-bg-primary px-8 py-3">
        <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">
            Severity:
          </span>
          <SegmentedControl<SeverityFilter>
            ariaLabel="Filter by severity"
            options={SEVERITY_OPTIONS}
            value={severity}
            onValueChange={setSeverity}
          />
        </div>
        {hasUnsavedChanges ? (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" onClick={discardChanges}>
              Discard changes
            </Button>
            <Button variant="primary" onClick={saveChanges}>
              Save changes
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 min-h-0 flex-col">
        {view === 'issue' ? (
          <div className="flex-1 overflow-auto">
            <IssuesView />
          </div>
        ) : null}
        {view === 'data' ? (
          <div className="flex-1 overflow-auto">
            <DataTableView />
          </div>
        ) : null}
        {view === 'field' ? <FieldView /> : null}
      </div>
    </div>
  )
}
