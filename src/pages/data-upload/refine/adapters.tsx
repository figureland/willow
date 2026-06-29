import clsx from 'clsx'
import { type ReactNode, useMemo, useState } from 'react'
import {
  Button,
  Radio,
  RadioGroup,
  Select,
  TextInput,
} from '../../../components/ui'
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
import type { ValueMappingDecisions } from '../value-mapping'
import type { IssuePanel } from './IssueModal'
import { IssueToken } from './IssueToken'
import type { CellHighlight, IssueAdapter } from './issue-adapter'
import { FileChip } from './SchemaMappingPanel'
import { SchemaMappingReview } from './SchemaMappingReview'
import {
  buildPropertyStatuses,
  operationsPropertiesForSheet,
} from './schema-properties'
import { ValueMappingReview } from './ValueMappingModal'

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
/* Origin + associated-record helpers — demo data for the chooser context     */
/* -------------------------------------------------------------------------- */

/**
 * Stable per-name row number so the demo's "Row 42" reference doesn't shift
 * between renders.
 */
const stableRowFor = (name: string, base: number): number => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return base + (Math.abs(h) % 200)
}

const farmOriginFor = (issue: FarmMissingIssue) => ({
  filename: EXAMPLE_WORKBOOK.filename,
  location: FARM_SOURCE_SHEET,
  rowRef: `Row ${stableRowFor(issue.sourceName, 12)}`,
  columnName: FARM_SOURCE_COLUMN,
})

const fieldOriginFor = (issue: FieldMissingIssue) => ({
  filename: EXAMPLE_WORKBOOK.filename,
  location: FIELD_SOURCE_SHEET,
  rowRef: `Row ${stableRowFor(issue.sourceName, 16)}`,
  columnName: FIELD_SOURCE_COLUMN,
})

const batchOriginFor = (_issue: FieldMissingBatchIssue) => ({
  filename: EXAMPLE_WORKBOOK.filename,
  location: FIELD_SOURCE_SHEET,
  // For batches we don't pin to a single row — leave rowRef off.
  columnName: FIELD_SOURCE_COLUMN,
})

/**
 * Build a small demo set of records that reference the given source name —
 * used by the Exclude confirm step so the user can see what would be skipped.
 */
const sampleAssociatedFor = (
  sourceName: string,
  affects: number | undefined,
) => {
  const total = affects ?? 3
  const take = Math.min(total, 5)
  const out: AssociatedRecord[] = []
  for (let i = 0; i < take; i++) {
    const row = stableRowFor(`${sourceName}-${i}`, 100)
    out.push({
      id: `${sourceName}-${i}`,
      cells: {
        row: `${row}`,
        date: `2024-${String(3 + (i % 6)).padStart(2, '0')}-${String(2 + i * 3).padStart(2, '0')}`,
        operation: ['Fertilising', 'Spraying', 'Drilling', 'Cultivation'][
          i % 4
        ],
        product: ['Nitram', 'Yara Mila', 'Roundup', 'CAN 27'][i % 4],
      },
    })
  }
  return out
}

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
      origin: farmOriginFor(issue),
      associatedRecords: sampleAssociatedFor(issue.sourceName, issue.affects),
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
      origin: fieldOriginFor(issue),
      associatedRecords: sampleAssociatedFor(issue.sourceName, issue.affects),
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
        <p>
          We read your <IssueToken>{issue.dataCategory}</IssueToken> data.
          {issue.recognisedSummary ? <> {issue.recognisedSummary}</> : null}{' '}
          Does this look right?
        </p>
      )
    }
    if (issue.missingDataCount && issue.missingDataCount > 0) {
      return (
        <p>
          We couldn't find{' '}
          <IssueToken>
            {issue.missingDataCount}{' '}
            {issue.missingDataCount === 1 ? 'type' : 'types'} of data
          </IssueToken>{' '}
          in your sheet. Help us understand your file.
        </p>
      )
    }
    return (
      <p>We couldn't find your records, help us to understand the layout.</p>
    )
  },
  provenance: (raw) => {
    const issue = raw as SchemaTransformationIssue
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        <span className="leading-none">Reading from</span>
        <FileChip filename={issue.filename} sheetName={issue.sheetName} />
      </div>
    )
  },
  solution: () => null,
  // When recognised, Sandy already proposed a layout — Yes confirms it. When
  // not recognised, the resolver IS the modal (no Yes/No fork) so we skip the
  // chooser.
  skipChooseAction: true,
  // No Yes path at the card level — every schema-transformation issue
  // routes through the Review modal, which owns Confirm internally.
  acceptSuggestion: () => null,
  affected: () => null,
  resolvedLabel: (state) => {
    if (state.resolution.kind !== 'rule-program') return null
    const program = state.resolution.program as
      | { rules?: Record<string, unknown> }
      | undefined
    if (!program?.rules || Object.keys(program.rules).length === 0) return null
    return 'Mapping saved'
  },
  optionsPanel: (raw, commit, currentState, cancel) => {
    const issue = raw as SchemaTransformationIssue
    // Seed the editor from the currently-committed state when present —
    // this is what lets the "Describe → review in modal" flow show the
    // AI-drafted mapping for confirmation instead of starting blank.
    const initialProgram =
      currentState?.resolution.kind === 'rule-program'
        ? (currentState.resolution.program as SchemaRuleProgram)
        : undefined
    // AI-suggested drafts get a different title from the manual flow: when
    // Sandy proposed the layout we tell the user what we did; when they
    // mapped it themselves we just ask them to confirm.
    const title =
      initialProgram?.source === 'ai'
        ? "Here's how we think your file is structured."
        : 'Does this look right?'
    return {
      id: 'schema-resolve',
      title,
      fullBleed: true,
      body: (
        <SchemaMappingReview
          issue={issue}
          initialProgram={initialProgram}
          onCommit={(next) => commit(next)}
          onCancel={() => cancel?.()}
        />
      ),
      actions: null,
    }
  },
  // Single card-level CTA — opens the unified review modal that owns the
  // review → describe → manual editor flow. Replaces the older mix of
  // Yes / Describe / Map columns buttons.
  review: () => ({ triggerLabel: 'Review' }),
}

