import type { ValidationArea } from './types'

/* -------------------------------------------------------------------------- */
/* Upload steps — ordered list of every stage in the data-onboarding flow      */
/* -------------------------------------------------------------------------- */

/**
 * Stable id for each step. Mirrors the route segments under `/data-upload/`
 * so consumers can deep-link with a single shared key. Add new steps by
 * appending to UPLOAD_STEPS — order matters (it drives the visualisation).
 */
export type UploadStepId =
  | 'add-files'
  | 'refine'
  | 'fix'
  | 'completeness'
  | 'anomalies'
  | 'commit'

export type UploadStep = {
  id: UploadStepId
  /** Step number, 1-indexed. Drives the badge in visualisations. */
  number: number
  /** Short label shown in nav / step header. */
  label: string
  /** One-sentence description of what happens in this step. */
  description: string
  /**
   * Validation area(s) surfaced inside this step. Empty array for steps that
   * are pure ingestion / commit and don't carry catalogue validations.
   *
   * Multiple areas are allowed for the future case where one step covers
   * several validation buckets (none today).
   */
  areas: ValidationArea[]
}

export const UPLOAD_STEPS: UploadStep[] = [
  {
    id: 'add-files',
    number: 1,
    label: 'Add files',
    description:
      'Sandy ingests one or more spreadsheets, PDFs or templates. The user assigns a data category (Operations / Cropping / Soil sampling) to each file so Sandy knows which extraction recipe to apply.',
    areas: [],
  },
  {
    id: 'refine',
    number: 2,
    label: 'Refine',
    description:
      'Sandy proposes how to extract each canonical property (farm name, crop type, …) from the source data and surfaces any unrecognised values for the user to confirm, override, or skip.',
    areas: ['refinement'],
  },
  {
    id: 'fix',
    number: 3,
    label: 'Fix issues',
    description:
      'Row-level rule failures Sandy already knows about — missing required fields, invalid dates, out-of-range numbers, duplicates, orphans. The user resolves each with an inline edit, exclusion, merge, or acknowledgement.',
    areas: ['fixes'],
  },
  {
    id: 'completeness',
    number: 4,
    label: 'Completeness',
    description:
      "Optional fields Sandy can't infer get flagged so the user can supply them or let Sandy fall back to default assumptions.",
    areas: ['completeness'],
  },
  {
    id: 'anomalies',
    number: 5,
    label: 'Anomalies',
    description:
      'Statistical / outlier checks against historical baselines surface rows that look plausible but suspicious (e.g. yields three standard deviations above the norm for this field).',
    areas: ['anomalies'],
  },
  {
    id: 'commit',
    number: 6,
    label: 'Commit',
    description:
      'The user reviews a summary of everything that will be imported and confirms. Sandy writes the resolved records into the canonical model.',
    areas: [],
  },
]

export const UPLOAD_STEP_BY_ID: Record<UploadStepId, UploadStep> =
  Object.fromEntries(UPLOAD_STEPS.map((s) => [s.id, s])) as Record<
    UploadStepId,
    UploadStep
  >

/** Steps that surface a given validation area. */
export const stepsForArea = (area: ValidationArea): UploadStep[] =>
  UPLOAD_STEPS.filter((s) => s.areas.includes(area))
