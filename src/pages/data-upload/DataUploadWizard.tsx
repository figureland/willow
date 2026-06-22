import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { WizardLayout, type WizardStepConfig } from '../../components/ui'
import { AnomalyDetectionStep } from './AnomalyDetectionStep'
import { CheckDataStep } from './CheckDataStep'
import { CommitStep } from './CommitStep'
import { CompletenessStep } from './CompletenessStep'
import { IssueResolverModal } from './IssueResolverModal'
import { MOCK_ISSUES } from './issues'
import { ReviewStep } from './ReviewStep'
import { UploadStep } from './UploadStep'

const BASE_STEP_IDS = [
  'upload',
  'review',
  'check-data',
  'completeness',
  'anomaly-detection',
  'commit',
] as const

export const DATA_UPLOAD_BASE = '/data-upload'
export const DATA_UPLOAD_STEP_IDS = BASE_STEP_IDS as readonly string[]

/**
 * /data-upload/:stepId — six-step data upload flow. Each step is a real
 * route segment, so browser back/forward, history scrubbing and deep
 * links work natively. The bare `/data-upload` URL redirects to the first
 * step; unknown step ids fall through to the same redirect.
 */
export const DataUploadWizard = () => {
  const navigate = useNavigate()
  const { stepId } = useParams<{ stepId?: string }>()

  // The issue-resolver modal is owned here so the Review step's "Review N
  // issues" Continue button can open it without the step needing direct
  // access to the wizard's navigation. When the user finishes the modal we
  // advance to the next step automatically.
  const [issuesOpen, setIssuesOpen] = useState(false)
  const advanceFromReview = () => {
    navigate(`${DATA_UPLOAD_BASE}/check-data`)
  }

  const steps: WizardStepConfig[] = useMemo(
    () => [
      {
        id: 'upload',
        label: 'Add documents',
        content: <UploadStep />,
      },
      {
        id: 'review',
        label: 'Review',
        content: <ReviewStep />,
        continueLabel: `Review ${MOCK_ISSUES.length} issues`,
        onContinue: () => {
          setIssuesOpen(true)
          // Don't advance — the modal will navigate us forward on finish.
          return false
        },
      },
      {
        id: 'check-data',
        label: 'Check data',
        content: <CheckDataStep />,
      },
      {
        id: 'completeness',
        label: 'Completeness',
        content: <CompletenessStep />,
      },
      {
        id: 'anomaly-detection',
        label: 'Anomaly detection',
        content: <AnomalyDetectionStep />,
      },
      {
        id: 'commit',
        label: 'Commit',
        content: <CommitStep />,
        hideContinue: true,
      },
    ],
    [],
  )

  // Redirect missing or unknown step ids to the first step. We do this in an
  // effect (instead of returning <Navigate>) so the redirect is itself a
  // history replace — back from a deeper step still works.
  const known = stepId !== undefined && DATA_UPLOAD_STEP_IDS.includes(stepId)
  useEffect(() => {
    if (!known) {
      navigate(`${DATA_UPLOAD_BASE}/${steps[0].id}`, { replace: true })
    }
  }, [known, navigate, steps])

  const exit = () => navigate('/')

  return (
    <>
      <WizardLayout
        title="Upload data"
        steps={steps}
        currentStepId={known ? stepId : steps[0].id}
        onNavigate={(next) => navigate(`${DATA_UPLOAD_BASE}/${next}`)}
        onCancel={exit}
        onSaveAndQuit={exit}
        onComplete={exit}
        finishLabel="Finish upload"
      />
      <IssueResolverModal
        open={issuesOpen}
        onOpenChange={setIssuesOpen}
        issues={MOCK_ISSUES}
        onComplete={() => {
          setIssuesOpen(false)
          advanceFromReview()
        }}
      />
    </>
  )
}
