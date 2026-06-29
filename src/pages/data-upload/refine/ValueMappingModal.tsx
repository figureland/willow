import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Select } from '../../../components/ui'
import type { IssueState } from '../issue-state'
import type { ValueMappingIssue } from '../issues'
import type {
  ValueMappingDecision,
  ValueMappingDecisions,
} from '../value-mapping'

/* -------------------------------------------------------------------------- */
/* ValueMappingModal — match raw source values to a canonical Sandy value     */
/*                                                                             */
/* Mirrors the schema-mapping modal's shape, but instead of pairing properties */
/* with sheet/column we're picking a canonical value for each raw source      */
/* value. Rows Sandy could guess are prefilled with a confidence badge        */
/* (High / Medium / Low) so the user knows whether to trust the guess.        */
/* -------------------------------------------------------------------------- */

type Confidence = 'high' | 'medium' | 'low'

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: 'border-support-border-green bg-support-bg-green text-text-brand-dark',
  medium:
    'border-support-border-amber bg-support-bg-amber text-support-fg-amber',
  low: 'border-border-secondary bg-bg-secondary text-text-secondary',
}

/**
 * Crude confidence model — purely heuristic, scoped to the demo:
 *
 * - high: prefix overlap of at least three characters with the canonical label.
 * - medium: substring overlap of at least three characters with the label.
 * - low: any other prefilled guess (e.g. the fallback first-option pick).
 *
 * Real-world ranking would lean on edit distance + co-occurrence, but the
 * three-bucket structure is what we want to expose in the UI either way.
 */
const confidenceFor = (
  source: string,
  canonicalLabel: string | undefined,
): Confidence => {
  if (!canonicalLabel) return 'low'
  const a = source.toLowerCase()
  const b = canonicalLabel.toLowerCase()
  const probe = a.slice(0, Math.min(3, a.length))
  if (probe.length >= 2 && b.startsWith(probe)) return 'high'
  if (probe.length >= 2 && b.includes(probe)) return 'medium'
  return 'low'
}

/* -------------------------------------------------------------------------- */
/* Cascade helpers — split a flat list of paired options into two interlinked */
/* dropdowns. Each option's value is `<primary>|<secondary>` and its label is */
/* `<primary> · <secondary>`; we split on those to derive the two halves.    */
/* -------------------------------------------------------------------------- */

type CascadeOptions = {
  /** Distinct primary options in first-seen order. */
  primaries: { value: string; label: string }[]
  /** Secondaries keyed by primary id, in first-seen order. */
  secondariesByPrimary: Map<string, { value: string; label: string }[]>
}

const buildCascade = (
  options: { value: string; label: string }[],
): CascadeOptions => {
  const primaries: { value: string; label: string }[] = []
  const seenPrimaries = new Set<string>()
  const secondariesByPrimary = new Map<
    string,
    { value: string; label: string }[]
  >()
  for (const opt of options) {
    const [primaryId, secondaryId] = opt.value.split('|')
    if (!primaryId) continue
    const [primaryLabelRaw = primaryId, secondaryLabelRaw = secondaryId ?? ''] =
      opt.label.split('·').map((s) => s.trim())
    if (!seenPrimaries.has(primaryId)) {
      seenPrimaries.add(primaryId)
      primaries.push({ value: primaryId, label: primaryLabelRaw })
    }
    if (!secondaryId) continue
    const bucket = secondariesByPrimary.get(primaryId) ?? []
    if (!bucket.some((s) => s.value === secondaryId)) {
      bucket.push({ value: secondaryId, label: secondaryLabelRaw })
    }
    secondariesByPrimary.set(primaryId, bucket)
  }
  return { primaries, secondariesByPrimary }
}

const splitEncoded = (
  raw: string | null,
): { primary: string; secondary: string } => {
  if (!raw) return { primary: '', secondary: '' }
  const [primary = '', secondary = ''] = raw.split('|')
  return { primary, secondary }
}

const joinEncoded = (primary: string, secondary: string): string =>
  primary && secondary ? `${primary}|${secondary}` : ''

