import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Badge, Button, Modal, Select } from '../../components/ui'
import {
  defaultResolutionForIssue,
  type FarmMissingIssue,
  type FieldMissingBatchIssue,
  type FieldMissingIssue,
  type Issue,
  type MappingIssue,
  type Resolution,
} from './issues'

type IssueResolverModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  issues: Issue[]
  onComplete?: (resolutions: Record<string, IssueState>) => void
  /**
   * When the consumer owns the resolution map (so the IssuesTable can show
   * resolved/ignored state outside the modal) it supplies `state` and an
   * `onStateChange` callback. Falls back to internal state for callers that
   * don't need the live map.
   */
  state?: Record<string, IssueState>
  onStateChange?: (next: Record<string, IssueState>) => void
  /** Open the modal focused on a specific issue id. */
  focusIssueId?: string | null
}

/**
 * Per-issue resolver state. For mapping issues each row carries its own
 * chosen system value; for farm/field issues the single `Resolution` covers
 * the whole issue. We keep them in the same map keyed by issue id so the
 * parent doesn't have to know each issue type.
 */
export type IssueState = {
  resolution: Resolution
  /** Row-level resolutions for mapping issues (rowId -> resolution). */
  rows?: Record<string, Resolution>
}

const seedState = (issues: Issue[]): Record<string, IssueState> => {
  const out: Record<string, IssueState> = {}
  for (const issue of issues) {
    out[issue.id] = { resolution: defaultResolutionForIssue(issue) }
    // Only mapping-style issues carry per-row sub-resolutions. Farm / field
    // (single + batch) all use the single resolution on the issue.
    const isMapping =
      issue.type !== 'farm-missing' &&
      issue.type !== 'field-missing' &&
      issue.type !== 'field-missing-batch'
    if (isMapping) {
      const rows: Record<string, Resolution> = {}
      for (const row of issue.rows) {
        // Mapping rows default to accepting Sandy's prediction so the
        // happy path is "click through" — the user only stops on the
        // ones they want to override.
        rows[row.id] = row.prediction
          ? { kind: 'match-existing', value: row.prediction.value }
          : { kind: 'pending' }
      }
      out[issue.id] = { ...out[issue.id], rows }
    }
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Resolver root                                                               */
/* -------------------------------------------------------------------------- */

export const IssueResolverModal = ({
  open,
  onOpenChange,
  issues,
  onComplete,
  state: externalState,
  onStateChange,
  focusIssueId,
}: IssueResolverModalProps) => {
  const [index, setIndex] = useState(0)
  const [internalState, setInternalState] = useState<
    Record<string, IssueState>
  >(() => seedState(issues))

  // Use the lifted state when supplied, otherwise fall back to local state so
  // existing call sites (without onStateChange) keep working.
  const state = externalState ?? internalState
  const writeState = (next: Record<string, IssueState>) => {
    setInternalState(next)
    onStateChange?.(next)
  }

  useEffect(() => {
    if (!open) return
    if (focusIssueId) {
      const i = issues.findIndex((iss) => iss.id === focusIssueId)
      setIndex(i >= 0 ? i : 0)
    } else {
      setIndex(0)
    }
  }, [open, focusIssueId, issues])

  const issue = issues[index]
  const total = issues.length
  const isLast = index === total - 1

  // Fall back to a freshly-seeded resolution for the active issue so the UI
  // has something to render before the user has interacted. This stays local
  // — we only push to the lifted state when the user explicitly commits via
  // an action button.
  const effectiveIssueState: IssueState = state[issue.id] ?? {
    resolution: defaultResolutionForIssue(issue),
  }
  const update = (next: IssueState) =>
    writeState({ ...state, [issue.id]: next })

  // The action buttons inside the body drive forward motion. When there's no
  // next issue we close the modal and notify the parent that the walker has
  // finished, mirroring the old "Finish" button's behaviour.
  const handleNext = () => {
    if (isLast) {
      onComplete?.(state)
      onOpenChange(false)
    } else {
      setIndex((i) => Math.min(total - 1, i + 1))
    }
  }

  const progressPct = total ? ((index + 1) / total) * 100 : 0

  if (!issue) return null

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={issue.title}
      maxWidth="720px"
      topBar={
        <div aria-hidden="true" className="h-1.5 w-full bg-bg-tertiary">
          <div
            className="h-full bg-bg-brand-primary transition-[width] duration-200 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      }
    >
      <IssueBody
        issue={issue}
        state={effectiveIssueState}
        onChange={update}
        onResolve={handleNext}
      />
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Issue body dispatcher                                                       */
/* -------------------------------------------------------------------------- */

type IssueBodyProps = {
  issue: Issue
  state: IssueState
  onChange: (next: IssueState) => void
  /** Mark this issue resolved and advance to the next. */
  onResolve: () => void
}

const IssueBody = ({ issue, state, onChange, onResolve }: IssueBodyProps) => {
  if (issue.type === 'farm-missing') {
    return (
      <FarmMissingBody
        issue={issue}
        state={state}
        onChange={onChange}
        onResolve={onResolve}
      />
    )
  }
  if (issue.type === 'field-missing') {
    return (
      <FieldMissingBody
        issue={issue}
        state={state}
        onChange={onChange}
        onResolve={onResolve}
      />
    )
  }
  if (issue.type === 'field-missing-batch') {
    return (
      <FieldMissingBatchBody
        issue={issue}
        state={state}
        onChange={onChange}
        onResolve={onResolve}
      />
    )
  }
  return <MappingBody issue={issue} state={state} onChange={onChange} />
}

/* -------------------------------------------------------------------------- */
/* Farm / field missing                                                        */
/* -------------------------------------------------------------------------- */

type MissingBodyProps<I extends FarmMissingIssue | FieldMissingIssue> = {
  issue: I
  state: IssueState
  onChange: (next: IssueState) => void
  onResolve: () => void
}

const FarmMissingBody = ({
  issue,
  state,
  onChange,
  onResolve,
}: MissingBodyProps<FarmMissingIssue>) => (
  <MissingChooser
    sourceName={issue.sourceName}
    noun="farm"
    options={issue.existingFarms}
    affects={issue.affects}
    state={state}
    onChange={onChange}
    onResolve={onResolve}
  />
)

const FieldMissingBody = ({
  issue,
  state,
  onChange,
  onResolve,
}: MissingBodyProps<FieldMissingIssue>) => (
  <MissingChooser
    sourceName={issue.sourceName}
    context={`On ${issue.farmName}`}
    noun="field"
    options={issue.existingFields}
    affects={issue.affects}
    state={state}
    onChange={onChange}
    onResolve={onResolve}
  />
)

type MissingChooserProps = {
  sourceName: string
  context?: string
  noun: 'farm' | 'field'
  options: { value: string; label: string }[]
  affects?: number
  state: IssueState
  onChange: (next: IssueState) => void
  onResolve: () => void
}

const MissingChooser = ({
  sourceName,
  context,
  noun,
  options,
  affects,
  state,
  onChange,
  onResolve,
}: MissingChooserProps) => {
  // Selected match value drives the Use-this-match action. Seeded by
  // defaultResolutionForIssue; the user can swap via the dropdown.
  const selectedValue =
    state.resolution.kind === 'match-existing' ? state.resolution.value : ''

  const setMatch = (value: string) =>
    onChange({ ...state, resolution: { kind: 'match-existing', value } })

  return (
    <div className="flex flex-col gap-6">
      {/* Source row — small label, big bold name */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.15px] text-text-secondary">
          We found in your data
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2xl font-semibold leading-9 text-text-primary">
            {sourceName}
          </p>
          <Badge tone="red" size="sm">
            Unknown {noun}
          </Badge>
          {context ? (
            <span className="text-md text-text-secondary">{context}</span>
          ) : null}
          {affects && affects > 1 ? (
            <Badge tone="neutral" size="sm">
              {affects.toLocaleString()} records
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Close-match dropdown — just the Select, with its own label. */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.15px] text-text-secondary">
          Closest match
        </p>
        <Select
          items={options}
          placeholder={`Select a ${noun}`}
          value={selectedValue || null}
          onValueChange={(value) => setMatch(value ?? '')}
          clearable={false}
        />
      </div>

      {/* Action — primary "Use this match" only when a value is selected. */}
      {selectedValue ? (
        <div className="flex justify-center">
          <Button
            variant="primary"
            onClick={() => {
              setMatch(selectedValue)
              onResolve()
            }}
          >
            Use this match
          </Button>
        </div>
      ) : null}

      {/* "or" divider separating the match flow from the create-new path. */}
      <OrDivider />

      {/* Create-new path (handed off to the side sheet in a later batch). */}
      <div className="flex justify-center">
        <Button
          variant="secondary"
          onClick={() => {
            onChange({
              ...state,
              resolution: { kind: 'create-new', name: sourceName },
            })
            onResolve()
          }}
        >
          Create new {noun}
        </Button>
      </div>
    </div>
  )
}

/** "or" rule used to split alternative resolution paths within an issue. */
const OrDivider = () => (
  <div aria-hidden="true" className="flex items-center gap-3">
    <span className="h-px flex-1 bg-border-tertiary" />
    <span className="text-sm font-semibold text-text-secondary">or</span>
    <span className="h-px flex-1 bg-border-tertiary" />
  </div>
)

/* -------------------------------------------------------------------------- */
/* Field missing — batch path                                                  */
/* -------------------------------------------------------------------------- */

type FieldBatchBodyProps = {
  issue: FieldMissingBatchIssue
  state: IssueState
  onChange: (next: IssueState) => void
  onResolve: () => void
}

const FieldMissingBatchBody = ({
  issue,
  state,
  onChange,
  onResolve,
}: FieldBatchBodyProps) => {
  const selectedValue =
    state.resolution.kind === 'match-existing' ? state.resolution.value : ''

  const setMatch = (value: string) =>
    onChange({ ...state, resolution: { kind: 'match-existing', value } })

  return (
    <div className="flex flex-col gap-6">
      {/* Source row — N unknown fields, with the suggested farm name as
          context so the batch decision feels grounded. */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.15px] text-text-secondary">
          We found in your data
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2xl font-semibold leading-9 text-text-primary">
            {issue.sourceNames.length} unknown fields
          </p>
          <Badge tone="red" size="sm">
            Not recognised
          </Badge>
          {issue.suggestedFarmName ? (
            <span className="text-md text-text-secondary">
              Likely from {issue.suggestedFarmName}
            </span>
          ) : null}
        </div>

        {/* The list of detected field names — kept compact so the modal
            stays scannable; the count is the headline. */}
        <ul className="flex flex-wrap gap-2 pt-2">
          {issue.sourceNames.map((name) => (
            <li
              key={name}
              className="rounded-md border-2 border-border-tertiary bg-bg-secondary px-2 py-1 text-sm text-text-primary"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>

      {/* Target farm dropdown — single decision applied to the whole batch. */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.15px] text-text-secondary">
          Attach all of these fields to
        </p>
        <Select
          items={issue.existingFarms}
          placeholder="Select a farm"
          value={selectedValue || null}
          onValueChange={(value) => setMatch(value ?? '')}
          clearable={false}
        />
      </div>

      {/* Primary action — only when a farm is picked. */}
      {selectedValue ? (
        <div className="flex justify-center">
          <Button
            variant="primary"
            onClick={() => {
              setMatch(selectedValue)
              onResolve()
            }}
          >
            Attach {issue.sourceNames.length} fields
          </Button>
        </div>
      ) : null}

      <OrDivider />

      <div className="flex justify-center">
        <Button
          variant="secondary"
          onClick={() => {
            onChange({
              ...state,
              // The create-new name is unused for the batch — the side sheet
              // handles the "draw / pick on map" flow in a later batch.
              resolution: { kind: 'create-new', name: '' },
            })
            onResolve()
          }}
        >
          Pick fields on a map
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Mapping issues (crop variety / product unit / operation / crop type / tillage) */
/* -------------------------------------------------------------------------- */

type MappingBodyProps = {
  issue: MappingIssue
  state: IssueState
  onChange: (next: IssueState) => void
}

const MappingBody = ({ issue, state, onChange }: MappingBodyProps) => {
  const rows = state.rows ?? {}
  const updateRow = (rowId: string, value: string) => {
    onChange({
      ...state,
      rows: { ...rows, [rowId]: { kind: 'match-existing', value } },
    })
  }
  const removeRow = (rowId: string) => {
    onChange({
      ...state,
      rows: { ...rows, [rowId]: { kind: 'remove' } },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ColumnHeader />
      <ul className="flex flex-col divide-y-2 divide-border-tertiary">
        {issue.rows.map((row) => {
          const resolution = rows[row.id] ?? { kind: 'pending' }
          const isRemoved = resolution.kind === 'remove'
          const selectedValue =
            resolution.kind === 'match-existing' ? resolution.value : ''
          return (
            <li
              key={row.id}
              className={clsx(
                'grid grid-cols-[1fr_auto] items-center gap-4 py-3 first:pt-0 last:pb-0',
                isRemoved && 'opacity-50',
              )}
            >
              <div className="grid grid-cols-2 gap-4 min-w-0">
                <SourcePair values={row.source} affects={row.affects} />
                <TargetPicker
                  options={row.options}
                  value={selectedValue}
                  onChange={(value) => updateRow(row.id, value)}
                  disabled={isRemoved}
                />
              </div>
              <RowActionButton
                isRemoved={isRemoved}
                onClick={() =>
                  isRemoved
                    ? updateRow(
                        row.id,
                        row.prediction?.value ?? row.options[0]?.value ?? '',
                      )
                    : removeRow(row.id)
                }
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const ColumnHeader = () => (
  <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b-2 border-border-tertiary pb-2">
    <div className="grid grid-cols-2 gap-4">
      <p className="text-sm font-semibold text-text-secondary">
        Original value
      </p>
      <p className="text-sm font-semibold text-text-secondary">
        Suggested replacement
      </p>
    </div>
    <span className="sr-only">Actions</span>
  </div>
)

const SourcePair = ({
  values,
  affects,
}: {
  values: [string, string]
  affects?: number
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <p className="truncate text-md font-medium text-text-primary">
      {values[0] || '—'}
    </p>
    {values[1] ? (
      <p className="truncate text-sm text-text-secondary">{values[1]}</p>
    ) : null}
    {affects && affects > 1 ? (
      <p className="text-xs font-semibold tabular-nums text-text-secondary">
        Applies to {affects.toLocaleString()} records
      </p>
    ) : null}
  </div>
)

const TargetPicker = ({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) => (
  <Select
    items={options}
    value={value || null}
    onValueChange={(next) => onChange(next ?? '')}
    placeholder="Select a value"
    disabled={disabled}
    searchable
  />
)

/* -------------------------------------------------------------------------- */
/* Row action button (square, icon-only)                                       */
/* -------------------------------------------------------------------------- */

const TrashIcon = () => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: parent button carries the aria-label
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const RestoreIcon = () => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: parent button carries the aria-label
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M5 11a7 7 0 1 1 2.05 4.95"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 5v6h6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const RowActionButton = ({
  isRemoved,
  onClick,
}: {
  isRemoved: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={isRemoved ? 'Restore row' : 'Remove row'}
    className={clsx(
      'grid size-9 shrink-0 place-items-center rounded-md border-2 transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      isRemoved
        ? 'border-border-secondary bg-bg-primary text-icon-secondary hover:border-border-secondary-hover hover:text-icon-primary'
        : 'border-border-secondary bg-bg-primary text-icon-secondary hover:border-border-danger hover:text-text-danger',
    )}
  >
    {isRemoved ? <RestoreIcon /> : <TrashIcon />}
  </button>
)
