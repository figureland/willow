import clsx from 'clsx'
import { useMemo, useState } from 'react'
import {
  Button,
  DatePicker,
  Modal,
  Select,
  TextInput,
  Tooltip,
} from '../../../components/ui'
import { DescribeTray } from '../refine/DescribeTray'
import { AFFECTED_RECORDS } from './affected-records'
import { AffectedDataGrid, type FixIssue } from './IssuesView.legacy'
import type { IssueCode } from './row-issues'

/* -------------------------------------------------------------------------- */
/* FixIssueModal — code-aware fix surface                                      */
/* -------------------------------------------------------------------------- */

/**
 * Local "what did the user decide?" shape. The modal's job is to gather one
 * of these and hand it back to the caller. The caller stores a coarser
 * `Resolution` ('fixed' | 'ignored' | 'pending') but knowing the underlying
 * decision lets us render meaningful resolved-state labels in the future.
 */
export type FixDecision =
  | { kind: 'apply-suggestion' }
  | { kind: 'manual-value'; value: string }
  | { kind: 'manual-date'; value: string }
  | { kind: 'manual-number'; value: number }
  | { kind: 'manual-choice'; value: string }
  | { kind: 'describe'; prompt: string }
  | { kind: 'skip' }

export type FixIssueModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  issue: FixIssue
  /** Called when the user commits a decision. */
  onResolve: (decision: FixDecision) => void
  /** Called when the user chooses to skip the issue. */
  onSkip: () => void
}

/* -------------------------------------------------------------------------- */
/* Per-issue-code fix-input spec                                              */
/* -------------------------------------------------------------------------- */

type ChoiceSpec = { value: string; label: string; tone?: 'default' | 'danger' }

type FixInputSpec =
  | { kind: 'text'; label: string; placeholder?: string; suggestion?: string }
  | {
      kind: 'number'
      label: string
      placeholder?: string
      min?: number
      max?: number
      suggestion?: number
      unit?: string
    }
  | { kind: 'date'; label: string; suggestion?: string }
  | {
      kind: 'choice'
      label: string
      options: ChoiceSpec[]
      suggestion?: string
    }
  | { kind: 'suggestion-only' }

/**
 * Map each IssueCode to the input the modal renders. Suggestion text comes
 * straight off the issue so we keep the fixture-driven copy.
 */
const INPUT_SPEC: Record<IssueCode, FixInputSpec> = {
  'required-missing': {
    kind: 'text',
    label: 'Add a value',
    placeholder: 'Type the missing value',
  },
  'max-length-exceeded': {
    kind: 'text',
    label: 'Shorten value',
    placeholder: 'Type the shortened value',
  },
  'year-invalid': {
    kind: 'number',
    label: 'Set a valid year',
    min: 1990,
    max: 2099,
    suggestion: 2024,
  },
  'date-invalid': {
    kind: 'date',
    label: 'Choose a date',
  },
  'positive-int-required': {
    kind: 'number',
    label: 'Set a positive value',
    min: 0,
    unit: 'cm',
  },
  'decimal-out-of-range': {
    kind: 'number',
    label: 'Adjust value',
    min: 3,
    max: 10,
  },
  'crop-type-unknown': {
    kind: 'choice',
    label: 'Map to Sandy crop type',
    options: [
      { value: 'winter-oilseed-rape', label: 'Winter oilseed rape' },
      { value: 'spring-oilseed-rape', label: 'Spring oilseed rape' },
      { value: 'winter-wheat', label: 'Winter wheat' },
      { value: 'winter-barley', label: 'Winter barley' },
    ],
    suggestion: 'winter-oilseed-rape',
  },
  'planting-after-harvest': { kind: 'suggestion-only' },
  'harvest-gt-total': {
    kind: 'number',
    label: 'Adjust yields',
    min: 0,
  },
  'yield-zero': {
    kind: 'number',
    label: 'Set a yield value',
    min: 0,
  },
  'crop-area-exceeds-field': {
    kind: 'number',
    label: 'Cap at field area',
    min: 0,
  },
  'duplicate-cropping': {
    kind: 'choice',
    label: 'Drop the duplicate or merge into one',
    options: [
      { value: 'drop', label: 'Drop the duplicate' },
      { value: 'merge', label: 'Merge into one' },
    ],
    suggestion: 'drop',
  },
  'duplicate-operation': {
    kind: 'choice',
    label: 'Keep both or drop one',
    options: [
      { value: 'skip', label: 'Skip (keep both as-is)' },
      { value: 'drop', label: 'Drop one' },
    ],
    suggestion: 'skip',
  },
  'duplicate-fertiliser': {
    kind: 'choice',
    label: 'Keep both or drop one',
    options: [
      { value: 'skip', label: 'Skip (keep both as-is)' },
      { value: 'drop', label: 'Drop one' },
    ],
    suggestion: 'skip',
  },
  'duplicate-farm': {
    kind: 'choice',
    label: 'Merge, rename or exclude',
    options: [
      { value: 'merge', label: 'Merge with the existing farm' },
      { value: 'rename', label: 'Rename the incoming farm' },
      { value: 'exclude', label: 'Exclude from upload' },
    ],
    suggestion: 'merge',
  },
  'orphan-operation': {
    kind: 'choice',
    label: 'Attach to existing cropping',
    options: [
      { value: 'cr-1101', label: 'CR-1101 · Winter wheat · Marlpit · 2024' },
      { value: 'cr-1107', label: 'CR-1107 · Winter wheat · Top Meadow · 2024' },
      { value: 'cr-1184', label: 'CR-1184 · Spring barley · Hayrick · 2024' },
    ],
  },
  'deletion-not-allowed': { kind: 'suggestion-only' },
}

