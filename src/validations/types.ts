/* -------------------------------------------------------------------------- */
/* Validation catalogue — shared types                                         */
/* -------------------------------------------------------------------------- */

/**
 * The catalogue is a single, normalised description of every validation Sandy
 * raises across the data-onboarding flow. Each entry pairs:
 *   - the rule itself (trigger, message template, scope)
 *   - the UX (title, friendly copy)
 *   - the resolution actions available to the user (what each button does
 *     and what state Sandy ends up in)
 *
 * The catalogue is intentionally framework-free — it's a spec that the
 * /validation-errors reference page renders directly, and that the data-upload
 * Refine / Fix steps use as the source of truth for their own UI.
 */

export type ValidationSeverity = 'blocking' | 'warning'

/**
 * Top-level area of Sandy's onboarding flow this validation belongs to.
 * Each area maps onto a step in the data-upload wizard:
 *   - refinement  — feedback / interactive disambiguation as Sandy ingests
 *                   data (unknown farms/fields, file structure, value mapping).
 *   - fixes       — row-level rule failures Sandy already knows about
 *                   (attribute, cross-field, cross-record).
 *   - completeness — missing optional data Sandy will otherwise have to
 *                    assume.
 *   - anomalies   — statistical / outlier checks against historical baselines.
 */
export type ValidationArea =
  | 'refinement'
  | 'fixes'
  | 'completeness'
  | 'anomalies'

export const VALIDATION_AREA_ORDER: ValidationArea[] = [
  'refinement',
  'fixes',
  'completeness',
  'anomalies',
]

export const VALIDATION_AREA_LABEL: Record<ValidationArea, string> = {
  refinement: 'Refinement',
  fixes: 'Fixes',
  completeness: 'Completeness',
  anomalies: 'Anomalies',
}

/**
 * Where in Sandy's validation stack the rule lives.
 *   - attribute   — cell-level (required, max length, valid year/date).
 *   - reference   — FK-style (value must exist in a reference table).
 *   - data-point  — single-record numeric/date sanity (range, > 0, …).
 *   - cross-field — two fields on the same record compared.
 *   - business    — cross-record / cross-entity rules (duplicates, orphans).
 *   - structural  — file-level (schema doesn't match canonical layout).
 *   - identity    — record-identity matching (unknown farm/field/value).
 */
export type ValidationType =
  | 'attribute'
  | 'reference'
  | 'data-point'
  | 'cross-field'
  | 'business'
  | 'structural'
  | 'identity'

export const VALIDATION_TYPE_LABEL: Record<ValidationType, string> = {
  attribute: 'Attribute',
  reference: 'Reference table',
  'data-point': 'Data point',
  'cross-field': 'Cross-field',
  business: 'Business logic',
  structural: 'File structure',
  identity: 'Identity matching',
}

/**
 * Sub-category within Fixes — drives the inbox grouping on the Fix step.
 * Refinement and other areas don't use this dimension (their grouping comes
 * from `dataCategory`).
 */
export type FixSubcategory = 'attribute' | 'cross-field' | 'cross-record'

export const FIX_SUBCATEGORY_LABEL: Record<FixSubcategory, string> = {
  attribute: 'Attribute values',
  'cross-field': 'Cross-field rules',
  'cross-record': 'Duplicates & references',
}

export const FIX_SUBCATEGORY_ORDER: FixSubcategory[] = [
  'attribute',
  'cross-field',
  'cross-record',
]

/** Which table / domain entity the rule fires on. */
export type ValidationScope =
  | 'general'
  | 'farm'
  | 'field'
  | 'cropping'
  | 'operations'
  | 'fertiliser'
  | 'soil'
  | 'file'

export const VALIDATION_SCOPE_LABEL: Record<ValidationScope, string> = {
  general: 'General',
  farm: 'Farm',
  field: 'Field',
  cropping: 'Cropping',
  operations: 'Operations',
  fertiliser: 'Fertiliser',
  soil: 'Soil',
  file: 'File',
}

export const VALIDATION_SEVERITY_LABEL: Record<ValidationSeverity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
}

/* -------------------------------------------------------------------------- */
/* Actions                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Stable identifier for each kind of resolution. Engineering routes on this;
 * UX picks the right button label and outcome copy for it.
 *
 * Keep the union narrow — a new kind should describe a genuinely different
 * effect on the data, not just a different button label.
 */
export type ResolutionActionKind =
  | 'accept-suggestion' // Sandy's guess is right — one click confirms.
  | 'accept-with-matches' // Confirm Sandy's confident matches; flag the rest.
  | 'choose-alternative' // Pick a different existing value from a list.
  | 'override-recipe' // Point Sandy at a different source column / sheet.
  | 'create-new' // Promote the source value to a new Sandy record.
  | 'edit-value' // Inline edit of the offending cell(s).
  | 'map-values' // Per-source-value decisions (value mapping panel).
  | 'define-rule' // Build a transformation rule (schema editor).
  | 'merge' // Merge with an existing record.
  | 'exclude' // Drop the affected row(s) from the upload.
  | 'acknowledge' // Warning only — no change, just confirmed.
  | 'remove-from-file' // Out of scope — fix it upstream and re-upload.
  | 'contact-support' // Escalation.

export type ResolutionAction = {
  /** Routing key for engineering. */
  kind: ResolutionActionKind
  /** Button label exactly as shown in the UI. May reference {placeholders}. */
  label: string
  /**
   * One-line plain-English description of what choosing this action does to
   * the data. UX uses this for confirmation toasts, empty-state copy, audit
   * lines. Engineering uses it as a spec for the resulting state transition.
   */
  outcome: string
  /**
   * True when this action moves the issue out of the unresolved pile.
   * False is reserved for purely informational paths (rare — most warnings
   * are still resolved by an `acknowledge` action).
   */
  resolves: boolean
}

