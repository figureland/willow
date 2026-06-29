import type { UploadedFile } from './UploadStep'

/* -------------------------------------------------------------------------- */
/* Recognition model — shared by the upload page (inline cards) and the       */
/* per-file review modal.                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Outcomes Sandy reports for each uploaded file after a quick initial scan.
 *
 *  - `sandy-template`  → official Sandy import template, recognised by name
 *                         and a known set of named ranges.
 *  - `fms-export`      → recognised export from a farm-management system
 *                         (Gatekeeper, XFarm, etc).
 *  - `custom-template` → a user-supplied spreadsheet Sandy has seen before
 *                         (paired against the user's saved templates).
 *  - `unrecognised`    → looks like a spreadsheet/PDF but matches no known
 *                         template. The user will be invited to tag + describe
 *                         it on the per-file editor.
 *  - `error`           → recognition failed with a specific error code (e.g.
 *                         a Sandy template missing required tabs).
 */
export type RecognitionKind =
  | 'sandy-template'
  | 'fms-export'
  | 'custom-template'
  | 'unrecognised'
  | 'error'

export type DataCategoryTag = 'cropping' | 'operations' | 'soil-sampling'

export const CATEGORY_OPTIONS: { value: DataCategoryTag; label: string }[] = [
  { value: 'cropping', label: 'Cropping' },
  { value: 'operations', label: 'Operations' },
  { value: 'soil-sampling', label: 'Soil sampling' },
]

export const CATEGORY_LABEL: Record<DataCategoryTag, string> = {
  cropping: 'Cropping',
  operations: 'Operations',
  'soil-sampling': 'Soil sampling',
}

export type RecognitionResult = {
  kind: RecognitionKind
  /** Display name for the recognised template / source. */
  templateLabel: string
  /** Optional helper line (e.g. "Last used: 2024/25 Harvest data Stage 2"). */
  templateNote?: string
  /** Auto-detected data category — null when Sandy can't tell. */
  detectedCategory: DataCategoryTag | null
  /** When the recognition step itself failed, this is the user-readable copy. */
  errorMessage?: string
  /** Error subtype — drives the action affordance (template download etc.). */
  errorVariant?: 'invalid-sandy-template' | 'no-existing-template'
  /** When the recogniser matched a saved custom template, this is its id. */
  matchedTemplateId?: string
}

/* -------------------------------------------------------------------------- */
/* Saved custom templates — rule-sets the user previously confirmed and named */
/* -------------------------------------------------------------------------- */

export type SavedTemplate = {
  id: string
  name: string
  /** 'builtin' = ships with Sandy. 'custom' = user-created rule-set. */
  kind: 'builtin' | 'custom'
  /** Friendly "last used" line shown beneath the name. */
  lastUsedLabel: string
}

/** Built-in templates Sandy ships with — always available to attach to a file. */
export const BUILTIN_TEMPLATES: SavedTemplate[] = [
  {
    id: 'builtin-sandy-template',
    name: 'Sandy official template',
    kind: 'builtin',
    lastUsedLabel: 'Built-in template',
  },
  {
    id: 'builtin-gatekeeper',
    name: 'Gatekeeper FMS export',
    kind: 'builtin',
    lastUsedLabel: 'Built-in template',
  },
  {
    id: 'builtin-xfarm',
    name: 'XFarm export',
    kind: 'builtin',
    lastUsedLabel: 'Built-in template',
  },
  {
    id: 'builtin-soil-sampling',
    name: 'Soil sampling report',
    kind: 'builtin',
    lastUsedLabel: 'Built-in template',
  },
]

/** Templates the user has previously created from their own files. */
export const CUSTOM_TEMPLATES: SavedTemplate[] = [
  {
    id: 'arable-data',
    name: 'Arable data template',
    kind: 'custom',
    lastUsedLabel: 'Last used: 2024/25 Harvest data Stage 2',
  },
  {
    id: 'agronomist-export',
    name: 'Agronomist export template',
    kind: 'custom',
    lastUsedLabel: 'Last used: 2024 Autumn spray plans',
  },
  {
    id: 'precision-yield',
    name: 'Precision yield template',
    kind: 'custom',
    lastUsedLabel: 'Last used: 2023 Combine telemetry import',
  },
]

export const SAVED_TEMPLATES: SavedTemplate[] = [
  ...BUILTIN_TEMPLATES,
  ...CUSTOM_TEMPLATES,
]

