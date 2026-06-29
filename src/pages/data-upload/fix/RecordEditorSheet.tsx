import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Select,
  type SelectItems,
  SideSheet,
  TextInput,
} from '../../../components/ui'

/* -------------------------------------------------------------------------- */
/* RecordEditorSheet — edit one or many rows from the data table              */
/* -------------------------------------------------------------------------- */

/**
 * Editable field — describes one row in the editor sheet.
 *
 * Three flavours:
 *
 * - `text` (default): a single-key text input over `keyof Row`.
 * - `select`: a single-key dropdown over a fixed list of options.
 * - `composite`: a synthetic field that maps onto multiple row keys at once
 *   (e.g. Farm + Field, which the user picks as a single Sandy-resolved
 *   farm/field pair).
 */
export type EditableField<Row> =
  | TextEditableField<Row>
  | SelectEditableField<Row>
  | CompositeEditableField<Row>
  | FarmFieldEditableField<Row>

type CommonField = {
  /** Unique key inside the editor — used for state bookkeeping. */
  key: string
  label: string
  /**
   * When true the field renders read-only — the value is shown but the user
   * can't replace it. Used when the caller already constrains the value
   * (e.g. editing a per-field record means the farm/field name is fixed).
   */
  readOnly?: boolean
}

export type TextEditableField<Row> = CommonField & {
  kind?: 'text'
  /** Row key — used to read the existing value and write the patch. */
  rowKey: keyof Row & string
  /** Convert the row value to the editor string. Defaults to `String(value)`. */
  toInput?: (value: Row[keyof Row]) => string
  /**
   * Parse the user's string back into the row value type. Defaults to passing
   * the string through unchanged. Return `undefined` to skip writing this
   * field on save (e.g. when the input is blank and the field is optional).
   */
  fromInput?: (next: string) => Row[keyof Row] | undefined
}

export type SelectEditableField<Row> = CommonField & {
  kind: 'select'
  rowKey: keyof Row & string
  items: SelectItems
  /** Convert the row value to the option `value` it should land on. */
  toInput?: (value: Row[keyof Row]) => string
  /** Map the chosen option value back to a row value. Defaults to identity. */
  fromInput?: (next: string) => Row[keyof Row] | undefined
  placeholder?: string
}

export type CompositeEditableField<Row> = CommonField & {
  kind: 'composite'
  items: SelectItems
  /** Convert a row to the option value that represents its current pair. */
  read: (row: Row) => string
  /**
   * Map a chosen option value to a partial-row patch. Returning undefined
   * skips writing this field (e.g. when the value can't be resolved).
   */
  write: (next: string) => Partial<Row> | undefined
  placeholder?: string
}

/**
 * Two interlinked Selects — Farm + Field. Field's option list is a function
 * of the currently-picked farm. Implemented as a first-class field so the
 * editor can keep one row's worth of layout for the pair.
 */
export type FarmFieldEditableField<Row> = CommonField & {
  kind: 'farm-field'
  /** Farm dropdown options — flat list of farms. */
  farmItems: SelectItems
  /** Resolver for the field dropdown — called whenever the farm changes. */
  fieldItemsFor: (farmId: string) => SelectItems
  /** Read the row's current farm + field ids (or '' when unresolved). */
  readFarmId: (row: Row) => string
  readFieldId: (row: Row) => string
  /** Build the row patch from a confirmed pair. */
  write: (farmId: string, fieldId: string) => Partial<Row> | undefined
  farmLabel?: string
  fieldLabel?: string
}

export type RecordProvenanceInfo = {
  filename: string
  sheetName: string
  sourceRow: number
}

