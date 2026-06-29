import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { WizardLayout, type WizardStepConfig } from '../../components/ui'
import { AnomalyDetectionStep } from './AnomalyDetectionStep'
import { CommitStep } from './CommitStep'
import { CompletenessStep } from './CompletenessStep'
import { FixIssuesPage } from './fix/FixIssuesPage'
import { IntroStep } from './IntroStep'
import type { IssueState } from './IssueResolverModal'
import { EXISTING_FARMS, EXISTING_FIELDS, type Issue } from './issues'
import { ReviewStep } from './ReviewStep'
import { SaveAndQuitModal } from './SaveAndQuitModal'
import { generateSummary } from './summary'
import { UploadStep, type UploadSummary } from './UploadStep'
import { CANONICAL_VOCAB, MOCK_VALUE_MAPPING_FIXTURES } from './value-mapping'

const BASE_STEP_IDS = [
  'add-files',
  'refine',
  'fix',
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
 * Names coming out of the (mock) upload are deliberately typo'd so the demo
 * surfaces the "did you mean…" suggestion path. The clean reference name
 * still lives on EXISTING_FARMS / EXISTING_FIELDS for the suggestion.
 */
const typo = (name: string): string => {
  const cleaned = name.trimEnd()
  const drop = Math.min(cleaned.length - 1, 2 + (cleaned.length % 3))
  return cleaned.slice(0, cleaned.length - drop).replace(/\s+$/, '')
}

/**
 * /data-upload/:stepId — six-step data upload flow. Each step is a real
 * route segment, so browser back/forward, history scrubbing and deep
 * links work natively. The bare `/data-upload` URL redirects to the first
 * step; unknown step ids fall through to the same redirect.
 */
export const DataUploadWizard = () => {
  const navigate = useNavigate()
  const { stepId } = useParams<{ stepId?: string }>()

  // Generate the detection summary once for the wizard's lifetime. Drives
  // both the Review step's display and the issue resolver — counts and
  // error lists stay in sync.
  const summary = useMemo(() => generateSummary(), [])

  // Build issues from the per-farm errors. Unrecognised farms become
  // farm-missing issues. For unknown fields we collapse anything per-farm
  // with 2+ entries into a single field-missing-batch issue (demonstrates
  // the "one decision for many fields" flow); single field errors stay as
  // standalone field-missing issues.
  //
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
            sourceName: typo(sourceName),
            // Pop the clean original name into the suggestion list so the
            // "Did you mean" pick lands on something obviously similar.
            existingFarms: [
              { value: `synthetic-${farm.id}-farm`, label: sourceName },
              ...EXISTING_FARMS,
            ],
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
          sourceNames: fieldNames.map(typo),
          suggestedFarmName: farm.name,
          existingFarms: EXISTING_FARMS,
        })
      } else {
        for (let i = 0; i < fieldNames.length; i++) {
          const original = fieldNames[i]
          // Seed the suggestion list with the original (non-typo'd) name
          // first so closestOption snaps to a realistic near-twin instead
          // of grabbing whatever's lexicographically nearby in EXISTING_FIELDS.
          out.push({
            id: `${farm.id}-err-${i}`,
            type: 'field-missing',
            title: 'Field not recognised',
            sourceName: typo(original),
            farmName: farm.name,
            existingFields: [
              { value: `synthetic-${farm.id}-${i}`, label: original },
              ...EXISTING_FIELDS,
            ],
          })
        }
      }
    }

    // Schema-transformation demo issues — one per sheet of the example
    // workbook. In a real implementation Sandy would emit one of these for
    // any uploaded file it can't parse against the canonical schema.
    for (const sheetName of ['PRD_Fertilizers', 'PRD_Chemicals']) {
      out.push({
        id: `schema-${sheetName}`,
        type: 'schema-transformation',
        title: 'File structure',
        filename: 'xfarm-operations-export.xlsx',
        sheetName,
        dataCategory: 'Operations',
      })
    }

    // Value-mapping demo issues — one per (category, column) pair from the
    // mock fixtures. Wired from the shared MOCK_VALUE_MAPPING_FIXTURES so
    // edits to that file drive the whole demo.
    for (const fixture of MOCK_VALUE_MAPPING_FIXTURES) {
      out.push({
        id: `values-${fixture.category}-${fixture.sourceColumn}`,
        type: 'value-mapping',
        title: 'Help us understand your values',
        category: fixture.category,
        sourceColumn: fixture.sourceColumn,
        targetLabel: fixture.targetLabel,
        sourceValues: fixture.values,
        canonicalOptions: CANONICAL_VOCAB[fixture.category],
      })
    }

    return out
  }, [summary])

  // Per-issue resolution state, owned by the wizard so it persists across
  // step navigation. The inbox in the Refine step is the only writer.
  const [issueState, setIssueState] = useState<Record<string, IssueState>>({})

  // Lifted out of UploadStep so the wizard footer can read the per-file
  // scan / issue summary and react accordingly.
  const [uploadSummary, setUploadSummary] = useState<UploadSummary>({
    files: [],
    issueCount: 0,
    anyProcessed: false,
    allProcessed: false,
    reprocessing: false,
  })
  // Bump this counter to ask UploadStep to open its review modal at the
  // first issue. (Effect inside the step watches the prop.)
  const [reviewRequestToken, setReviewRequestToken] = useState(0)
  const fileCount = uploadSummary.files.length
  // Continue label switches into "Review X issues" when something needs the
  // user's attention. While the simulated scan is still running we show
  // "Processing files…" rather than committing to either copy too early.
  const uploadContinueLabel =
    fileCount === 0
      ? undefined
      : uploadSummary.reprocessing || !uploadSummary.allProcessed
        ? 'Processing files…'
        : uploadSummary.issueCount > 0
          ? `Review ${uploadSummary.issueCount} ${
              uploadSummary.issueCount === 1 ? 'issue' : 'issues'
            }`
          : `Continue with ${fileCount} ${fileCount === 1 ? 'file' : 'files'}`
  // Continue is only blocked outright when nothing has been uploaded or a
  // re-scan is mid-flight. When issues exist, the button stays clickable
  // (and triggers the review modal instead of advancing).
  const uploadContinueDisabled =
    fileCount === 0 || uploadSummary.reprocessing || !uploadSummary.allProcessed

  const steps: WizardStepConfig[] = useMemo(
    () => [
      {
        id: 'add-files',
        label: 'Add files',
        content: (
          <UploadStep
            onSummaryChange={setUploadSummary}
            reviewRequestToken={reviewRequestToken}
          />
        ),
        canContinue: !uploadContinueDisabled,
        continueLabel: uploadContinueLabel,
        onContinue: () => {
          // Issues outstanding → open the review modal instead of
          // advancing. Returning `false` keeps the wizard on this step.
          if (uploadSummary.issueCount > 0) {
            setReviewRequestToken((t) => t + 1)
            return false
          }
          return true
        },
      },
      {
        id: 'refine',
        label: 'Refine',
        content: (
          <ReviewStep
            summary={summary}
            issues={issues}
            issueState={issueState}
            onIssueStateChange={setIssueState}
          />
        ),
        // The Refine step renders its own carousel chrome + advance buttons,
        // and we now show Next in the wizard top bar — nothing to suppress
        // at the layout level.
        bare: true,
      },
      {
        id: 'fix',
        label: 'Fix issues',
        content: <FixIssuesPage />,
        bare: true,
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
      uploadContinueDisabled,
      uploadContinueLabel,
      uploadSummary.issueCount,
      reviewRequestToken,
      summary,
      issues,
      issueState,
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

  const [saveQuitOpen, setSaveQuitOpen] = useState(false)
  // Prototype heuristic — once files have been uploaded we offer a sample
  // session name. Otherwise the user can save as Untitled.
  const suggestedSessionName =
    uploadSummary.files.length > 0 ? '2025/26 Cropping' : 'Untitled'

  // The start step takes over the whole page — no top bar, no stepper, no
  // footer. The wizard chrome only appears once the user begins a new upload
  // or resumes a draft.
  if (!known || stepId === START_STEP_ID) {
    return (
      <div className="flex flex-1 flex-col justify-center p-16">
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
        onSaveAndQuit={() => setSaveQuitOpen(true)}
        onComplete={exit}
        finishLabel="Finish upload"
      />
      <SaveAndQuitModal
        open={saveQuitOpen}
        onOpenChange={setSaveQuitOpen}
        suggestedName={suggestedSessionName}
        onSave={() => {
          setSaveQuitOpen(false)
          exit()
        }}
        onDiscard={() => {
          setSaveQuitOpen(false)
          exit()
        }}
      />
    </>
  )
}
