import { useState } from 'react'
import { Button, Select, TextInput } from '../../../components/ui'
import type { IssueState } from '../IssueResolverModal'
import { IssueBody } from '../IssueResolverModal'
import {
  defaultResolutionForIssue,
  type FarmMissingIssue,
  type FieldMissingBatchIssue,
  type FieldMissingIssue,
  type Issue,
  type SchemaTransformationIssue,
  type ValueMappingIssue,
} from '../issues'
import { EXAMPLE_WORKBOOK } from '../schema-transformation'
import type { IssuePanel } from './IssueModal'
import { IssueToken } from './IssueToken'
import type { CellHighlight, IssueAdapter } from './issue-adapter'

/* -------------------------------------------------------------------------- */
/* Demo highlights — used by the data table inside the IssueModal              */
/* -------------------------------------------------------------------------- */

const FARM_SOURCE_SHEET = 'Fields_Crops'
const FARM_SOURCE_COLUMN = 'intrafarm'
const FIELD_SOURCE_SHEET = 'PRD_Fertilizers'
const FIELD_SOURCE_COLUMN = 'fieldName'

/* -------------------------------------------------------------------------- */
/* Resolved-label helper                                                       */
/* -------------------------------------------------------------------------- */

const matchLabel = (
  state: IssueState,
  options: { value: string; label: string }[],
): string | null => {
  const r = state.resolution
  if (r.kind !== 'match-existing' || !r.value) return null
  const opt = options.find((o) => o.value === r.value)
  return opt ? `Matched to ${opt.label}` : 'Matched'
}

/* -------------------------------------------------------------------------- */
/* Shared "options" panel composer — chunky option list for the No flow        */
/* -------------------------------------------------------------------------- */

type OptionsListPanelParams = {
  title: string
  options: {
    id: string
    title: string
    description?: string
    tone?: 'default' | 'danger'
    panel: IssuePanel
  }[]
}

const buildOptionsPanel = (
  params: OptionsListPanelParams,
  nav: { push: (p: IssuePanel) => void; pop: () => void },
): IssuePanel => ({
  id: 'options',
  title: params.title,
  body: (
    <div className="flex flex-col gap-3">
      {params.options.map((opt) => (
        <OptionRow
          key={opt.id}
          title={opt.title}
          description={opt.description}
          tone={opt.tone}
          onClick={() => nav.push(opt.panel)}
        />
      ))}
    </div>
  ),
  // No bottom-pinned actions on this panel — option rows are the actions.
  actions: <span />,
})

const OptionRow = ({
  title,
  description,
  tone = 'default',
  onClick,
}: {
  title: string
  description?: string
  tone?: 'default' | 'danger'
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      tone === 'danger'
        ? 'flex w-full flex-col gap-1 rounded-xl border-2 border-border-tertiary px-5 py-4 text-left text-support-fg-red transition-colors hover:border-support-fg-red hover:bg-support-bg-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40'
        : 'flex w-full flex-col gap-1 rounded-xl border-2 border-border-tertiary px-5 py-4 text-left text-text-primary transition-colors hover:border-border-secondary-hover hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40'
    }
  >
    <span className="text-md font-semibold">{title}</span>
    {description ? (
      <span className="text-sm text-text-secondary">{description}</span>
    ) : null}
  </button>
)

/* -------------------------------------------------------------------------- */
/* Inner panel renderers — shared by farm/field/batch adapters                 */
/* -------------------------------------------------------------------------- */

const SelectMatchBody = ({
  options,
  placeholder,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  placeholder: string
  value: string | null
  onChange: (next: string | null) => void
}) => (
  <Select
    items={options}
    value={value}
    onValueChange={(next) => onChange(next ?? null)}
    placeholder={placeholder}
    clearable={false}
  />
)

const ExcludeConfirmBody = ({ summary }: { summary: string }) => (
  <p className="text-md text-text-primary">{summary} Confirm?</p>
)

const CreateNewBody = ({
  label,
  name,
  onChange,
}: {
  label: string
  name: string
  onChange: (next: string) => void
}) => (
  <TextInput
    label={label}
    value={name}
    onValueChange={onChange}
    placeholder="Type a name"
  />
)

/* -------------------------------------------------------------------------- */
/* Farm missing                                                                */
/* -------------------------------------------------------------------------- */

