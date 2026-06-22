import clsx from 'clsx'
import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Modal,
  Radio,
  RadioGroup,
  Select,
  TextInput,
} from '../../components/ui'
import {
  defaultResolutionForIssue,
  type FarmMissingIssue,
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
    if (issue.type !== 'farm-missing' && issue.type !== 'field-missing') {
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
}: IssueResolverModalProps) => {
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<Record<string, IssueState>>(() =>
    seedState(issues),
  )

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  const issue = issues[index]
  const total = issues.length
  const isFirst = index === 0
  const isLast = index === total - 1

  const update = (next: IssueState) =>
    setState((curr) => ({ ...curr, [issue.id]: next }))

  const handleNext = () => {
    if (isLast) {
      onComplete?.(state)
      onOpenChange(false)
    } else {
      setIndex((i) => Math.min(total - 1, i + 1))
    }
  }
  const handleBack = () => setIndex((i) => Math.max(0, i - 1))

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
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleBack} disabled={isFirst}>
            Back
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </>
      }
    >
      <IssueBody issue={issue} state={state[issue.id]} onChange={update} />
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
}

const IssueBody = ({ issue, state, onChange }: IssueBodyProps) => {
  if (issue.type === 'farm-missing') {
    return <FarmMissingBody issue={issue} state={state} onChange={onChange} />
  }
  if (issue.type === 'field-missing') {
    return <FieldMissingBody issue={issue} state={state} onChange={onChange} />
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
}

const FarmMissingBody = ({
  issue,
  state,
  onChange,
}: MissingBodyProps<FarmMissingIssue>) => (
  <MissingChooser
    sourceLabel="Farm"
    sourceName={issue.sourceName}
    noun="farm"
    options={issue.existingFarms}
    affects={issue.affects}
    state={state}
    onChange={onChange}
  />
)

const FieldMissingBody = ({
  issue,
  state,
  onChange,
}: MissingBodyProps<FieldMissingIssue>) => (
  <MissingChooser
    sourceLabel={`Field on ${issue.farmName}`}
    sourceName={issue.sourceName}
    noun="field"
    options={issue.existingFields}
    affects={issue.affects}
    state={state}
    onChange={onChange}
  />
)

type MissingChooserProps = {
  sourceLabel: string
  sourceName: string
  noun: 'farm' | 'field'
  options: { value: string; label: string }[]
  affects?: number
  state: IssueState
  onChange: (next: IssueState) => void
}

const MissingChooser = ({
  sourceLabel,
  sourceName,
  noun,
  options,
  affects,
  state,
  onChange,
}: MissingChooserProps) => {
  const resolution = state.resolution
  const choice = resolution.kind === 'pending' ? '' : resolution.kind

  const setChoice = (next: string) => {
    switch (next) {
      case 'remove':
        onChange({ ...state, resolution: { kind: 'remove' } })
        break
      case 'ignore':
        onChange({ ...state, resolution: { kind: 'ignore' } })
        break
      case 'create-new':
        onChange({
          ...state,
          resolution: { kind: 'create-new', name: sourceName },
        })
        break
      case 'match-existing':
        onChange({
          ...state,
          resolution: { kind: 'match-existing', value: '' },
        })
        break
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-secondary">
          {sourceLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl font-semibold text-text-primary">
            {sourceName}
          </p>
          <Badge tone="red" size="sm">
            Not recognised
          </Badge>
          {affects && affects > 1 ? (
            <Badge tone="neutral" size="sm">
              Applies to {affects.toLocaleString()} records
            </Badge>
          ) : null}
        </div>
      </div>

      <RadioGroup
        label="How should we handle it?"
        value={choice}
        onValueChange={setChoice}
      >
        <Radio
          value="match-existing"
          label="Replace"
          description={`Replace with your existing ${noun} on Sandy.`}
        />
        {resolution.kind === 'match-existing' ? (
          <div className="pl-7">
            <Select
              items={options}
              placeholder={`Select a ${noun}`}
              value={resolution.value || null}
              onValueChange={(value) =>
                onChange({
                  ...state,
                  resolution: { kind: 'match-existing', value: value ?? '' },
                })
              }
            />
          </div>
        ) : null}
        <Radio
          value="create-new"
          label={`Create a new ${noun}`}
          description={`We'll add "${sourceName}" to your ${noun}s.`}
        />
        {resolution.kind === 'create-new' ? (
          <div className="pl-7">
            <TextInput
              label="Name"
              value={resolution.name}
              onValueChange={(name) =>
                onChange({
                  ...state,
                  resolution: { kind: 'create-new', name },
                })
              }
            />
          </div>
        ) : null}
        <Radio
          value="remove"
          label="Remove from this import"
          description={`Drop the ${noun} and any rows referring to it.`}
        />
        <Radio
          value="ignore"
          label="Ignore"
          description={`Keep the ${noun} as-is and skip this issue for now.`}
        />
      </RadioGroup>
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