export const getSavedTemplate = (
  id: string | undefined,
): SavedTemplate | null => {
  if (!id) return null
  return SAVED_TEMPLATES.find((t) => t.id === id) ?? null
}

const detectCategory = (lower: string): DataCategoryTag => {
  if (/(soil|nrm|sample|\bph\b)/.test(lower)) return 'soil-sampling'
  if (/(crop|sow|sowing|harvest|yield|variety|cropping)/.test(lower))
    return 'cropping'
  return 'operations'
}

/**
 * Dummy recogniser — assigns a plausible outcome from filename heuristics so
 * the demo always shows a mix of the available states.
 */
export const recogniseFile = (
  file: UploadedFile,
  idx: number,
): RecognitionResult => {
  const lower = file.name.toLowerCase()

  if (lower.includes('template') && file.kind === 'excel-template') {
    // First template-named file is invalid, the rest are valid Sandy templates
    // — keeps the demo predictable while still showing the error branch.
    if (idx % 4 === 3) {
      return {
        kind: 'error',
        templateLabel: 'Sandy template',
        detectedCategory: null,
        errorMessage:
          'This Sandy template is missing required tabs and named ranges.',
        errorVariant: 'invalid-sandy-template',
      }
    }
    return {
      kind: 'sandy-template',
      templateLabel: 'Sandy import template',
      templateNote: 'Current version (2025-Q1)',
      detectedCategory: detectCategory(lower),
    }
  }

  if (/(gatekeeper|farmkeeper|xfarm|fms)/.test(lower)) {
    return {
      kind: 'fms-export',
      templateLabel: /gatekeeper|farmkeeper/.test(lower)
        ? 'Gatekeeper export'
        : 'XFarm export',
      templateNote: 'Detected from sheet layout',
      detectedCategory: detectCategory(lower),
    }
  }

  // Cycle the remaining files through custom-template → unrecognised → error
  // so the demo always shows every state.
  const remainder = idx % 3
  if (remainder === 0) {
    // Rotate through the user's custom templates so multiple custom-template
    // files pick up distinct names in the demo.
    const tpl = CUSTOM_TEMPLATES[idx % CUSTOM_TEMPLATES.length]
    return {
      kind: 'custom-template',
      templateLabel: tpl.name,
      templateNote: tpl.lastUsedLabel,
      detectedCategory: detectCategory(lower),
      matchedTemplateId: tpl.id,
    }
  }
  if (remainder === 1) {
    return {
      kind: 'unrecognised',
      templateLabel: 'Unrecognised layout',
      detectedCategory: detectCategory(lower),
    }
  }
  return {
    kind: 'error',
    templateLabel: 'Custom template',
    detectedCategory: detectCategory(lower),
    errorMessage:
      "We couldn't find a matching template for this file. We'll create a new one for you.",
    errorVariant: 'no-existing-template',
  }
}

/* -------------------------------------------------------------------------- */
/* Per-file editable review state                                              */
/* -------------------------------------------------------------------------- */

export type ReviewState = {
  /** A file can sit in more than one category (e.g. cropping + operations). */
  categories: DataCategoryTag[]
  templateLabel: string
  /** When the user picks a different saved template, we stash its id. */
  matchedTemplateId?: string
  /**
   * Set true once the user has explicitly opted into creating a new template
   * from this file. Survives even when the name + description are blank so
   * the UI can show the attached "Importing as a new file type" panel.
   */
  createNewTemplate?: boolean
  /** Optional name when the user is creating a new custom template from
   *  this file instead of attaching to an existing one. */
  newTemplateName?: string
  /** User-authored description that helps Sandy ingest the file. Persists
   *  across modal opens so the user can edit or clear it. */
  description?: string
  /** True once the user has manually confirmed / tagged the file. */
  reviewed: boolean
}

export const seedReview = (r: RecognitionResult): ReviewState => ({
  categories: r.detectedCategory ? [r.detectedCategory] : [],
  templateLabel: r.templateLabel,
  matchedTemplateId: r.matchedTemplateId,
  reviewed: false,
})

/**
 * Does this file/recognition pair need user attention? Drives the wizard's
 * "Review X issues" Continue button.
 */
export const isFileIssue = (
  recognition: RecognitionResult | undefined,
): boolean => {
  if (!recognition) return false
  return recognition.kind === 'error' || recognition.kind === 'unrecognised'
}