/* -------------------------------------------------------------------------- */
/* Refinement-only — source / recipe metadata                                  */
/* -------------------------------------------------------------------------- */

/**
 * Which data category a refinement entry belongs to. Mirrors the per-category
 * extraction prompts (Operations, Cropping, Soil sampling).
 */
export type DataCategory = 'operations' | 'cropping' | 'soil-sampling'

export const DATA_CATEGORY_LABEL: Record<DataCategory, string> = {
  operations: 'Operations',
  cropping: 'Cropping',
  'soil-sampling': 'Soil sampling',
}

/**
 * Per data category, every canonical Sandy property has up to two
 * refinement tasks:
 *   - schema-transformation: where in the file does the property live
 *     (column, sheet, join, derivation)?
 *   - value-mapping: only for controlled-vocab properties (crop variety,
 *     crop type, operation type, unit, …). Translate source values into
 *     Sandy's reference vocabulary.
 *
 * A property might have one, the other, or both. Pure numeric / date
 * fields (working area, harvest year) only have schema-transformation.
 * Free-text identity fields (farm name, field name) only have schema —
 * value matching for those happens via the identity flow, not vocab
 * mapping.
 */
export type RefinementTask =
  | 'identity'
  | 'schema-transformation'
  | 'value-mapping'

export const REFINEMENT_TASK_LABEL: Record<RefinementTask, string> = {
  identity: 'Identity matching',
  'schema-transformation': 'Schema transformation',
  'value-mapping': 'Value mapping',
}

/**
 * A canonical Sandy property covered by a refinement entry. Schema entries
 * list every property they need to locate in the upload; value-mapping
 * entries list every property whose source values need translating.
 */
export type RefinementProperty = {
  /** Slug stable across releases. */
  property: string
  /** Human label. */
  label: string
  /** Whether Sandy needs this to land the upload. */
  required: boolean
  /** Optional one-line note (where it usually lives, how it's derived, …). */
  note?: string
}

/**
 * Where in the source workbook Sandy reads a property from. Optional
 * snippet of metadata used when the catalogue can carry a meaningful
 * default; most refinement entries leave this empty.
 */
export type RefinementSource = {
  sheet: string
  column: string
  /** Look the value up in another sheet via a shared key column. */
  join?: {
    viaColumn: string
    lookupSheet: string
    returnColumn: string
  }
  /** Plain-English description of any post-processing. */
  transform?: string
}

/* -------------------------------------------------------------------------- */
/* ValidationError — one entry per rule (or per refinement property)           */
/* -------------------------------------------------------------------------- */

export type ValidationError = {
  /**
   * Stable code — `<area>.<scope>.<rule>`. Primary key across the system.
   * Examples: `refinement.operations.farm-name`, `fixes.cropping.duplicate`.
   */
  code: string
  /** Wizard area this validation belongs to. */
  area: ValidationArea
  type: ValidationType
  severity: ValidationSeverity
  scope: ValidationScope
  /** Short title shown at the top of an issue card. */
  title: string
  /**
   * Sandy's raw error template with `{placeholder}` slots, e.g.
   * `'{column} is required.'`. Stable across releases so server-side
   * messages can map onto it.
   */
  messageTemplate: string
  /** Friendly, user-facing version of the message. What we render in the UI. */
  uxCopy: string
  /** Plain-English description of when this fires (the trigger). */
  trigger: string
  /** Optional concrete example to anchor the rule. */
  example?: string
  /**
   * Ordered list of resolution actions. The first entry is the recommended
   * path — the UI typically renders it as a primary button.
   */
  actions: ResolutionAction[]
  /**
   * Sub-category within Fixes — `attribute` / `cross-field` / `cross-record`.
   * Used to group entries on the Fix step's inbox; ignored for other areas.
   */
  subcategory?: FixSubcategory

  /* -- Refinement-only metadata ------------------------------------------- */

  /**
   * Data categories this entry applies to. Required for refinement entries.
   * Today every entry lists one category; the array shape leaves room for
   * future entries that span more than one (e.g. a farm-matching task that
   * applies to both Operations and Cropping uploads).
   */
  dataCategories?: DataCategory[]
  /**
   * Ordinal position within the per-category refinement pipeline. Lower
   * numbers run first. Identity tasks (match farms, match fields) come
   * before schema transformation, which comes before value mapping.
   */
  step?: number
  /**
   * Whether this entry covers schema transformation (column placement) or
   * value mapping (vocabulary translation). Required for refinement
   * entries.
   */
  refinementTask?: RefinementTask
  /**
   * Canonical Sandy property this refinement covers (e.g. `farmName`,
   * `cropVariety`, `operationGroup`). Refinement-only. Use `properties`
   * instead when the entry covers many properties at once.
   */
  property?: string
  /**
   * Set on collapsed refinement entries (one schema or value-mapping task
   * per data category) that cover many canonical properties at once. Each
   * entry lists every property it concerns, with required / optional flags.
   * Refinement-only.
   */
  properties?: RefinementProperty[]
  /**
   * Plain-English description of how Sandy extracts this property from the
   * source data. Optional and used when the catalogue can usefully express
   * a default. Refinement-only.
   */
  recipe?: string
  /** Where Sandy reads the property from, when known. Refinement-only. */
  source?: RefinementSource
}