export const farmMissingAdapter: IssueAdapter = {
  problem: (raw) => {
    const issue = raw as FarmMissingIssue
    return (
      <p>
        We couldn't recognise the farm{' '}
        <IssueToken>{issue.sourceName}</IssueToken>.
      </p>
    )
  },
  solution: (raw) => {
    const issue = raw as FarmMissingIssue
    const seed = defaultResolutionForIssue(issue)
    const suggestionId = seed.kind === 'match-existing' ? seed.value : null
    const suggestion = suggestionId
      ? issue.existingFarms.find((f) => f.value === suggestionId)?.label
      : null
    if (!suggestion) return null
    return (
      <p>
        Did you mean <IssueToken tone="success">{suggestion}</IssueToken>?
      </p>
    )
  },
  acceptSuggestion: (raw) => {
    const issue = raw as FarmMissingIssue
    const seed = defaultResolutionForIssue(issue)
    if (seed.kind !== 'match-existing' || !seed.value) return null
    return { resolution: seed }
  },
  affected: () => ({
    sheetName: FARM_SOURCE_SHEET,
    highlights: [
      {
        sheet: FARM_SOURCE_SHEET,
        column: FARM_SOURCE_COLUMN,
        role: 'source',
      },
    ],
    source: {
      filename: EXAMPLE_WORKBOOK.filename,
      dataCategory: 'Operations',
      fileKind: 'spreadsheet',
      location: FARM_SOURCE_SHEET,
    },
  }),
  resolvedLabel: (state, raw) => {
    const issue = raw as FarmMissingIssue
    if (state.resolution.kind === 'ignore') return 'Excluded from upload'
    if (state.resolution.kind === 'create-new')
      return `Created "${state.resolution.name}"`
    return matchLabel(state, issue.existingFarms)
  },
  optionsPanel: (raw, commit) => {
    const issue = raw as FarmMissingIssue
    // The options panel needs access to nav so it can push the deeper
    // confirm panels. Since IssuePanel is plain data, we defer the
    // composition to a function the modal will call with nav.
    return makeOptionsPanelForIssue(issue, commit, {
      noun: 'farm',
      sourceName: issue.sourceName,
      options: issue.existingFarms,
      affectsCount: issue.affects,
    })
  },
}

/* -------------------------------------------------------------------------- */
/* Field missing (single)                                                      */
/* -------------------------------------------------------------------------- */

export const fieldMissingAdapter: IssueAdapter = {
  problem: (raw) => {
    const issue = raw as FieldMissingIssue
    return (
      <p>
        We couldn't recognise the field{' '}
        <IssueToken>{issue.sourceName}</IssueToken> on{' '}
        <IssueToken>{issue.farmName}</IssueToken>.
      </p>
    )
  },
  solution: (raw) => {
    const issue = raw as FieldMissingIssue
    const seed = defaultResolutionForIssue(issue)
    const suggestionId = seed.kind === 'match-existing' ? seed.value : null
    const suggestion = suggestionId
      ? issue.existingFields.find((f) => f.value === suggestionId)?.label
      : null
    if (!suggestion) return null
    return (
      <p>
        Did you mean <IssueToken tone="success">{suggestion}</IssueToken>?
      </p>
    )
  },
  acceptSuggestion: (raw) => {
    const issue = raw as FieldMissingIssue
    const seed = defaultResolutionForIssue(issue)
    if (seed.kind !== 'match-existing' || !seed.value) return null
    return { resolution: seed }
  },
  affected: () => ({
    sheetName: FIELD_SOURCE_SHEET,
    highlights: [
      {
        sheet: FIELD_SOURCE_SHEET,
        column: FIELD_SOURCE_COLUMN,
        role: 'source',
      },
    ],
    source: {
      filename: EXAMPLE_WORKBOOK.filename,
      dataCategory: 'Operations',
      fileKind: 'spreadsheet',
      location: FIELD_SOURCE_SHEET,
    },
  }),
  resolvedLabel: (state, raw) => {
    const issue = raw as FieldMissingIssue
    if (state.resolution.kind === 'ignore') return 'Excluded from upload'
    if (state.resolution.kind === 'create-new')
      return `Created "${state.resolution.name}"`
    return matchLabel(state, issue.existingFields)
  },
  optionsPanel: (raw, commit) => {
    const issue = raw as FieldMissingIssue
    return makeOptionsPanelForIssue(issue, commit, {
      noun: 'field',
      sourceName: issue.sourceName,
      options: issue.existingFields,
      affectsCount: issue.affects,
    })
  },
}