export type RecordEditorSheetProps<Row extends { id: string }> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The records the user wants to edit. Order is preserved in the stack. */
  records: Row[]
  fields: EditableField<Row>[]
  /** Human label for a single record ("cropping record", "operation"). */
  recordLabel: string
  /** Called when the user confirms the edit. Receives a partial patch. */
  onSave: (patch: Partial<Row>) => void
  /**
   * Provenance lookup — returns where the row came from in the source file.
   * When provided, the sheet renders a compact footer with that info so the
   * user can cross-reference the original spreadsheet.
   */
  getProvenance?: (row: Row) => RecordProvenanceInfo | undefined
  /**
   * Render the sheet in a compact, single-purpose form — no "Selected
   * records" stack, no "Fields" heading, and a collapsed provenance
   * summary. The title becomes "Edit <field> across N records" when the
   * sheet is opened with exactly one editable field.
   */
  compact?: boolean
  /**
   * Field keys that are missing or in error on the underlying record(s).
   * The matching input(s) render with a red outline so the user can spot
   * what needs attention without scanning the whole form.
   */
  invalidKeys?: string[]
}

const defaultToInput = <Row,>(value: Row[keyof Row]): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Sentinel separator used to pack a (farmId, fieldId) pair into one string. */
const FARM_FIELD_SEP = '|'

const encodeFarmField = (farmId: string, fieldId: string): string =>
  farmId || fieldId ? `${farmId}${FARM_FIELD_SEP}${fieldId}` : ''

const decodeFarmField = (raw: string): { farmId: string; fieldId: string } => {
  const [farmId = '', fieldId = ''] = raw.split(FARM_FIELD_SEP)
  return { farmId, fieldId }
}

/** Read a field's current value off a row, regardless of variant. */
const readField = <Row,>(field: EditableField<Row>, row: Row): string => {
  if (field.kind === 'composite') return field.read(row)
  if (field.kind === 'farm-field') {
    return encodeFarmField(field.readFarmId(row), field.readFieldId(row))
  }
  const toInput = field.toInput ?? defaultToInput
  return toInput(row[field.rowKey])
}

/** Map a string value to the row patch it should write. */
const writeFieldPatch = <Row,>(
  field: EditableField<Row>,
  raw: string,
): Partial<Row> | undefined => {
  if (field.readOnly) return undefined
  if (field.kind === 'composite') return field.write(raw)
  if (field.kind === 'farm-field') {
    const { farmId, fieldId } = decodeFarmField(raw)
    if (!farmId || !fieldId) return undefined
    return field.write(farmId, fieldId)
  }
  const fromInput = field.fromInput
  const next = fromInput ? fromInput(raw) : (raw as unknown as Row[keyof Row])
  if (next === undefined) return undefined
  return { [field.rowKey]: next } as Partial<Row>
}

/**
 * Find the option label for a given value in a `SelectItems` payload. Falls
 * back to the value itself when there's no match, so unknown values still
 * render readably (e.g. legacy strings outside the current canonical list).
 */
const labelForOption = (items: SelectItems, value: string): string => {
  if (value === '') return ''
  for (const entry of items) {
    if ('options' in entry) {
      for (const o of entry.options) {
        if (o.value === value && typeof o.label === 'string') return o.label
      }
    } else if (entry.value === value && typeof entry.label === 'string') {
      return entry.label
    }
  }
  return value
}

/**
 * Distinct observed values for each field, in first-seen order. Used to
 * summarise the current state of the selected records before batch-replace.
 */
const computeObservedValues = <Row extends { id: string }>(
  records: Row[],
  fields: EditableField<Row>[],
): Record<string, string[]> => {
  const out: Record<string, string[]> = {}
  for (const field of fields) {
    const seen = new Set<string>()
    const order: string[] = []
    for (const r of records) {
      const v = readField(field, r)
      if (!seen.has(v)) {
        seen.add(v)
        order.push(v)
      }
    }
    out[field.key] = order
  }
  return out
}

/**
 * Render an array of observed values as "A, B, C and N more" — using the
 * first three and a count of the remainder. Empty strings render as "—" so
 * the dash represents missing values explicitly.
 */
const formatObserved = (values: string[]): string => {
  const display = values.map((v) => (v === '' ? '—' : v))
  if (display.length === 0) return ''
  if (display.length <= 3) return display.join(', ')
  const head = display.slice(0, 3).join(', ')
  const remainder = display.length - 3
  return `${head} and ${remainder} more`
}