/* -------------------------------------------------------------------------- */
/* Value mapping — root panel hosts the value-mapping editor + cell highlights */
/* -------------------------------------------------------------------------- */

export const valueMappingAdapter: IssueAdapter = {
  problem: (raw) => {
    const issue = raw as ValueMappingIssue
    const n = issue.sourceValues.length
    // Friendlier headline keyed off the canonical target — uses "crop types"
    // rather than the raw column name so the prompt reads like a question
    // a person would ask, not a system message.
    const noun = issue.targetLabel.toLowerCase()
    // Paired targets ("Crop and variety") read better with "combinations"
    // appended than with a brittle pluralisation hack.
    const isPair = issue.sourceValues.some((sv) => sv.secondary !== undefined)
    const head = isPair
      ? `We didn't recognise these ${n} ${noun} combination${n === 1 ? '' : 's'}.`
      : `We didn't recognise these ${n} ${noun}${n === 1 ? '' : 's'}.`
    return (
      <div className="flex flex-col gap-2">
        <p>{head} Help us work out what they mean.</p>
      </div>
    )
  },
  solution: () => null,
  // Simple flat list of the unknown values — readable at a glance, no
  // mini-data-table. We drop the "+N more" overflow hint since the rest
  // are always one click away via the action buttons.
  details: (raw) => {
    const issue = raw as ValueMappingIssue
    const PREVIEW_CAP = 8
    const previewed = issue.sourceValues.slice(0, PREVIEW_CAP)
    return (
      <ul className="flex flex-wrap gap-1.5">
        {previewed.map((sv, i) => {
          const label =
            sv.secondary !== undefined
              ? `${sv.value} · ${sv.secondary || '—'}`
              : sv.value
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: paired fixtures can repeat the primary value (e.g. "WW · SKY" + "WW · EXT") so we key on slot index
              key={`${label}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-border-tertiary bg-bg-primary px-2.5 py-0.5 text-xs font-medium text-text-primary"
            >
              {label}
              <span className="text-text-secondary">
                · {sv.occurrences.toLocaleString()}
              </span>
            </li>
          )
        })}
      </ul>
    )
  },
  // Provenance — file + sheet — lives at the bottom of the card so the
  // headline can stay clean.
  provenance: (raw) => {
    const issue = raw as ValueMappingIssue
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        <span className="leading-none">Reading from</span>
        <FileChip filename={issue.filename} sheetName={issue.sheetName} />
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
  optionsPanel: (raw, commit, currentState, cancel) => {
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
        <ValueMappingReview
          issue={issue}
          initialDecisions={initialDecisions}
          onConfirm={(next) => commit(next)}
          onCancel={() => cancel?.()}
          embedded
        />
      ),
      actions: null,
    }
  },
  // Card-level Describe shortcut — fills every still-unmapped value with a
  // fuzzy-matched canonical option. Mirrors the in-modal tray's behaviour.
  describe: (raw) => {
    const issue = raw as ValueMappingIssue
    // Build a "what we're looking at" inventory for the tray — one chip
    // per raw value. Green when Sandy already has a confident-ish guess;
    // amber when the value has no suggestion at all.
    const inventory = issue.sourceValues.map((sv) => ({
      label:
        sv.secondary !== undefined
          ? `${sv.value} · ${sv.secondary || '—'}`
          : sv.value,
      presence: sv.suggestion ? ('found' as const) : ('missing' as const),
    }))
    return {
      triggerLabel: 'Describe these values',
      title: 'Describe these values',
      placeholder: `e.g. These are abbreviations for ${issue.targetLabel.toLowerCase()} — match them to the closest Sandy option, even if the spelling differs.`,
      hint: 'Sandy will read your hint and map the remaining values.',
      expectedProperties: inventory,
      expectedPropertiesTitle: 'Values we found',
      expectedPropertiesMissingLabel: {
        one: 'still needs mapping',
        many: 'still need mapping',
      },
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
  // Manual fallback — bypass the AI tray and walk through each raw value
  // one row at a time. Same handoff as the schema "Map columns" path.
  mapValues: () => ({ triggerLabel: 'Map values manually' }),
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
  /** Sandy's pointer back into the upload — surfaced as a minimal block
   *  under the subject so the user can cross-reference the file. */
  origin?: OriginRef
  /** Sample of the records that reference this farm/field. Shown inside
   *  the Exclude confirm step so the user can see what they're about to
   *  drop. */
  associatedRecords?: AssociatedRecord[]
}

export type OriginRef = {
  filename: string
  /** Sheet tab name OR "Page N" for PDFs. */
  location?: string
  /** Source row reference inside the file (e.g. "Row 42"). */
  rowRef?: string
  /** Column inside that row where Sandy spotted the source name. */
  columnName?: string
}

export type AssociatedRecord = {
  id: string
  /** Display columns + values for the snippet table. */
  cells: Record<string, string>
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

type OptionId = 'select' | 'create' | 'exclude'

const SharedOptionsBody = ({
  cfg,
  commit,
}: {
  cfg: SharedOptionsConfig
  commit: (next: IssueState) => void
}) => {
  const [choice, setChoice] = useState<OptionId>('select')
  const [selectValue, setSelectValue] = useState<string | null>(null)
  const [createName, setCreateName] = useState<string>(cfg.sourceName)
  // Two-stage exclude: user picks Exclude → Confirm switches to a
  // destructive review with the associated records below.
  const [stage, setStage] = useState<'pick' | 'confirm-delete'>('pick')

  const Noun = cfg.noun === 'farm' ? 'Farm' : 'Field'

  // Inline-control validity gates the Confirm button per choice.
  const canConfirm =
    choice === 'select'
      ? !!selectValue
      : choice === 'create'
        ? createName.trim().length > 0
        : true

  const handleConfirm = () => {
    if (choice === 'select' && selectValue) {
      commit({ resolution: { kind: 'match-existing', value: selectValue } })
    } else if (choice === 'create') {
      commit({ resolution: { kind: 'create-new', name: createName.trim() } })
    } else if (choice === 'exclude') {
      const records = cfg.associatedRecords ?? []
      if (records.length > 0) {
        setStage('confirm-delete')
      } else {
        commit({ resolution: { kind: 'ignore' } })
      }
    }
  }

  if (stage === 'confirm-delete') {
    return (
      <DeleteConfirmBody
        noun={cfg.noun}
        subjects={[cfg.sourceName]}
        affectsCount={cfg.affectsCount}
        records={cfg.associatedRecords ?? []}
        onBack={() => setStage('pick')}
        onConfirm={() => commit({ resolution: { kind: 'ignore' } })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SubjectsList noun={cfg.noun} names={[cfg.sourceName]} />
      {cfg.origin ? <OriginRow origin={cfg.origin} /> : null}

      <RadioGroup<OptionId> value={choice} onValueChange={setChoice}>
        <OptionRadio
          value="select"
          title={`Select another ${cfg.noun}`}
          description={`Match this to a ${cfg.noun} that already exists on Sandy.`}
          active={choice === 'select'}
        >
          <SelectMatchBody
            options={cfg.options}
            placeholder={`Select a ${cfg.noun}`}
            value={selectValue}
            onChange={setSelectValue}
          />
        </OptionRadio>

        <OptionRadio
          value="create"
          title={`Create a new ${cfg.noun}`}
          description={`Add ${cfg.sourceName} as a new ${cfg.noun} on Sandy.`}
          active={choice === 'create'}
        >
          <CreateNewBody
            label={`${Noun} name`}
            name={createName}
            onChange={setCreateName}
          />
        </OptionRadio>

        <OptionRadio
          value="exclude"
          title={`Exclude this ${cfg.noun} from the upload`}
          description="Skip every row that references it."
          tone="danger"
          active={choice === 'exclude'}
        >
          <p className="text-sm text-text-secondary">
            {`This ${cfg.noun} references ${
              cfg.affectsCount?.toLocaleString() ?? 'an unknown number of'
            } records — they'll be skipped on import.`}
          </p>
        </OptionRadio>
      </RadioGroup>

      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      </div>
    </div>
  )
}

/**
 * One radio row in the consolidated chooser. The radio acts as the option
 * marker; the title + description sit next to it; and when the row is
 * active we reveal whatever inline control the option needs (Select for
 * "Select another", TextInput for "Create new", helper text for "Exclude").
 */
const OptionRadio = ({
  value,
  title,
  description,
  active,
  tone = 'default',
  children,
}: {
  value: OptionId
  title: string
  description: string
  active: boolean
  tone?: 'default' | 'danger'
  children: ReactNode
}) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: the Radio root supplies the input; wrapping it in <label> extends the click target to the whole card
  <label
    className={clsx(
      'flex cursor-pointer flex-col gap-3 rounded-xl border-2 px-4 py-3 transition-colors',
      'focus-within:ring-2 focus-within:ring-sandy-600/40',
      active
        ? tone === 'danger'
          ? 'border-support-fg-red bg-support-bg-red'
          : 'border-border-primary bg-bg-secondary'
        : 'border-border-tertiary bg-bg-primary hover:border-border-secondary-hover',
    )}
  >
    <div className="flex items-start gap-3">
      <span className="mt-0.5">
        <Radio value={value} />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span
          className={clsx(
            'text-md font-semibold',
            tone === 'danger' ? 'text-support-fg-red' : 'text-text-primary',
          )}
        >
          {title}
        </span>
        <span className="text-sm text-text-secondary">{description}</span>
      </div>
    </div>
    {active ? <div className="pl-7">{children}</div> : null}
  </label>
)

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

type BatchOptionId = 'select' | 'create' | 'exclude'

const BatchOptionsBody = ({
  issue,
  commit,
}: {
  issue: FieldMissingBatchIssue
  commit: (next: IssueState) => void
}) => {
  const [choice, setChoice] = useState<BatchOptionId>('select')
  const [value, setValue] = useState<string | null>(null)
  const [stage, setStage] = useState<'pick' | 'confirm-delete'>('pick')

  // Roll up a sample of associated records across the batch — small enough
  // to fit inside the confirm step's snippet table.
  const associated = useMemo(() => {
    const out: AssociatedRecord[] = []
    for (const name of issue.sourceNames) {
      const sample = sampleAssociatedFor(name, undefined).slice(0, 2)
      for (const r of sample) out.push(r)
      if (out.length >= 5) break
    }
    return out.slice(0, 5)
  }, [issue.sourceNames])

  const totalAffected = issue.sourceNames.length

  const canConfirm = choice === 'select' ? !!value : true

  const handleConfirm = () => {
    if (choice === 'select' && value) {
      commit({ resolution: { kind: 'match-existing', value } })
    } else if (choice === 'create') {
      commit({ resolution: { kind: 'create-new', name: '' } })
    } else if (choice === 'exclude') {
      if (associated.length > 0) {
        setStage('confirm-delete')
      } else {
        commit({ resolution: { kind: 'ignore' } })
      }
    }
  }

  if (stage === 'confirm-delete') {
    return (
      <DeleteConfirmBody
        noun="field"
        subjects={issue.sourceNames}
        affectsCount={totalAffected}
        records={associated}
        onBack={() => setStage('pick')}
        onConfirm={() => commit({ resolution: { kind: 'ignore' } })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SubjectsList noun="field" names={issue.sourceNames} />
      <OriginRow origin={batchOriginFor(issue)} />

      <RadioGroup<BatchOptionId> value={choice} onValueChange={setChoice}>
        <OptionRadio
          value="select"
          title="Attach to another farm"
          description="Pick the farm these fields belong to."
          active={choice === 'select'}
        >
          <SelectMatchBody
            options={issue.existingFarms}
            placeholder="Select a farm"
            value={value}
            onChange={setValue}
          />
        </OptionRadio>

        <OptionRadio
          value="create"
          title="Create new fields"
          description="Add these as new fields under the suggested farm."
          active={choice === 'create'}
        >
          <p className="text-sm text-text-secondary">
            {`${issue.sourceNames.length} new fields will be created under ${issue.suggestedFarmName ?? 'the suggested farm'}.`}
          </p>
        </OptionRadio>

        <OptionRadio
          value="exclude"
          title="Exclude these fields from the upload"
          description="Skip every row that references them."
          tone="danger"
          active={choice === 'exclude'}
        >
          <p className="text-sm text-text-secondary">
            {`${issue.sourceNames.length} fields will be skipped along with every row that references them.`}
          </p>
        </OptionRadio>
      </RadioGroup>

      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Shared sub-components for the options panel                                */
/* -------------------------------------------------------------------------- */

const SubjectsList = ({
  noun,
  names,
}: {
  noun: 'farm' | 'field'
  names: string[]
}) => {
  if (names.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {names.length === 1
          ? `${noun === 'farm' ? 'Farm' : 'Field'} in question`
          : `${noun === 'farm' ? 'Farms' : 'Fields'} in question`}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <li
            key={name}
            className="rounded-md bg-bg-tertiary px-2 py-0.5 text-md text-text-primary"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}

const OriginRow = ({ origin }: { origin: OriginRef }) => (
  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
    <span className="font-semibold uppercase tracking-wide">From</span>
    <span className="text-text-primary">{origin.filename}</span>
    {origin.location ? (
      <>
        <span aria-hidden="true">·</span>
        <span>{origin.location}</span>
      </>
    ) : null}
    {origin.rowRef ? (
      <>
        <span aria-hidden="true">·</span>
        <span>{origin.rowRef}</span>
      </>
    ) : null}
    {origin.columnName ? (
      <>
        <span aria-hidden="true">·</span>
        <span className="font-mono text-xs">{origin.columnName}</span>
      </>
    ) : null}
  </p>
)

const DeleteConfirmBody = ({
  noun,
  subjects,
  affectsCount,
  records,
  onBack,
  onConfirm,
}: {
  noun: 'farm' | 'field'
  subjects: string[]
  affectsCount?: number
  records: AssociatedRecord[]
  onBack: () => void
  onConfirm: () => void
}) => {
  const subjectLabel =
    subjects.length === 1
      ? `${noun === 'farm' ? 'this farm' : 'this field'}`
      : `${subjects.length} ${noun === 'farm' ? 'farms' : 'fields'}`
  const count = affectsCount ?? records.length
  const columns = records[0] ? Object.keys(records[0].cells) : []

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex max-w-[520px] flex-col gap-2 rounded-xl border-2 border-support-border-red bg-support-bg-red px-5 py-4 text-center">
        <p className="text-md font-medium text-support-fg-red">
          {`${subjectLabel.charAt(0).toUpperCase()}${subjectLabel.slice(1)} is associated with ${count.toLocaleString()} other ${count === 1 ? 'record' : 'records'}.`}
        </p>
        <p className="text-sm text-text-primary">
          Are you sure you want to delete?
        </p>
      </div>

      {records.length > 0 && columns.length > 0 ? (
        <div className="overflow-hidden rounded-xl border-2 border-border-tertiary bg-bg-primary">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-bg-secondary text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr
                  key={r.id}
                  className={clsx(
                    'align-middle',
                    idx > 0 && 'border-t border-border-tertiary',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-md text-text-primary"
                    >
                      {r.cells[col] || (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </div>
  )
}