/** Pretty noun for a column label — falls back to a sensible default. */
const labelOrDefault = (raw: string | undefined, fallback: string): string => {
  const trimmed = raw?.trim()
  if (!trimmed || trimmed.length === 0) return fallback
  // Capitalise the first letter so secondary halves of a split targetLabel
  // ("variety" → "Variety") read like proper labels.
  return trimmed[0].toUpperCase() + trimmed.slice(1)
}

/* -------------------------------------------------------------------------- */
/* ValueMappingReview — the inner list of rows + footer. Shared between the   */
/* card-launched modal and the resolver-modal "Change" panel so both surfaces */
/* feel identical.                                                            */
/* -------------------------------------------------------------------------- */

export type ValueMappingReviewProps = {
  issue: ValueMappingIssue
  initialDecisions?: ValueMappingDecisions
  /** Commit the draft. Fires the modal's confirm chain. */
  onConfirm: (next: IssueState) => void
  /** Cancel handler — best-effort; the modal owns its own close. */
  onCancel?: () => void
  /** When true the review draws its own sticky footer (used when embedded
   *  inside the IssueModal as an `optionsPanel` body). */
  embedded?: boolean
}

export const ValueMappingReview = ({
  issue,
  initialDecisions,
  onConfirm,
  onCancel,
  embedded = false,
}: ValueMappingReviewProps) => {
  // Seed the picks from any prior draft, falling back to Sandy's per-row
  // suggestion when present. Source values with no suggestion start blank.
  const seeded = useMemo<ValueMappingDecisions>(() => {
    const out: ValueMappingDecisions = {}
    for (const sv of issue.sourceValues) {
      const prior = initialDecisions?.[sv.value]
      if (prior) {
        out[sv.value] = prior
        continue
      }
      if (sv.suggestion) {
        out[sv.value] = { kind: 'map', canonicalValue: sv.suggestion }
      }
    }
    return out
  }, [issue, initialDecisions])

  const [decisions, setDecisions] = useState<ValueMappingDecisions>(seeded)

  // Paired issues (e.g. crop + variety) drive two cascading dropdowns —
  // detect off the secondaryColumn the fixture set so we don't have to peek
  // at row values, which can be sparse.
  const isPair = !!issue.secondaryColumn
  const cascade = useMemo(
    () => (isPair ? buildCascade(issue.canonicalOptions) : null),
    [isPair, issue.canonicalOptions],
  )
  // Friendly labels for the two dropdowns. Prefer splitting the targetLabel
  // ("Crop and variety" → ["Crop", "variety"]) since that reads better than
  // the source column names ("commodityName" / "variety").
  const targetParts = issue.targetLabel.split(/\s+and\s+/i)
  const primaryLabel = labelOrDefault(
    targetParts[0],
    labelOrDefault(issue.sourceColumn, 'Primary'),
  )
  const secondaryLabel = labelOrDefault(
    targetParts[1],
    labelOrDefault(issue.secondaryColumn, 'Secondary'),
  )

  const labelFor = (value: string | undefined): string | undefined =>
    issue.canonicalOptions.find((o) => o.value === value)?.label

  const setMapping = (sourceValue: string, canonicalValue: string | null) => {
    setDecisions((curr) => {
      const next: ValueMappingDecisions = { ...curr }
      if (canonicalValue) {
        next[sourceValue] = { kind: 'map', canonicalValue }
      } else {
        delete next[sourceValue]
      }
      return next
    })
  }

  // Update one half of a paired decision. Switching the primary clears the
  // secondary so we never persist an invalid (primary, secondary) pair.
  const setPair = (
    sourceValue: string,
    half: 'primary' | 'secondary',
    nextHalf: string,
  ) => {
    setDecisions((curr) => {
      const next: ValueMappingDecisions = { ...curr }
      const existing = next[sourceValue]
      const current =
        existing?.kind === 'map' ? splitEncoded(existing.canonicalValue) : null
      const primary = half === 'primary' ? nextHalf : (current?.primary ?? '')
      const secondary =
        half === 'secondary'
          ? nextHalf
          : half === 'primary'
            ? ''
            : (current?.secondary ?? '')
      const encoded = joinEncoded(primary, secondary)
      if (encoded) {
        next[sourceValue] = { kind: 'map', canonicalValue: encoded }
      } else if (!primary) {
        // Cleared the primary — drop the row's decision entirely.
        delete next[sourceValue]
      } else {
        // Primary set but secondary missing — record as a partial pending
        // decision so the row stays amber until both halves are picked.
        next[sourceValue] = {
          kind: 'map',
          canonicalValue: `${primary}|`,
        }
      }
      return next
    })
  }

  // For paired issues a row only counts as "mapped" when BOTH halves are
  // picked (encoded as `primary|secondary`). A partial pick (e.g. crop set
  // but variety empty) survives as `primary|` so the row stays amber.
  const mappedCount = Object.values(decisions).filter(
    (d): d is Extract<ValueMappingDecision, { kind: 'map' }> => {
      if (d.kind !== 'map' || !d.canonicalValue) return false
      if (!isPair) return true
      const { primary, secondary } = splitEncoded(d.canonicalValue)
      return !!primary && !!secondary
    },
  ).length
  const total = issue.sourceValues.length

  const handleConfirm = () => {
    onConfirm({ resolution: { kind: 'value-mapping', decisions } })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* List scrolls inside the panel; the footer below stays pinned. */}
      <ul className="flex flex-1 min-h-0 flex-col overflow-y-auto px-6 pt-2 pb-4">
        {issue.sourceValues.map((sv, idx) => {
          const decision = decisions[sv.value]
          const mappedValue =
            decision?.kind === 'map' ? decision.canonicalValue : null
          // For paired issues a half-picked row (`primary|`) should still
          // surface as needing attention — both halves must be set.
          const pair = isPair ? splitEncoded(mappedValue) : null
          const fullyMapped = isPair
            ? !!pair?.primary && !!pair.secondary
            : !!mappedValue
          // Confidence only applies to AUTO-FILLED rows — once the user
          // interacts with the Select the badge is no longer meaningful.
          const isUserPick =
            decision &&
            (decision.kind !== 'map' ||
              decision.canonicalValue !== sv.suggestion)
          const showConfidence = !!sv.suggestion && fullyMapped && !isUserPick
          const confidence = showConfidence
            ? confidenceFor(sv.value, labelFor(sv.suggestion))
            : null
          const last = idx === issue.sourceValues.length - 1
          const needsAttention = !fullyMapped
          return (
            <li
              key={sv.value}
              className={clsx(
                'grid grid-cols-[minmax(180px,1fr)_minmax(220px,1.4fr)] items-start gap-3 rounded-md px-3 py-3 transition-colors',
                last ? '' : 'border-b border-border-tertiary',
                needsAttention && 'bg-support-bg-amber/60',
              )}
            >
              <div className="flex flex-col gap-0.5 pt-1">
                <span className="text-md font-medium text-text-primary">
                  {sv.value}
                  {sv.secondary !== undefined ? (
                    <>
                      <span className="px-1.5 text-text-secondary">·</span>
                      <span className="text-text-primary">
                        {sv.secondary || '—'}
                      </span>
                    </>
                  ) : null}
                </span>
                <span className="text-xs text-text-secondary">
                  {sv.occurrences.toLocaleString()} rows
                </span>
              </div>
              <div
                className={clsx(
                  'flex flex-col gap-1',
                  // Forward an amber outline onto the inner Select trigger
                  // when the row needs attention. The trigger lives one DOM
                  // level deep so a descendant selector keeps the change
                  // local to this wrapper without touching the primitive.
                  needsAttention &&
                    '[&_button]:!border-support-fg-amber [&_button]:!ring-1 [&_button]:!ring-support-fg-amber/30',
                )}
              >
                {isPair && cascade ? (
                  <div className="flex flex-col gap-2">
                    <Select
                      aria-label={`${primaryLabel} for ${sv.value}`}
                      items={cascade.primaries}
                      value={pair?.primary || null}
                      placeholder={`Select a ${primaryLabel.toLowerCase()}`}
                      searchable
                      onValueChange={(next) =>
                        setPair(sv.value, 'primary', next ?? '')
                      }
                      clearable={false}
                    />
                    <Select
                      aria-label={`${secondaryLabel} for ${sv.value}`}
                      items={
                        pair?.primary
                          ? (cascade.secondariesByPrimary.get(pair.primary) ??
                            [])
                          : []
                      }
                      value={pair?.secondary || null}
                      placeholder={
                        pair?.primary
                          ? `Select a ${secondaryLabel.toLowerCase()}`
                          : `Pick a ${primaryLabel.toLowerCase()} first`
                      }
                      disabled={!pair?.primary}
                      searchable
                      onValueChange={(next) =>
                        setPair(sv.value, 'secondary', next ?? '')
                      }
                      clearable={false}
                    />
                  </div>
                ) : (
                  <Select
                    aria-label={`Canonical value for ${sv.value}`}
                    items={issue.canonicalOptions}
                    value={mappedValue}
                    placeholder={`Select a ${issue.targetLabel.toLowerCase()}`}
                    searchable
                    onValueChange={(next) => setMapping(sv.value, next ?? null)}
                    clearable={false}
                  />
                )}
                {confidence ? (
                  <span
                    className={clsx(
                      'inline-flex w-fit items-center gap-1.5 rounded-full border-2 px-2 py-0.5 text-xs font-medium',
                      CONFIDENCE_STYLE[confidence],
                    )}
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'inline-block size-1.5 rounded-full',
                        confidence === 'high'
                          ? 'bg-support-fg-green'
                          : confidence === 'medium'
                            ? 'bg-support-fg-amber'
                            : 'bg-border-secondary',
                      )}
                    />
                    {CONFIDENCE_LABEL[confidence]} confidence
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {embedded ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t-2 border-border-tertiary bg-bg-primary px-6 py-3">
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={mappedCount === 0}
          >
            Confirm mapping ({mappedCount} of {total})
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export type ValueMappingModalProps = {
  open: boolean
  onClose: () => void
  issue: ValueMappingIssue
  /** Initial decisions when re-opening from a previously-committed draft. */
  initialDecisions?: ValueMappingDecisions
  /** Commit a draft IssueState. The caller chains into the review modal. */
  onConfirm: (next: IssueState) => void
}

export const ValueMappingModal = ({
  open,
  onClose,
  issue,
  initialDecisions,
  onConfirm,
}: ValueMappingModalProps) => {
  // Force a fresh Review on each open so the inner state resets cleanly.
  const [resetKey, setResetKey] = useState(0)
  useEffect(() => {
    if (open) setResetKey((k) => k + 1)
  }, [open])

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      // Unstyled — the Review owns its own header section + sticky footer
      // so layout (scroll + footer overlay) stays consistent with the
      // IssueModal's fullBleed mount of the same component.
      title={`Map values to ${issue.targetLabel}`}
      unstyled
      maxWidth="780px"
      fillHeight
    >
      <div className="flex h-full min-h-0 flex-col">
        <header className="border-b-2 border-border-tertiary px-6 pt-6 pb-4 pr-16">
          <h2 className="text-xl font-semibold text-text-primary">
            Map values to {issue.targetLabel}
          </h2>
          <p className="mt-1 text-md text-text-secondary">
            Pick the Sandy {issue.targetLabel.toLowerCase()} that each raw value
            maps to. We'll review the mapping together once you confirm.
          </p>
        </header>
        <ValueMappingReview
          key={resetKey}
          issue={issue}
          initialDecisions={initialDecisions}
          embedded
          onCancel={onClose}
          onConfirm={(next) => {
            onConfirm(next)
            onClose()
          }}
        />
      </div>
    </Modal>
  )
}