export const RecordEditorSheet = <Row extends { id: string }>({
  open,
  onOpenChange,
  records,
  fields,
  recordLabel,
  onSave,
  getProvenance,
  compact = false,
  invalidKeys,
}: RecordEditorSheetProps<Row>) => {
  const invalidSet = useMemo(() => new Set(invalidKeys ?? []), [invalidKeys])
  const isMulti = records.length > 1
  const [stage, setStage] = useState<'edit' | 'confirm'>('edit')

  const observed = useMemo(
    () => computeObservedValues(records, fields),
    [records, fields],
  )

  // Per-field inputs. For multi-edit, only `touched` fields propagate to the
  // patch — the explicit "Replace all" button is what marks a field touched.
  const [values, setValues] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Reset state whenever the sheet opens or the selection changes. Single
  // edit pre-fills with the record's current value; multi-edit starts blank
  // so the observed-values summary stays meaningful until the user acts.
  useEffect(() => {
    if (!open) return
    const initial: Record<string, string> = {}
    for (const field of fields) {
      if (isMulti) {
        initial[field.key] = ''
      } else {
        const only = records[0]
        initial[field.key] = only ? readField(field, only) : ''
      }
    }
    setValues(initial)
    setTouched({})
    setStage('edit')
  }, [open, fields, records, isMulti])

  const setField = (key: string, next: string) => {
    setValues((curr) => ({ ...curr, [key]: next }))
    // Single-edit and compact-multi fields are always touched — typing IS
    // the commit signal. Only the regular multi-edit flow defers the touch
    // to its explicit "Replace all" button.
    if (!isMulti || compact) setTouched((curr) => ({ ...curr, [key]: true }))
  }

  const replaceAll = (key: string) => {
    setTouched((curr) => ({ ...curr, [key]: true }))
  }

  const undoReplace = (key: string) => {
    setTouched((curr) => ({ ...curr, [key]: false }))
    setValues((curr) => ({ ...curr, [key]: '' }))
  }

  // Build the patch from the current values. In single-edit we always emit
  // every field; in multi-edit we only emit touched fields so untouched ones
  // stay per-record. Composite fields contribute multi-key patches.
  const patch = useMemo<Partial<Row>>(() => {
    const out: Partial<Row> = {}
    for (const field of fields) {
      if (field.readOnly) continue
      if (isMulti && !touched[field.key]) continue
      const raw = values[field.key] ?? ''
      const fieldPatch = writeFieldPatch(field, raw)
      if (!fieldPatch) continue
      Object.assign(out, fieldPatch)
    }
    return out
  }, [values, touched, fields, isMulti])

  const touchedCount = Object.values(touched).filter(Boolean).length
  const canSave = isMulti ? touchedCount > 0 : true

  const editableLabels = fields.filter((f) => !f.readOnly).map((f) => f.label)

  const compactTitle = (() => {
    if (!compact) return null
    const fieldPart =
      editableLabels.length === 1
        ? editableLabels[0]
        : editableLabels.length > 1
          ? editableLabels.join(', ')
          : null
    if (!fieldPart) return 'Edit'
    if (isMulti) return `Edit ${fieldPart} across ${records.length} records`
    return `Edit ${fieldPart}`
  })()

  // Plain "Edit" for non-compact flows — the body already shows what record
  // and field set the user is editing.
  const title = compactTitle ?? 'Edit'

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width="600px"
      footer={
        stage === 'edit' ? (
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={() => setStage('confirm')}
            >
              Review changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStage('edit')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onSave(patch)
              }}
            >
              Overwrite {records.length}{' '}
              {records.length === 1 ? recordLabel : `${recordLabel}s`}
            </Button>
          </>
        )
      }
    >
      {stage === 'edit' ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              {fields.map((field) => {
                if (field.readOnly) {
                  return (
                    <ReadOnlyFieldRow
                      key={field.key}
                      label={field.label}
                      observed={observed[field.key] ?? []}
                      items={
                        field.kind === 'composite' || field.kind === 'select'
                          ? field.items
                          : undefined
                      }
                    />
                  )
                }
                const isSelectOrComposite =
                  field.kind === 'select' || field.kind === 'composite'
                const isFarmField = field.kind === 'farm-field'
                const invalid = invalidSet.has(field.key)
                // Farm/Field uses its own dedicated component in every mode —
                // we never run it through the batch helpers because it
                // already manages two interlinked dropdowns internally.
                if (isFarmField) {
                  const raw = values[field.key] ?? ''
                  const { farmId, fieldId } = decodeFarmField(raw)
                  return (
                    <FarmFieldRow
                      key={field.key}
                      field={field}
                      farmId={farmId}
                      fieldId={fieldId}
                      invalid={invalid}
                      onChange={(nextFarm, nextField) =>
                        setField(
                          field.key,
                          encodeFarmField(nextFarm, nextField),
                        )
                      }
                    />
                  )
                }
                // Compact mode collapses multi-edit into a single input — the
                // title already conveys "across N records", so the observed
                // values + Replace-all affordance would just be noise.
                if (isMulti && !compact) {
                  return isSelectOrComposite ? (
                    <BatchSelectFieldRow
                      key={field.key}
                      label={field.label}
                      items={field.items}
                      observed={observed[field.key] ?? []}
                      value={values[field.key] ?? ''}
                      touched={!!touched[field.key]}
                      invalid={invalid}
                      placeholder={field.placeholder}
                      onChange={(next) => setField(field.key, next)}
                      onReplaceAll={() => replaceAll(field.key)}
                      onUndo={() => undoReplace(field.key)}
                    />
                  ) : (
                    <BatchFieldRow
                      key={field.key}
                      label={field.label}
                      observed={observed[field.key] ?? []}
                      value={values[field.key] ?? ''}
                      touched={!!touched[field.key]}
                      invalid={invalid}
                      onChange={(next) => setField(field.key, next)}
                      onReplaceAll={() => replaceAll(field.key)}
                      onUndo={() => undoReplace(field.key)}
                    />
                  )
                }
                const errorMessage = invalid
                  ? 'Needs your attention'
                  : undefined
                return isSelectOrComposite ? (
                  <Select
                    key={field.key}
                    label={field.label}
                    items={field.items}
                    value={values[field.key] ?? null}
                    placeholder={field.placeholder ?? 'Select…'}
                    searchable
                    errorMessage={errorMessage}
                    onValueChange={(next) => setField(field.key, next ?? '')}
                  />
                ) : (
                  <TextInput
                    key={field.key}
                    label={field.label}
                    value={values[field.key] ?? ''}
                    errorMessage={errorMessage}
                    onValueChange={(next) => setField(field.key, next)}
                  />
                )
              })}
            </div>
          </section>

          {getProvenance ? (
            <ProvenanceFooter records={records} getProvenance={getProvenance} />
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-text-primary">
              Confirm overwrite
            </h3>
            <p className="text-md text-text-secondary">
              You're about to overwrite{' '}
              <strong className="text-text-primary">
                {records.length}{' '}
                {records.length === 1 ? recordLabel : `${recordLabel}s`}
              </strong>
              {isMulti
                ? ` with the values below. Any field left blank will keep its existing per-record value.`
                : ` with the values below.`}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Changes
            </h4>
            <dl className="grid grid-cols-[minmax(140px,auto)_1fr] gap-x-6 gap-y-2 rounded-xl border-2 border-border-tertiary bg-bg-secondary px-4 py-3">
              {fields
                .filter((f) => !f.readOnly && (!isMulti || touched[f.key]))
                .map((field) => {
                  const raw = values[field.key] ?? ''
                  const display =
                    field.kind === 'select' || field.kind === 'composite'
                      ? labelForOption(field.items, raw)
                      : raw
                  return (
                    <div key={field.key} className="contents">
                      <dt className="text-sm text-text-secondary">
                        {field.label}
                      </dt>
                      <dd className="text-sm text-text-primary">
                        {display === '' ? (
                          <span className="text-text-secondary">(cleared)</span>
                        ) : (
                          display
                        )}
                      </dd>
                    </div>
                  )
                })}
            </dl>
          </section>
        </div>
      )}
    </SideSheet>
  )
}

