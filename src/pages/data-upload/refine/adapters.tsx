import { useState } from 'react'
import { Button, Select, TextInput } from '../../../components/ui'
import type { IssueState } from '../IssueResolverModal'
import {
  defaultResolutionForIssue,
  type FarmMissingIssue,
  type FieldMissingBatchIssue,
  type FieldMissingIssue,
  type Issue,
  type SchemaTransformationIssue,
  type ValueMappingIssue,
} from '../issues'
import {
  EXAMPLE_WORKBOOK,
  type SchemaRuleProgram,
} from '../schema-transformation'
import { CANONICAL_VOCAB, type ValueMappingDecisions } from '../value-mapping'
import type { IssuePanel } from './IssueModal'
import { IssueToken } from './IssueToken'
import type { CellHighlight, IssueAdapter } from './issue-adapter'
import { FileChip, SchemaMappingPanel } from './SchemaMappingPanel'
import { operationsPropertiesForSheet } from './schema-properties'
import { ValueMappingPanel } from './ValueMappingPanel'

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
    return issue.suggestedFarmName ? (
      <p>
        We think they are part of{' '}
        <IssueToken tone="success">{issue.suggestedFarmName}</IssueToken>. Is
        that right?
      </p>
    ) : (
      <p>Where should we attach them?</p>
    )
  },
  details: (raw) => {
    const issue = raw as FieldMissingBatchIssue
    return (
      <div className="overflow-hidden rounded-lg border-2 border-border-tertiary">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-bg-secondary text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">Unknown field</th>
            </tr>
          </thead>
          <tbody>
            {issue.sourceNames.map((name, idx) => (
              <tr
                key={name}
                className={
                  idx > 0 ? 'border-t border-border-tertiary' : undefined
                }
              >
                <td className="px-3 py-2 text-md text-text-primary">{name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    if (issue.recognised) {
      return (
        <div className="flex flex-col gap-2">
          <p>
            We read your <IssueToken>{issue.dataCategory}</IssueToken> data.
            {issue.recognisedSummary ? <> {issue.recognisedSummary}</> : null}{' '}
            Does this look right?
          </p>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-text-secondary">Reading from</p>
            <FileChip filename={issue.filename} sheetName={issue.sheetName} />
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-2">
        <p>We don't recognise this template. Help us understand the layout.</p>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-secondary">Reading from</p>
          <FileChip filename={issue.filename} sheetName={issue.sheetName} />
        </div>
      </div>
    )
  },
  solution: () => null,
  // When recognised, Sandy already proposed a layout — Yes confirms it. When
  // not recognised, the resolver IS the modal (no Yes/No fork) so we skip the
  // chooser.
  skipChooseAction: true,
  acceptSuggestion: (raw) => {
    const issue = raw as SchemaTransformationIssue
    if (!issue.recognised) return null
    // Yes confirms the auto-drafted layout that Sandy would have proposed
    // (mirrors the assist-guess we use elsewhere).
    const program = suggestedSchemaProgramWithAssist(issue.sheetName)
    return { resolution: { kind: 'rule-program', program } }
  },
  affected: () => null,
  resolvedLabel: (state) => {
    if (state.resolution.kind !== 'rule-program') return null
    const program = state.resolution.program as
      | { rules?: Record<string, unknown> }
      | undefined
    if (!program?.rules || Object.keys(program.rules).length === 0) return null
    return 'Mapping saved'
  },
  optionsPanel: (raw, commit, currentState) => {
    const issue = raw as SchemaTransformationIssue
    // Seed the editor from the currently-committed state when present —
    // this is what lets the "Describe → review in modal" flow show the
    // AI-drafted mapping for confirmation instead of starting blank.
    const initialProgram =
      currentState?.resolution.kind === 'rule-program'
        ? (currentState.resolution.program as SchemaRuleProgram)
        : undefined
    return {
      id: 'schema-resolve',
      title: 'Does this look right?',
      fullBleed: true,
      body: (
        <SchemaMappingPanel
          issue={issue}
          initialProgram={initialProgram}
          onCommit={(next) => commit(next)}
          // Cancel is best-effort here — the IssueModal owns close. We
          // can't reach into nav from this adapter callback so we just
          // commit nothing; the user can hit the modal's X.
          onCancel={() => {}}
        />
      ),
      actions: null,
    }
  },
  // Card-level Describe shortcut — produces a rule-program seeded from the
  // spec defaults with `cropVariety` filled by Sandy's guess. Mirrors what
  // the in-modal tray does so the outcome is the same.
  describe: (raw) => {
    const issue = raw as SchemaTransformationIssue
    // Recognised: Sandy already proposed a layout — frame the prompt as
    // "what did we get wrong?". Unrecognised: ask for a layout from scratch.
    if (issue.recognised) {
      return {
        triggerLabel: 'No',
        title: "Tell us what we've missed",
        placeholder:
          "e.g. Crop variety actually lives in the 'variety_code' column, not the one we picked. The harvest year is in column F.",
        hint: 'Sandy will re-read the sheet with your corrections.',
        apply: () => {
          const program = suggestedSchemaProgramWithAssist(issue.sheetName)
          return { resolution: { kind: 'rule-program', program } }
        },
      }
    }
    return {
      triggerLabel: 'Describe',
      title: 'Describe this file',
      placeholder:
        "e.g. Each row is one fertiliser application. The crop variety lives in the 'variety' column — it's a code that maps to the master Fields_Crops sheet.",
      hint: 'Sandy will read the sheet and try to fill in the gaps.',
      apply: () => {
        const program = suggestedSchemaProgramWithAssist(issue.sheetName)
        return { resolution: { kind: 'rule-program', program } }
      },
    }
  },
}

/**
 * Build a SchemaRuleProgram that includes every property's default
 * expression *plus* an assistive guess for cropVariety (the only slot the
 * default spec deliberately leaves blank).
 */
const suggestedSchemaProgramWithAssist = (sheetName: string) => {
  const props = operationsPropertiesForSheet(sheetName)
  const rules: Record<string, unknown> = {}
  for (const p of props) {
    if (p.defaultExpression) rules[p.property] = p.defaultExpression
  }
  rules.cropVariety = {
    kind: 'join',
    sourceSheet: sheetName,
    sourceMatchColumn: 'variety',
    lookupSheet: 'Fields_Crops',
    lookupMatchColumn: 'variety',
    lookupReturnColumn: 'varietyName',
  }
  return { sheetName, rules }
}

/* -------------------------------------------------------------------------- */
/* Value mapping — root panel hosts the value-mapping editor + cell highlights */
/* -------------------------------------------------------------------------- */

export const valueMappingAdapter: IssueAdapter = {
  problem: (raw) => {
    const issue = raw as ValueMappingIssue
    const n = issue.sourceValues.length
    return (
      <div className="flex flex-col gap-2">
        <p>
          We spotted{' '}
          <IssueToken>
            {n} unknown {n === 1 ? 'value' : 'values'}
          </IssueToken>{' '}
          in <IssueToken>{issue.sourceColumn}</IssueToken>. Help us map them to{' '}
          <IssueToken>{issue.targetLabel}</IssueToken>.
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-secondary">Reading from</p>
          <FileChip filename={issue.filename} sheetName={issue.sheetName} />
        </div>
      </div>
    )
  },
  solution: () => null,
  // Before/after preview on the active card. Shows the source value and the
  // canonical match Sandy proposed (the user can confirm or override in the
  // resolver modal). Cap rows so the card stays scannable — full table lives
  // inside the modal.
  details: (raw) => {
    const issue = raw as ValueMappingIssue
    const options = CANONICAL_VOCAB[issue.category]
    const labelFor = (id: string | undefined) =>
      options.find((o) => o.value === id)?.label
    const PREVIEW_CAP = 4
    const previewed = issue.sourceValues.slice(0, PREVIEW_CAP)
    const overflow = issue.sourceValues.length - previewed.length
    return (
      <div className="flex flex-col gap-2 rounded-lg border-2 border-border-tertiary bg-bg-secondary px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Proposed quick fix
        </p>
        <table className="w-full table-fixed border-separate border-spacing-y-0.5 text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-text-secondary">
              <th className="w-2/5 font-medium">Source value</th>
              <th className="w-3/5 font-medium">Will become</th>
            </tr>
          </thead>
          <tbody>
            {previewed.map((sv) => {
              const matched = sv.suggestion ? labelFor(sv.suggestion) : null
              return (
                <tr key={sv.value}>
                  <td className="text-text-primary">
                    <span className="rounded-md bg-bg-primary px-1.5 py-0.5">
                      {sv.value}
                    </span>
                    <span className="ml-2 text-text-secondary">
                      ({sv.occurrences.toLocaleString()} rows)
                    </span>
                  </td>
                  <td className="text-text-primary">
                    {matched ?? (
                      <span className="text-support-fg-amber">
                        Needs mapping
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {overflow > 0 ? (
          <p className="text-xs text-text-secondary">
            +{overflow} more {overflow === 1 ? 'value' : 'values'} — open to
            review all
          </p>
        ) : null}
      </div>
    )
  },
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
  // No yes/no fork — Resolve opens straight into the mapping UI.
  skipChooseAction: true,
  optionsPanel: (raw, commit, currentState) => {
    const issue = raw as ValueMappingIssue
    // Seed the editor from the committed state when present — gives the
    // Describe → review flow a populated table to confirm.
    const initialDecisions =
      currentState?.resolution.kind === 'value-mapping'
        ? (currentState.resolution.decisions as ValueMappingDecisions)
        : undefined
    return {
      id: 'value-mapping-resolve',
      title: 'Does this look right?',
      fullBleed: true,
      body: (
        <ValueMappingPanel
          issue={issue}
          initialDecisions={initialDecisions}
          onCommit={(next) => commit(next)}
          onCancel={() => {}}
        />
      ),
      actions: null,
    }
  },
  // Card-level Describe shortcut — fills every still-unmapped value with a
  // fuzzy-matched canonical option. Mirrors the in-modal tray's behaviour.
  describe: (raw) => {
    const issue = raw as ValueMappingIssue
    return {
      triggerLabel: 'Describe',
      title: 'Describe these values',
      placeholder: `e.g. These are abbreviations for ${issue.targetLabel.toLowerCase()} — match them to the closest Sandy option, even if the spelling differs.`,
      hint: 'Sandy will read your hint and map the remaining values.',
      apply: (currentState) => {
        const existing =
          currentState?.resolution.kind === 'value-mapping'
            ? (currentState.resolution.decisions as Record<
                string,
                { kind: 'map'; canonicalValue: string } | { kind: 'skip' }
              >)
            : {}
        const next: Record<
          string,
          { kind: 'map'; canonicalValue: string } | { kind: 'skip' }
        > = { ...existing }
        for (const sv of issue.sourceValues) {
          const current = next[sv.value]
          if (current?.kind === 'map' && current.canonicalValue) continue
          const lower = sv.value.toLowerCase()
          const match =
            issue.canonicalOptions.find((opt) =>
              opt.label.toLowerCase().startsWith(lower.slice(0, 3)),
            ) ??
            issue.canonicalOptions.find((opt) =>
              opt.label.toLowerCase().includes(lower.slice(0, 3)),
            ) ??
            issue.canonicalOptions[0]
          if (match) {
            next[sv.value] = { kind: 'map', canonicalValue: match.value }
          }
        }
        return { resolution: { kind: 'value-mapping', decisions: next } }
      },
    }
  },
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
