import { Button } from '../../components/ui'
import { type DraftSession, useDraftSessions } from './draft-sessions'

/* -------------------------------------------------------------------------- */
/* Drafts                                                                      */
/* -------------------------------------------------------------------------- */

/** Step the draft will resume on — must match a wizard step id. */
export type DraftStepId =
  | 'add-files'
  | 'refine'
  | 'fix'
  | 'completeness'
  | 'anomaly-detection'
  | 'commit'

const STEP_LABELS: Record<DraftStepId, string> = {
  'add-files': 'Add documents',
  refine: 'Refine',
  fix: 'Fix issues',
  completeness: 'Completeness',
  'anomaly-detection': 'Anomaly detection',
  commit: 'Commit',
}

const formatRelative = (iso: string): string => {
  const then = new Date(iso)
  const days = Math.round((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.round(days / 7)} weeks ago`
  return then.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export type IntroStepProps = {
  /** Begin a brand-new upload — wizard enters at the Add documents step. */
  onStartNew: () => void
  /** Resume an existing draft — caller routes to the saved step + session. */
  onResumeDraft: (draft: DraftSession) => void
  /** Navigate to the past-uploads directory. */
  onViewPastUploads: () => void
}

export const IntroStep = ({
  onStartNew,
  onResumeDraft,
  onViewPastUploads,
}: IntroStepProps) => {
  const drafts = useDraftSessions()
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-16 px-4 pb-12 pt-16">
      {/* Hero — large title, short subtitle, single primary CTA */}
      <section className="flex flex-col items-start gap-6">
        <h1 className="text-5xl font-medium leading-[1.05] tracking-tight text-text-primary">
          Upload your farm data
        </h1>
        <p className="max-w-[560px] text-lg text-text-secondary">
          Drop in spreadsheets, PDFs or exports. Sandy reads them, lines them up
          with your farms, and flags anything that needs a second look.
        </p>
        <Button variant="primary" onClick={onStartNew}>
          Start a new upload
        </Button>
      </section>

      {/* Drafts — quiet secondary section */}
      <section className="flex flex-col gap-3 border-t-2 border-border-tertiary pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-md font-semibold uppercase tracking-wide text-text-secondary">
            Pick up where you left off
          </h2>
          <button
            type="button"
            onClick={onViewPastUploads}
            className="rounded-sm text-sm font-semibold text-text-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
          >
            View all past uploads →
          </button>
        </div>
        {drafts.length === 0 ? (
          <p className="text-md text-text-secondary">
            No drafts yet — your in-progress uploads will appear here.
          </p>
        ) : (
          <ul className="flex flex-col">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="border-b border-border-tertiary last:border-0"
              >
                <button
                  type="button"
                  onClick={() => onResumeDraft(draft)}
                  className="group flex w-full items-center justify-between gap-6 px-1 py-4 text-left transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
                >
                  <div className="flex flex-1 min-w-0 flex-col gap-1">
                    <p className="truncate text-lg font-medium text-text-primary">
                      {draft.title}
                    </p>
                    <p className="text-sm text-text-secondary">
                      <span>{STEP_LABELS[draft.resumeAt]}</span>
                      <span aria-hidden="true" className="mx-2">
                        ·
                      </span>
                      <span>edited {formatRelative(draft.updatedAt)}</span>
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-md font-semibold text-text-secondary transition-colors group-hover:text-text-primary"
                  >
                    Resume →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