/* -------------------------------------------------------------------------- */
/* BatchFieldRow — one field's worth of UI when editing many records          */
/* -------------------------------------------------------------------------- */

type BatchFieldRowProps = {
  label: string
  observed: string[]
  value: string
  touched: boolean
  invalid?: boolean
  onChange: (next: string) => void
  onReplaceAll: () => void
  onUndo: () => void
}

const BatchFieldRow = ({
  label,
  observed,
  value,
  touched,
  invalid,
  onChange,
  onReplaceAll,
  onUndo,
}: BatchFieldRowProps) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-text-primary">
        {label}
        {invalid ? (
          <span className="ml-2 inline-flex items-center rounded-md bg-support-bg-red px-1.5 py-0.5 text-xs font-semibold text-support-fg-red">
            Needs attention
          </span>
        ) : null}
      </span>
      <span className="text-xs text-text-secondary">
        Currently: {formatObserved(observed)}
      </span>
    </div>
    {touched ? (
      <div className="flex items-center justify-between gap-3 rounded-md border-2 border-border-tertiary bg-sandy-50 px-3 py-2">
        <span className="text-sm text-text-primary">
          Will replace all with{' '}
          <strong className="font-semibold">
            {value === '' ? '— (cleared)' : value}
          </strong>
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="text-sm text-text-secondary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Undo
        </button>
      </div>
    ) : (
      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <TextInput
            value={value}
            onValueChange={onChange}
            placeholder="New value for all selected"
            errorMessage={invalid ? 'Needs your attention' : undefined}
          />
        </div>
        <Button
          variant="secondary"
          disabled={value.trim() === ''}
          onClick={onReplaceAll}
        >
          Replace all
        </Button>
      </div>
    )}
  </div>
)