/* -------------------------------------------------------------------------- */
/* Skip button — disabled with tooltip on blocking issues                     */
/* -------------------------------------------------------------------------- */

const SkipButton = ({
  blocking,
  onClick,
}: {
  blocking: boolean
  onClick: () => void
}) => {
  if (blocking) {
    return (
      <Tooltip content="This issue is blocking — Sandy can't import the file until it's resolved.">
        <Button variant="secondary" disabled>
          Skip
        </Button>
      </Tooltip>
    )
  }
  return (
    <Button variant="secondary" onClick={onClick}>
      Skip
    </Button>
  )
}

/* -------------------------------------------------------------------------- */
/* Suggestion banner — primary path. Sits above the manual input.             */
/* -------------------------------------------------------------------------- */

const SuggestionBanner = ({
  suggestion,
  onAccept,
}: {
  suggestion: string
  onAccept: () => void
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-border-secondary bg-bg-secondary px-4 py-3">
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Sandy suggests
      </p>
      <p className="text-md text-text-primary">{suggestion}</p>
    </div>
    <Button variant="primary" onClick={onAccept}>
      Apply suggestion
    </Button>
  </div>
)

/* -------------------------------------------------------------------------- */
/* FixInput — switches on spec.kind                                            */
/* -------------------------------------------------------------------------- */

type FixInputDraft = {
  text: string
  number: string
  date: string
  choice: string
}

const FixInput = ({
  spec,
  draft,
  setDraft,
}: {
  spec: FixInputSpec
  draft: FixInputDraft
  setDraft: (next: FixInputDraft) => void
}) => {
  if (spec.kind === 'suggestion-only') {
    return (
      <p className="text-sm text-text-secondary">
        This issue has no manual override — apply the suggestion or skip.
      </p>
    )
  }
  if (spec.kind === 'text') {
    return (
      <TextInput
        label={spec.label}
        value={draft.text}
        onValueChange={(v) => setDraft({ ...draft, text: v })}
        placeholder={spec.placeholder}
      />
    )
  }
  if (spec.kind === 'number') {
    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor="fix-modal-number"
          className="text-sm font-medium text-text-primary"
        >
          {spec.label}
          {spec.unit ? (
            <span className="ml-1 text-text-secondary">({spec.unit})</span>
          ) : null}
        </label>
        <input
          id="fix-modal-number"
          type="number"
          inputMode="decimal"
          min={spec.min}
          max={spec.max}
          value={draft.number}
          onChange={(e) => setDraft({ ...draft, number: e.target.value })}
          placeholder={spec.placeholder}
          className={clsx(
            'w-full rounded-lg border-2 border-border-tertiary bg-bg-primary px-3 py-2',
            'text-md text-text-primary placeholder:text-text-placeholder tabular-nums',
            'focus:border-border-primary focus:outline-none',
          )}
        />
        {spec.min !== undefined || spec.max !== undefined ? (
          <p className="text-xs text-text-secondary">
            Allowed range: {spec.min !== undefined ? spec.min : '−∞'} –{' '}
            {spec.max !== undefined ? spec.max : '∞'}
          </p>
        ) : null}
      </div>
    )
  }
  if (spec.kind === 'date') {
    const parsed = draft.date ? new Date(draft.date) : undefined
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text-primary">
          {spec.label}
        </span>
        <DatePicker
          mode="single"
          value={parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined}
          onValueChange={(d) =>
            setDraft({
              ...draft,
              date: d ? d.toISOString().slice(0, 10) : '',
            })
          }
        />
      </div>
    )
  }
  // choice
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-text-primary">
        {spec.label}
      </span>
      <Select<string>
        value={draft.choice}
        onValueChange={(v) => v && setDraft({ ...draft, choice: v })}
        items={spec.options}
        placeholder="Pick an option"
        clearable={false}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Modal root                                                                  */