/* -------------------------------------------------------------------------- */
/* Field missing — batch                                                       */
/* -------------------------------------------------------------------------- */

export const fieldMissingBatchAdapter: IssueAdapter = {
  problem: (raw) => {
    const issue = raw as FieldMissingBatchIssue
    const n = issue.sourceNames.length
    return (
      <p>
        We found <IssueToken>{n} unknown fields</IssueToken>.
      </p>
    )
  },
  solution: (raw) => {
    const issue = raw as FieldMissingBatchIssue
    if (!issue.suggestedFarmName) {
      return <p>Where should we attach them?</p>
    }
    return (
      <p>
        Should they belong to{' '}
        <IssueToken tone="success">{issue.suggestedFarmName}</IssueToken>?
      </p>
    )
  },
  acceptSuggestion: (raw) => {
    const issue = raw as FieldMissingBatchIssue
    const seed = defaultResolutionForIssue(issue)
    if (seed.kind !== 'match-existing' || !seed.value) return null
    return { resolution: seed }
  },
  affected: () => ({
    sheetName: FIELD_SOURCE_SHEET,
    highlights: [
      {
        sheet: FIELD_SOURCE_SHEET,
        column: FIELD_SOURCE_COLUMN,
        role: 'source',
      },
    ],
    source: {
      filename: EXAMPLE_WORKBOOK.filename,
      dataCategory: 'Operations',
      fileKind: 'spreadsheet',
      location: FIELD_SOURCE_SHEET,
    },
  }),
  resolvedLabel: (state, raw) => {
    const issue = raw as FieldMissingBatchIssue
    if (state.resolution.kind === 'ignore') return 'Excluded from upload'
    if (state.resolution.kind === 'create-new') return 'Created new fields'
    return matchLabel(state, issue.existingFarms)
  },
  optionsPanel: (raw, commit) => {
    const issue = raw as FieldMissingBatchIssue
    return makeBatchOptionsPanel(issue, commit)
  },
}

/* -------------------------------------------------------------------------- */
/* Schema transformation — root panel hosts the rule editor directly           */
/* -------------------------------------------------------------------------- */

export const schemaAdapter: IssueAdapter = {
  problem: (raw) => {
    const issue = raw as SchemaTransformationIssue
    return (
      <p>
        Help us understand the layout of{' '}
        <IssueToken>{issue.sheetName}</IssueToken> in{' '}
        <IssueToken>{issue.filename}</IssueToken>.
      </p>
    )
  },
  solution: () => null,
  acceptSuggestion: () => null,
  affected: (raw) => {
    const issue = raw as SchemaTransformationIssue
    return {
      sheetName: issue.sheetName,
      highlights: [],
      source: {
        filename: issue.filename,
        dataCategory: issue.dataCategory,
        fileKind: 'spreadsheet',
        location: issue.sheetName,
      },
    }
  },
  resolvedLabel: (state) => {
    if (state.resolution.kind !== 'rule-program') return null
    const program = state.resolution.program as
      | { rules?: Record<string, unknown> }
      | undefined
    if (!program?.rules || Object.keys(program.rules).length === 0) return null
    return 'Mapping saved'
  },
  optionsPanel: (raw, commit) => {
    const issue = raw as SchemaTransformationIssue
    return {
      id: 'schema-resolve',
      title: 'Map your file structure',
      body: (
        <IssueBody
          issue={issue}
          state={{ resolution: defaultResolutionForIssue(issue) }}
          onChange={(next) => commit(next)}
          onResolve={() => {
            // The schema rule editor closes itself when the user hits its
            // own Save and continue — commit hasn't fired in that path,
            // so we exit the modal here via the panel-stack pop. The
            // modal's own close X is still available.
          }}
        />
      ),
      actions: <span />,
    }
  },
}

/* -------------------------------------------------------------------------- */
/* Value mapping — root panel hosts the value-mapping editor + cell highlights */
/* -------------------------------------------------------------------------- */