/* -------------------------------------------------------------------------- */
/* FarmFieldRow — two interlinked Selects: pick farm, then field under it     */
/* -------------------------------------------------------------------------- */

type FarmFieldRowProps<Row> = {
  field: FarmFieldEditableField<Row>
  farmId: string
  fieldId: string
  invalid: boolean
  onChange: (farmId: string, fieldId: string) => void
}

const FarmFieldRow = <Row,>({
  field,
  farmId,
  fieldId,
  invalid,
  onChange,
}: FarmFieldRowProps<Row>) => {
  const fieldOptions = field.fieldItemsFor(farmId)
  const errorMessage = invalid ? 'Needs your attention' : undefined
  return (
    <div className="flex flex-col gap-3">
      <Select
        label={field.farmLabel ?? 'Farm'}
        items={field.farmItems}
        value={farmId === '' ? null : farmId}
        placeholder="Select a farm"
        searchable
        errorMessage={errorMessage}
        // Reset the child field whenever the parent farm changes — keeps the
        // pair valid (no orphan field ids from a previous farm).
        onValueChange={(next) => onChange(next ?? '', '')}
      />
      <Select
        label={field.fieldLabel ?? 'Field'}
        items={fieldOptions}
        value={fieldId === '' ? null : fieldId}
        placeholder={farmId ? 'Select a field' : 'Pick a farm first'}
        searchable
        disabled={farmId === ''}
        errorMessage={errorMessage}
        onValueChange={(next) => onChange(farmId, next ?? '')}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* ReadOnlyFieldRow — static field for batch + per-field editing               */
/* -------------------------------------------------------------------------- */

const ReadOnlyFieldRow = ({
  label,
  observed,
  items,
}: {
  label: string
  observed: string[]
  items?: SelectItems
}) => {
  const display = items
    ? observed.map((v) => labelForOption(items, v))
    : observed
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <div className="rounded-md border-2 border-border-tertiary bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
        {formatObserved(display) || '—'}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* BatchSelectFieldRow — select-based batch editor                             */
/* -------------------------------------------------------------------------- */

type BatchSelectFieldRowProps = {
  label: string
  items: SelectItems
  observed: string[]
  value: string
  touched: boolean
  invalid?: boolean
  placeholder?: string
  onChange: (next: string) => void
  onReplaceAll: () => void
  onUndo: () => void
}

const BatchSelectFieldRow = ({
  label,
  items,
  observed,
  value,
  touched,
  invalid,
  placeholder,
  onChange,
  onReplaceAll,
  onUndo,
}: BatchSelectFieldRowProps) => {
  const observedLabels = observed.map((v) => labelForOption(items, v))
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-text-primary">
          {label}
          {invalid ? (
            <span className="ml-2 inline-flex items-center rounded-md bg-support-bg-red px-1.5 py-0.5 text-xs font-semibold text-support-fg-red">
              Needs attention
            </span>
          ) : null}
        </span>
        <span className="text-xs text-text-secondary">
          Currently: {formatObserved(observedLabels)}
        </span>
      </div>
      {touched ? (
        <div className="flex items-center justify-between gap-3 rounded-md border-2 border-border-tertiary bg-sandy-50 px-3 py-2">
          <span className="text-sm text-text-primary">
            Will replace all with{' '}
            <strong className="font-semibold">
              {value === '' ? '— (cleared)' : labelForOption(items, value)}
            </strong>
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="text-sm text-text-secondary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Undo
          </button>
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          <div className="flex-1">
            <Select
              items={items}
              value={value === '' ? null : value}
              placeholder={placeholder ?? 'Select a new value'}
              searchable
              errorMessage={invalid ? 'Needs your attention' : undefined}
              onValueChange={(next) => onChange(next ?? '')}
            />
          </div>
          <Button
            variant="secondary"
            disabled={value === ''}
            onClick={onReplaceAll}
          >
            Replace all
          </Button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* ProvenanceFooter — where the selected records came from                     */
/* -------------------------------------------------------------------------- */

const ProvenanceFooter = <Row extends { id: string }>({
  records,
  getProvenance,
}: {
  records: Row[]
  getProvenance: (row: Row) => RecordProvenanceInfo | undefined
}) => {
  const entries = records
    .map((row) => ({ row, provenance: getProvenance(row) }))
    .filter(
      (entry): entry is { row: Row; provenance: RecordProvenanceInfo } =>
        entry.provenance !== undefined,
    )
  if (entries.length === 0) return null

  // Single record: show the precise file / sheet / row line.
  if (entries.length === 1) {
    const { provenance } = entries[0]
    return (
      <section className="flex flex-col gap-2 border-t-2 border-border-tertiary pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Source
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-text-secondary">
          <span className="font-mono text-text-primary">
            {provenance.filename}
          </span>
          <span>·</span>
          <span>{provenance.sheetName}</span>
          <span>·</span>
          <span>row {provenance.sourceRow}</span>
        </p>
      </section>
    )
  }

  // Multiple records: collapse to one summary line per file/sheet pair so
  // the footer doesn't balloon into a per-row list.
  type Group = { filename: string; sheetName: string; count: number }
  const groups = new Map<string, Group>()
  for (const { provenance } of entries) {
    const key = `${provenance.filename}::${provenance.sheetName}`
    const existing = groups.get(key)
    if (existing) existing.count += 1
    else
      groups.set(key, {
        filename: provenance.filename,
        sheetName: provenance.sheetName,
        count: 1,
      })
  }
  const summary = [...groups.values()]

  return (
    <section className="flex flex-col gap-2 border-t-2 border-border-tertiary pt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Source
      </h3>
      <ul className="flex flex-col gap-1.5">
        {summary.map((g) => (
          <li
            key={`${g.filename}::${g.sheetName}`}
            className="flex flex-wrap items-baseline gap-x-2 text-sm text-text-secondary"
          >
            <span className="font-mono text-text-primary">{g.filename}</span>
            <span>·</span>
            <span>{g.sheetName}</span>
            <span>·</span>
            <span>
              {g.count} {g.count === 1 ? 'row' : 'rows'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
