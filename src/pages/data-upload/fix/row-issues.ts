/* -------------------------------------------------------------------------- */
/* Row-level issue model for the Fix-issues step                               */
/* -------------------------------------------------------------------------- */

/**
 * Severity tiers. `blocking` issues must be fixed before the upload can
 * commit; `warning` issues are advisory and don't gate progress.
 */
export type IssueSeverity = 'blocking' | 'warning'

/**
 * Static catalogue of issue codes. Each entry pairs a stable code with a
 * default severity and a sentence template; templates accept `{col}` and
 * `{value}` placeholders that the formatter substitutes at render time.
 *
 * Keep the codes stable — they're persisted with the row and drive the
 * fix-modal's per-code adapter (later batch).
 */
export type IssueCode =
  // Attribute-level
  | 'required-missing'
  | 'max-length-exceeded'
  | 'year-invalid'
  | 'date-invalid'
  | 'positive-int-required'
  | 'decimal-out-of-range'
  // Reference-table
  | 'crop-type-unknown'
  // Cross-field (data-point logic)
  | 'planting-after-harvest'
  | 'harvest-gt-total'
  | 'yield-zero'
  // Cross-area
  | 'crop-area-exceeds-field'
  // Cross-record (business logic)
  | 'duplicate-cropping'
  | 'duplicate-operation'
  | 'duplicate-fertiliser'
  | 'duplicate-farm'
  | 'orphan-operation'
  | 'deletion-not-allowed'

export type RowIssue = {
  code: IssueCode
  severity: IssueSeverity
  /** Column the issue lives on — drives the modal's "edit this value" target. */
  columnName?: string
  /** Pre-rendered message. Adapters fall back to the catalogue template. */
  message: string
  /** Free-text context the modal can surface (e.g. "Field area: 8.4 ha"). */
  detail?: string
}

/* -------------------------------------------------------------------------- */
/* Catalogue — default severity per code                                       */
/* -------------------------------------------------------------------------- */

export const ISSUE_DEFAULTS: Record<
  IssueCode,
  { severity: IssueSeverity; label: string }
> = {
  'required-missing': {
    severity: 'blocking',
    label: 'Required value missing',
  },
  'max-length-exceeded': {
    severity: 'blocking',
    label: 'Value too long',
  },
  'year-invalid': { severity: 'blocking', label: 'Invalid year' },
  'date-invalid': { severity: 'blocking', label: 'Invalid date format' },
  'positive-int-required': {
    severity: 'blocking',
    label: 'Number must be greater than 0',
  },
  'decimal-out-of-range': {
    severity: 'blocking',
    label: 'Value out of allowed range',
  },
  'crop-type-unknown': {
    severity: 'blocking',
    label: 'Crop type not recognised',
  },
  'planting-after-harvest': {
    severity: 'blocking',
    label: 'Planting date after harvest',
  },
  'harvest-gt-total': {
    severity: 'blocking',
    label: 'Harvest yield greater than total',
  },
  'yield-zero': { severity: 'warning', label: 'Yield recorded as zero' },
  'crop-area-exceeds-field': {
    severity: 'warning',
    label: 'Crop area exceeds field area',
  },
  // Cropping duplicates are blocking; operations / fertiliser dupes are
  // warnings (Sandy accepts but flags them).
  'duplicate-cropping': {
    severity: 'blocking',
    label: 'Duplicate cropping record',
  },
  'duplicate-operation': {
    severity: 'warning',
    label: 'Duplicate operation record',
  },
  'duplicate-fertiliser': {
    severity: 'warning',
    label: 'Duplicate fertiliser record',
  },
  'duplicate-farm': {
    severity: 'blocking',
    label: 'Farm already exists in Sandy',
  },
  'orphan-operation': {
    severity: 'blocking',
    label: 'No matching cropping record',
  },
  'deletion-not-allowed': {
    severity: 'blocking',
    label: 'Deletion is not allowed for this record',
  },
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Worst severity across an issue list, or null if the row is clean. */
export const worstSeverity = (
  issues: RowIssue[] | undefined,
): IssueSeverity | null => {
  if (!issues || issues.length === 0) return null
  return issues.some((i) => i.severity === 'blocking') ? 'blocking' : 'warning'
}

/**
 * Build a single RowIssue from a code + column. Sentence templates here
 * are intentionally short — full plain-English copy lives in the fix
 * modal adapter.
 */
export const issueFor = (
  code: IssueCode,
  columnName?: string,
  detail?: string,
): RowIssue => {
  const def = ISSUE_DEFAULTS[code]
  const message = columnName
    ? `${columnName} — ${def.label.toLowerCase()}`
    : def.label
  return {
    code,
    severity: def.severity,
    columnName,
    message,
    detail,
  }
}
