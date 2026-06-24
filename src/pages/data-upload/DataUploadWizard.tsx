import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { WizardLayout, type WizardStepConfig } from '../../components/ui'
import { AnomalyDetectionStep } from './AnomalyDetectionStep'
import { CategoriseFilesModal } from './CategoriseFilesModal'
import { CheckDataStep } from './CheckDataStep'
import { CommitStep } from './CommitStep'
import { CompletenessStep } from './CompletenessStep'
import { IntroStep } from './IntroStep'
import type { IssueState } from './IssueResolverModal'
import { IssueResolverModal } from './IssueResolverModal'
import { EXISTING_FARMS, EXISTING_FIELDS, type Issue } from './issues'
import { ReviewStep } from './ReviewStep'
import { generateSummary } from './summary'
import { type UploadedFile, UploadStep } from './UploadStep'

const BASE_STEP_IDS = [
  'upload',
  'review',
  'refine-data',
  'completeness',
  'anomaly-detection',
  'commit',
] as const

const START_STEP_ID = 'start'

export const DATA_UPLOAD_BASE = '/data-upload'
export const DATA_UPLOAD_STEP_IDS = [
  START_STEP_ID,
  ...BASE_STEP_IDS,
] as readonly string[]

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
    navigate(`${DATA_UPLOAD_BASE}/refine-data`)
  }

  // Generate the detection summary once for the wizard's lifetime. Drives
  // both the Review step's display and the issue resolver — counts and
  // error lists stay in sync.
  const summary = useMemo(() => generateSummary(), [])

  // Build issues from the per-farm errors. Unrecognised farms become
  // farm-missing issues. For unknown fields we collapse anything per-farm
  // with 2+ entries into a single field-missing-batch issue (demonstrates
  // the "one decision for many fields" flow); single field errors stay as
  // standalone field-missing issues.
  const issues: Issue[] = useMemo(() => {
    const out: Issue[] = []
    for (const farm of summary.farmRows) {
      const errs = farm.errors ?? []
      const fieldNames: string[] = []
      for (let i = 0; i < errs.length; i++) {
        const err = errs[i]
        const sourceMatch = err.match(/"([^"]+)"/)
        const sourceName = sourceMatch?.[1] ?? err
        if (err.startsWith('Farm "')) {
          out.push({
            id: `${farm.id}-farm`,
            type: 'farm-missing',
            title: 'Farm not recognised',
            sourceName,
            existingFarms: EXISTING_FARMS,
          })
        } else {
          fieldNames.push(sourceName)
        }
      }
      if (fieldNames.length >= 2) {
        out.push({
          id: `${farm.id}-fields-batch`,
          type: 'field-missing-batch',
          title: 'Fields not recognised',
          sourceNames: fieldNames,
          suggestedFarmName: farm.name,
          existingFarms: EXISTING_FARMS,
        })
      } else {
        for (let i = 0; i < fieldNames.length; i++) {
          out.push({
            id: `${farm.id}-err-${i}`,
            type: 'field-missing',
            title: 'Field not recognised',
            sourceName: fieldNames[i],
            farmName: farm.name,
            existingFields: EXISTING_FIELDS,
          })
        }
      }
    }
    return out
  }, [summary])

  // Lifted resolver state lets the IssuesTable show resolved/ignored marks
  // outside the modal. The modal writes to this map; the table reads from it.
  const [issueState, setIssueState] = useState<Record<string, IssueState>>({})
  const [focusIssueId, setFocusIssueId] = useState<string | null>(null)

  const resolvedCount = issues.filter((i) => {
    const s = issueState[i.id]
    if (!s) return false
    const k = s.resolution.kind
    if (k === 'pending' || k === 'ignore') return false
    if (k === 'match-existing' && !s.resolution.value) return false
    return true
  }).length
  const remaining = issues.length - resolvedCount
  const continueLabel =
    remaining === 0
      ? 'Continue'
      : `Fix ${remaining} ${remaining === 1 ? 'issue' : 'issues'}`

  // Lifted out of UploadStep so the wizard footer can gate Continue on at
  // least one file having been added and finished analysing.
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const canContinueUpload =
    uploadedFiles.length > 0 && uploadedFiles.every((f) => f.status === 'ready')

  // Categorise-files modal — pops up after Continue on the Upload step and
  // gates the move into Review until the user confirms a data category for
  // each file.
  const [categoriseOpen, setCategoriseOpen] = useState(false)

  // Once files are in, the Continue label reflects how many will move forward.
  // Before any files land we fall back to the generic "Continue" so the
  // disabled state doesn't read as "Continue with 0 files".
  const uploadContinueLabel =
    uploadedFiles.length > 0
      ? `Continue with ${uploadedFiles.length} ${
          uploadedFiles.length === 1 ? 'file' : 'files'
        }`
      : undefined

  const steps: WizardStepConfig[] = useMemo(
    () => [
      {
        id: 'upload',
        label: 'Add documents',
        content: <UploadStep onFilesChange={setUploadedFiles} />,
        canContinue: canContinueUpload,
        continueLabel: uploadContinueLabel,
        onContinue: () => {
          setCategoriseOpen(true)
          // Don't advance — the modal owns the navigation forward.
          return false
        },
      },
      {
        id: 'review',
        label: 'Review',
        content: (
          <ReviewStep
            summary={summary}
            fileNames={uploadedFiles.map((f) => f.name)}
            issues={issues}
            issueState={issueState}
            onIssueClick={(id) => {
              setFocusIssueId(id)
              setIssuesOpen(true)
            }}
          />
        ),
        continueLabel,
        onContinue: () => {
          // If everything is already resolved/ignored, let the wizard advance
          // normally. Otherwise open the resolver so the user can finish.
          if (remaining === 0) return
          setFocusIssueId(null)
          setIssuesOpen(true)
          return false
        },
      },
      {
        id: 'refine-data',
        label: 'Refine data',
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
    [
      summary,
      continueLabel,
      canContinueUpload,
      uploadedFiles,
      uploadContinueLabel,
      issues,
      issueState,
      remaining,
    ],
  )

  // Redirect missing or unknown step ids to the start step. We do this in an
  // effect (instead of returning <Navigate>) so the redirect is itself a
  // history replace — back from a deeper step still works.
  const known = stepId !== undefined && DATA_UPLOAD_STEP_IDS.includes(stepId)
  useEffect(() => {
    if (!known) {
      navigate(`${DATA_UPLOAD_BASE}/${START_STEP_ID}`, { replace: true })
    }
  }, [known, navigate])

  const exit = () => navigate('/my-farms')

  // The start step takes over the whole page — no top bar, no stepper, no
  // footer. The wizard chrome only appears once the user begins a new upload
  // or resumes a draft.
  if (!known || stepId === START_STEP_ID) {
    return (
      <div className="flex flex-1 flex-col p-8">
        <IntroStep
          onStartNew={() => navigate(`${DATA_UPLOAD_BASE}/${steps[0].id}`)}
          onResumeDraft={(next) => navigate(`${DATA_UPLOAD_BASE}/${next}`)}
          onViewPastUploads={() => navigate(`${DATA_UPLOAD_BASE}/past`)}
        />
      </div>
    )
  }

  return (
    <>
      <WizardLayout
        title="Upload data"
        steps={steps}
        currentStepId={stepId}
        onNavigate={(next) => navigate(`${DATA_UPLOAD_BASE}/${next}`)}
        onCancel={exit}
        onSaveAndQuit={exit}
        onComplete={exit}
        finishLabel="Finish upload"
      />
      <IssueResolverModal
        open={issuesOpen}
        onOpenChange={setIssuesOpen}
        issues={issues}
        state={issueState}
        onStateChange={setIssueState}
        focusIssueId={focusIssueId}
        onComplete={() => {
          setIssuesOpen(false)
          // Only auto-advance when the user came in via the wizard footer
          // (i.e. they want to push forward). Per-row clicks just close.
          if (focusIssueId === null) advanceFromReview()
        }}
      />
      <CategoriseFilesModal
        open={categoriseOpen}
        onOpenChange={setCategoriseOpen}
        files={uploadedFiles}
        onConfirm={() => {
          setCategoriseOpen(false)
          navigate(`${DATA_UPLOAD_BASE}/review`)
        }}
      />
    </>
  )
}
