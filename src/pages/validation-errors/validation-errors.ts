/**
 * Thin re-export shim — the validation catalogue lives under `src/validations`
 * and is consumed by both this reference page and the data-upload Refine /
 * Fix steps. Keep importing from the new location in new code.
 */

import type { ValidationArea, ValidationError } from '../../validations'

export * from '../../validations'

/** Resolved area for an error. Every catalogue entry sets `area` explicitly. */
export const areaOf = (error: ValidationError): ValidationArea => error.area
