import { useEffect, useState } from 'react'
import type { IssueState } from './issue-state'
import type { Issue } from './issues'
import { RefinePage } from './refine/RefinePage'
import type { DetectionSummary } from './summary'

export type ReviewStepProps = {
  summary: DetectionSummary
  issues: Issue[]
  issueState: Record<string, IssueState>
  onIssueStateChange: (next: Record<string, IssueState>) => void
  /** File count from the previous step — drives the loader copy. */
  fileCount: number
}

/**
 * Module-scope latch — once the loader has played in this browser session,
 * subsequent visits to the Refine step skip straight to the page. Resets on
 * full page refresh, which is what we want for the prototype.
 */
let hasSeenLoader = false

/** Refine step — short loader, then full-page carousel of refine panels. */
export const ReviewStep = ({
  summary,
  issues,
  issueState,
  onIssueStateChange,
  fileCount,
}: ReviewStepProps) => {
  const [loading, setLoading] = useState(() => !hasSeenLoader)

  useEffect(() => {
    if (!loading) return
    const t = window.setTimeout(() => {
      hasSeenLoader = true
      setLoading(false)
    }, 5000)
    return () => window.clearTimeout(t)
  }, [loading])

  if (loading) return <RefineLoader fileCount={fileCount} />

  return (
    <RefinePage
      summary={summary}
      issues={issues}
      state={issueState}
      onStateChange={onIssueStateChange}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* RefineLoader — same shape as FixLoader / CommitProgress (3 pulsing dots +  */
/* a status line). Holds for ~5s before handing over to the Refine page.       */
/* -------------------------------------------------------------------------- */

const RefineLoader = ({ fileCount }: { fileCount: number }) => (
  <div className="flex flex-1 min-h-0 items-center justify-center bg-bg-primary px-8 py-16">
    <div className="flex max-w-[480px] flex-col items-center gap-6 text-center">
      <ThinkingDots />
      <p
        aria-live="polite"
        className="refine-loader-message text-md text-text-secondary"
      >
        Processing {fileCount.toLocaleString()}{' '}
        {fileCount === 1 ? 'file' : 'files'}…
      </p>
      <style>{`
        @keyframes refine-loader-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
        .refine-loader-dot {
          animation: refine-loader-dot 1.2s ease-in-out infinite;
        }
        @keyframes refine-loader-fade {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .refine-loader-message {
          animation: refine-loader-fade 250ms ease-out;
        }
      `}</style>
    </div>
  </div>
)

const ThinkingDots = () => (
  <div className="flex items-center gap-2" aria-hidden="true">
    <span
      className="refine-loader-dot size-3 rounded-full bg-sandy-400"
      style={{ animationDelay: '0s' }}
    />
    <span
      className="refine-loader-dot size-3 rounded-full bg-sandy-400"
      style={{ animationDelay: '0.2s' }}
    />
    <span
      className="refine-loader-dot size-3 rounded-full bg-sandy-400"
      style={{ animationDelay: '0.4s' }}
    />
  </div>
)