/* -------------------------------------------------------------------------- */

export const FixIssueModal = ({
  open,
  onOpenChange,
  issue,
  onResolve,
  onSkip,
}: FixIssueModalProps) => {
  const records = AFFECTED_RECORDS[issue.id]
  const spec = INPUT_SPEC[issue.code]
  const blocking = issue.severity === 'blocking'

  const [draft, setDraft] = useState<FixInputDraft>(() => ({
    text: '',
    number:
      spec.kind === 'number' && spec.suggestion !== undefined
        ? String(spec.suggestion)
        : '',
    date: '',
    choice: spec.kind === 'choice' ? (spec.suggestion ?? '') : '',
  }))
  const [describeOpen, setDescribeOpen] = useState(false)
  const [describePrompt, setDescribePrompt] = useState('')

  const canManual = useMemo(() => {
    if (spec.kind === 'text') return draft.text.trim().length > 0
    if (spec.kind === 'number') return draft.number.trim().length > 0
    if (spec.kind === 'date') return draft.date.length > 0
    if (spec.kind === 'choice') return draft.choice.length > 0
    return false
  }, [spec, draft])

  const handleManualApply = () => {
    if (spec.kind === 'text') {
      onResolve({ kind: 'manual-value', value: draft.text.trim() })
    } else if (spec.kind === 'number') {
      onResolve({ kind: 'manual-number', value: Number(draft.number) })
    } else if (spec.kind === 'date') {
      onResolve({ kind: 'manual-date', value: draft.date })
    } else if (spec.kind === 'choice') {
      onResolve({ kind: 'manual-choice', value: draft.choice })
    }
  }

  const handleDescribeApply = () => {
    onResolve({ kind: 'describe', prompt: describePrompt })
    setDescribePrompt('')
  }

  const hasManualSurface = spec.kind !== 'suggestion-only'

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={issue.headline}
      unstyled
      maxWidth="900px"
    >
      <div className="relative flex max-h-[90vh] flex-col overflow-hidden">
        {/* Header */}
        <header className="flex flex-col gap-3 px-8 pb-5 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="text-2xl font-medium leading-9 text-text-primary">
                {issue.headline}
              </h2>
              <p className="text-sm text-text-secondary">{issue.context}</p>
            </div>
            <span
              className={clsx(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                blocking
                  ? 'bg-support-bg-red text-support-fg-red'
                  : 'bg-support-bg-amber text-support-fg-amber',
              )}
            >
              {blocking ? 'Blocking' : 'Warning'}
            </span>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 min-h-0 flex-col gap-5 overflow-y-auto px-8 pb-6">
          {records ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Affected records
              </p>
              <AffectedDataGrid records={records} severity={issue.severity} />
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <SuggestionBanner
              suggestion={issue.suggestion}
              onAccept={() => onResolve({ kind: 'apply-suggestion' })}
            />

            {hasManualSurface ? (
              <div className="flex flex-col gap-3 rounded-xl border-2 border-border-tertiary bg-bg-primary p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Or fix it yourself
                  </p>
                </div>
                <FixInput spec={spec} draft={draft} setDraft={setDraft} />
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    disabled={!canManual}
                    onClick={handleManualApply}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-2 border-t-2 border-border-tertiary px-8 py-5">
          <SkipButton blocking={blocking} onClick={onSkip} />
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setDescribeOpen(true)}>
              Describe
            </Button>
            <Button
              variant="primary"
              onClick={() => onResolve({ kind: 'apply-suggestion' })}
            >
              Apply suggestion
            </Button>
          </div>
        </footer>

        <DescribeTray
          open={describeOpen}
          onClose={() => setDescribeOpen(false)}
          title="Describe the fix"
          placeholder={`e.g. The harvest year should be 2024 — the file has a typo. Apply to all ${records ? records.before.length : ''} affected rows.`}
          hint="Sandy will read your hint and propose a fix."
          onApply={handleDescribeApply}
          portal
        />
      </div>
    </Modal>
  )
}
