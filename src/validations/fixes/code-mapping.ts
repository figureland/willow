/**
 * Bridge between the legacy Fix-step `IssueCode` strings (`'required-missing'`)
 * and the namespaced catalogue codes (`'fixes.general.required'`).
 *
 * The Fix step uses short `IssueCode` keys throughout its runtime model
 * (CroppingRecord.issues, ISSUE_DEFAULTS, classifiers). Rather than churn
 * every consumer, we map those short codes onto the catalogue's namespaced
 * codes here. ISSUE_DEFAULTS is then a derived projection of the catalogue
 * via this map — no copy duplication.
 */

import { VALIDATION_BY_CODE } from '../catalogue'
import type { ValidationError, ValidationSeverity } from '../types'

/** Stable Fix-step issue codes. Mirrors `IssueCode` in `fix/row-issues.ts`. */
export type FixIssueCode =
  | 'required-missing'
  | 'max-length-exceeded'
  | 'year-invalid'
  | 'date-invalid'
  | 'positive-int-required'
  | 'decimal-out-of-range'
  | 'crop-type-unknown'
  | 'planting-after-harvest'
  | 'harvest-gt-total'
  | 'yield-zero'
  | 'crop-area-exceeds-field'
  | 'duplicate-cropping'
  | 'duplicate-operation'
  | 'duplicate-fertiliser'
  | 'duplicate-farm'
  | 'orphan-operation'
  | 'deletion-not-allowed'

/** Short Fix `IssueCode` → namespaced catalogue `ValidationError.code`. */
export const FIX_CODE_TO_CATALOGUE: Record<FixIssueCode, string> = {
  'required-missing': 'fixes.general.required',
  'max-length-exceeded': 'fixes.general.max-length',
  'year-invalid': 'fixes.general.year-invalid',
  'date-invalid': 'fixes.general.date-invalid',
  'positive-int-required': 'fixes.field.positive-int',
  'decimal-out-of-range': 'fixes.field.decimal-range',
  'crop-type-unknown': 'fixes.cropping.crop-type-unknown',
  'planting-after-harvest': 'fixes.cropping.planting-after-harvest',
  'harvest-gt-total': 'fixes.cropping.harvest-gt-total',
  'yield-zero': 'fixes.cropping.yield-zero',
  'crop-area-exceeds-field': 'fixes.cropping.area-exceeds-field',
  'duplicate-cropping': 'fixes.cropping.duplicate',
  'duplicate-operation': 'fixes.operations.duplicate',
  'duplicate-fertiliser': 'fixes.fertiliser.duplicate',
  'duplicate-farm': 'fixes.farm.duplicate-sandy-id',
  'orphan-operation': 'fixes.operations.orphan',
  'deletion-not-allowed': 'fixes.operations.deletion-not-allowed',
}

/** Resolve a short Fix code to its catalogue entry. */
export const catalogueEntryFor = (
  code: FixIssueCode,
): ValidationError | undefined =>
  VALIDATION_BY_CODE[FIX_CODE_TO_CATALOGUE[code]]

/**
 * Defaults projected from the catalogue — same shape as the legacy
 * ISSUE_DEFAULTS but kept in sync with catalogue copy automatically.
 */
export const fixDefaults: Record<
  FixIssueCode,
  { severity: ValidationSeverity; label: string }
> = Object.fromEntries(
  (Object.keys(FIX_CODE_TO_CATALOGUE) as FixIssueCode[]).map((code) => {
    const entry = VALIDATION_BY_CODE[FIX_CODE_TO_CATALOGUE[code]]
    if (!entry) {
      throw new Error(
        `Fix code "${code}" maps to "${FIX_CODE_TO_CATALOGUE[code]}" but no catalogue entry was found.`,
      )
    }
    return [code, { severity: entry.severity, label: entry.title }]
  }),
) as Record<FixIssueCode, { severity: ValidationSeverity; label: string }>