export const valueMappingAdapter: IssueAdapter = {
  problem: (raw) => {
    const issue = raw as ValueMappingIssue
    const n = issue.sourceValues.length
    return (
      <p>
        We spotted{' '}
        <IssueToken>
          {n} unknown {n === 1 ? 'value' : 'values'}
        </IssueToken>{' '}
        in <IssueToken>{issue.sourceColumn}</IssueToken>. Help us map them to{' '}
        <IssueToken>{issue.targetLabel}</IssueToken>.
      </p>
    )
  },
  solution: () => null,
  acceptSuggestion: () => null,
  affected: (raw) => {
    const issue = raw as ValueMappingIssue
    // Value-mapping issues live on a workbook sheet where the source column
    // contains the unknown values. Compute cell highlights for every row
    // whose source cell matches one of the unknown values.
    const fallbackSheet =
      EXAMPLE_WORKBOOK.sheets.find((s) =>
        s.columns.some((c) => c.name === issue.sourceColumn),
      ) ?? EXAMPLE_WORKBOOK.sheets[0]
    const unknownSet = new Set(
      issue.sourceValues.map((v) => v.value.toLowerCase()),
    )
    const cellHighlights: CellHighlight[] = []
    fallbackSheet.sampleRows.forEach((row, rowIndex) => {
      const cell = row[issue.sourceColumn]
      if (cell && unknownSet.has(cell.toLowerCase())) {
        cellHighlights.push({ rowIndex, column: issue.sourceColumn })
      }
    })
    return {
      sheetName: fallbackSheet.name,
      highlights: [
        {
          sheet: fallbackSheet.name,
          column: issue.sourceColumn,
          role: 'source',
        },
      ],
      cellHighlights,
      source: {
        filename: EXAMPLE_WORKBOOK.filename,
        dataCategory: 'Operations',
        fileKind: 'spreadsheet',
        location: fallbackSheet.name,
      },
    }
  },
  resolvedLabel: (state) => {
    if (state.resolution.kind !== 'value-mapping') return null
    const decisions = state.resolution.decisions as
      | Record<string, { kind: string; canonicalValue?: string }>
      | undefined
    if (!decisions) return null
    const total = Object.keys(decisions).length
    const decided = Object.values(decisions).filter(
      (d) => (d.kind === 'map' && !!d.canonicalValue) || d.kind === 'create',
    ).length
    return decided === total
      ? 'All values mapped'
      : `${decided}/${total} mapped`
  },
  optionsPanel: (raw, commit) => {
    const issue = raw as ValueMappingIssue
    return {
      id: 'value-mapping-resolve',
      title: 'Map values',
      body: <ValueMappingPanelBody issue={issue} commit={commit} />,
      actions: <span />,
    }
  },
}

/**
 * Stateful wrapper around the legacy IssueBody renderer. Keeps the user's
 * in-flight edits in local state so editing a dropdown doesn't fire the
 * parent's `commit` (which would close the modal). Only Confirm commits.
 */
