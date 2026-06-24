import { Button } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Drafts                                                                      */
/* -------------------------------------------------------------------------- */

/** Step the draft will resume on — must match a wizard step id. */
export type DraftStepId =
  | 'upload'
  | 'review'
  | 'refine-data'
  | 'completeness'
  | 'anomaly-detection'
  | 'commit'

type Draft = {
  id: string
  title: string
  /** Human label for the stage the draft is currently sitting on. */
  stepLabel: string
  resumeAt: DraftStepId
  /** ISO date string for sorting / display. */
  updatedAt: string
}

const DRAFTS: Draft[] = [
  {
    id: 'draft-1',
    title: 'Spring 2026 planning',
    stepLabel: 'Refine data',
    resumeAt: 'refine-data',
    updatedAt: '2026-06-21',
  },
  {
    id: 'draft-2',
    title: 'Heron Lea soil samples',
    stepLabel: 'Completeness',
    resumeAt: 'completeness',
    updatedAt: '2026-06-14',
  },
  {
    id: 'draft-3',
    title: 'Q2 fertiliser totals',
    stepLabel: 'Commit',
    resumeAt: 'commit',
    updatedAt: '2026-06-09',
  },
]

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
  /** Resume an existing draft — wizard takes the user to its saved step. */
  onResumeDraft: (resumeAt: DraftStepId) => void
  /** Navigate to the past-uploads directory. */
  onViewPastUploads: () => void
}

export const IntroStep = ({
  onStartNew,
  onResumeDraft,
  onViewPastUploads,
}: IntroStepProps) => (
  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
    {/* Left: title + minimal description + start CTA */}
    <div className="flex flex-col gap-6 max-w-[480px]">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold leading-9 text-text-primary">
          Upload your farm data
        </h2>
        <p className="text-md text-text-secondary">
          Drop in your spreadsheets, PDFs or exports and Sandy will read them,
          line up what it found with your farms, and flag anything that needs a
          second look. You can pause and come back to any step.
        </p>
      </div>
      <div>
        <Button variant="primary" onClick={onStartNew}>
          Start a new upload
        </Button>
      </div>
    </div>

    {/* Right: drafts list */}
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-text-primary">
        Pick up where you left off
      </h3>
      {DRAFTS.length === 0 ? (
        <p className="text-md text-text-secondary">
          No drafts yet — your in-progress uploads will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {DRAFTS.map((draft) => (
            <li
              key={draft.id}
              className="flex items-center gap-6 rounded-xl border-2 border-border-tertiary bg-bg-primary px-6 py-5"
            >
              <div className="flex flex-1 min-w-0 flex-col gap-2">
                <p className="text-md font-semibold text-text-primary truncate">
                  {draft.title}
                </p>
                <p className="text-sm text-text-secondary">
                  {draft.stepLabel} · edited {formatRelative(draft.updatedAt)}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => onResumeDraft(draft.resumeAt)}
              >
                Resume
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onViewPastUploads}
          className="text-sm font-semibold text-text-brand-dark rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40 hover:underline"
        >
          View all past uploads →
        </button>
      </div>
    </div>
  </div>
)