const ValueMappingPanelBody = ({
  issue,
  commit,
}: {
  issue: ValueMappingIssue
  commit: (next: IssueState) => void
}) => {
  const [draft, setDraft] = useState<IssueState>({
    resolution: defaultResolutionForIssue(issue),
  })
  return (
    <IssueBody
      issue={issue}
      state={draft}
      onChange={(next) => setDraft(next)}
      onResolve={() => commit(draft)}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Registry                                                                    */
/* -------------------------------------------------------------------------- */

export const adapterFor = (issue: Issue): IssueAdapter | null => {
  switch (issue.type) {
    case 'farm-missing':
      return farmMissingAdapter
    case 'field-missing':
      return fieldMissingAdapter
    case 'field-missing-batch':
      return fieldMissingBatchAdapter
    case 'schema-transformation':
      return schemaAdapter
    case 'value-mapping':
      return valueMappingAdapter
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/* Shared option-panel builders for farm + field issues                        */
/* -------------------------------------------------------------------------- */

type SharedOptionsConfig = {
  noun: 'farm' | 'field'
  sourceName: string
  options: { value: string; label: string }[]
  affectsCount?: number
}

const makeOptionsPanelForIssue = (
  _issue: Issue,
  commit: (next: IssueState) => void,
  cfg: SharedOptionsConfig,
): IssuePanel => ({
  id: `${cfg.noun}-options`,
  title: `How should we handle this ${cfg.noun}?`,
  body: <SharedOptionsBody cfg={cfg} commit={commit} />,
  actions: <span />,
})

const SharedOptionsBody = ({
  cfg,
  commit,
}: {
  cfg: SharedOptionsConfig
  commit: (next: IssueState) => void
}) => {
  const [stage, setStage] = useState<'root' | 'select' | 'create' | 'exclude'>(
    'root',
  )
  const [selectValue, setSelectValue] = useState<string | null>(null)
  const [createName, setCreateName] = useState<string>(cfg.sourceName)

  if (stage === 'select') {
    return (
      <div className="flex flex-col gap-5">
        <SelectMatchBody
          options={cfg.options}
          placeholder={`Select a ${cfg.noun}`}
          value={selectValue}
          onChange={setSelectValue}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStage('root')}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={!selectValue}
            onClick={() =>
              selectValue &&
              commit({
                resolution: { kind: 'match-existing', value: selectValue },
              })
            }
          >
            Confirm
          </Button>
        </div>
      </div>
    )
  }

  if (stage === 'create') {
    return (
      <div className="flex flex-col gap-5">
        <CreateNewBody
          label={`${cfg.noun === 'farm' ? 'Farm' : 'Field'} name`}
          name={createName}
          onChange={setCreateName}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStage('root')}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={!createName.trim()}
            onClick={() =>
              commit({
                resolution: { kind: 'create-new', name: createName.trim() },
              })
            }
          >
            Create
          </Button>
        </div>
      </div>
    )
  }

  if (stage === 'exclude') {
    return (
      <div className="flex flex-col gap-5">
        <ExcludeConfirmBody
          summary={`This ${cfg.noun} references ${
            cfg.affectsCount?.toLocaleString() ?? 'an unknown number of'
          } records.`}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStage('root')}>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => commit({ resolution: { kind: 'ignore' } })}
          >
            Exclude
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <OptionRow
        title={`Select another ${cfg.noun}`}
        description={`Match this to a ${cfg.noun} that already exists on Sandy.`}
        onClick={() => setStage('select')}
      />
      <OptionRow
        title={`Create a new ${cfg.noun}`}
        description={`Add ${cfg.sourceName} as a new ${cfg.noun} on Sandy.`}
        onClick={() => setStage('create')}
      />
      <OptionRow
        title={`Exclude this ${cfg.noun} from the upload`}
        description="Skip every row that references it."
        tone="danger"
        onClick={() => setStage('exclude')}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Batch options panel — separate because the options differ                    */
/* -------------------------------------------------------------------------- */

const makeBatchOptionsPanel = (
  issue: FieldMissingBatchIssue,
  commit: (next: IssueState) => void,
): IssuePanel => ({
  id: 'batch-options',
  title: 'How should we handle these fields?',
  body: <BatchOptionsBody issue={issue} commit={commit} />,
  actions: <span />,
})

const BatchOptionsBody = ({
  issue,
  commit,
}: {
  issue: FieldMissingBatchIssue
  commit: (next: IssueState) => void
}) => {
  const [stage, setStage] = useState<'root' | 'select' | 'exclude'>('root')
  const [value, setValue] = useState<string | null>(null)

  if (stage === 'select') {
    return (
      <div className="flex flex-col gap-5">
        <SelectMatchBody
          options={issue.existingFarms}
          placeholder="Select a farm"
          value={value}
          onChange={setValue}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStage('root')}>
            Back
          </Button>
          <Button
            variant="primary"
            disabled={!value}
            onClick={() =>
              value && commit({ resolution: { kind: 'match-existing', value } })
            }
          >
            Confirm
          </Button>
        </div>
      </div>
    )
  }

  if (stage === 'exclude') {
    return (
      <div className="flex flex-col gap-5">
        <ExcludeConfirmBody
          summary={`${issue.sourceNames.length} fields will be skipped along with every row that references them.`}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setStage('root')}>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => commit({ resolution: { kind: 'ignore' } })}
          >
            Exclude
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <OptionRow
        title="Attach to another farm"
        description="Pick the farm these fields belong to."
        onClick={() => setStage('select')}
      />
      <OptionRow
        title="Create new fields"
        description="Add these as new fields under the suggested farm."
        onClick={() => {
          commit({ resolution: { kind: 'create-new', name: '' } })
        }}
      />
      <OptionRow
        title="Exclude these fields from the upload"
        description="Skip every row that references them."
        tone="danger"
        onClick={() => setStage('exclude')}
      />
    </div>
  )
}

// `buildOptionsPanel` is exposed for future option lists that don't fit the
// shared SharedOptionsBody shape; not used yet, but documented above.
export { buildOptionsPanel }
