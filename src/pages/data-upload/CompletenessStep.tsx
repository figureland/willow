import clsx from 'clsx'
import { useState } from 'react'
import { Button } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

type Severity = 'blocking' | 'warning' | 'note'

type Resolution = 'pending' | 'accepted' | 'skipped'

type CompletenessIssue = {
  id: string
  /** Short headline — what's wrong, in plain language. */
  title: string
  /** One-line summary of the affected record(s). */
  detail: string
  /** Plain-language summary of Sandy's proposed fix. */
  recommendation: string
  severity: Severity
}

type CompletenessSection = {
  id: string
  title: string
  issues: CompletenessIssue[]
}

const SECTIONS: CompletenessSection[] = [
  {
    id: 'manufactured-fertiliser',
    title: 'Manufactured fertiliser',
    issues: [
      {
        id: 'mf-1',
        title: 'Application date in the future',
        detail: 'Urea 46% N · Top East · 12 Mar 2026',
        recommendation: 'Shift to 12 Mar 2025.',
        severity: 'blocking',
      },
      {
        id: 'mf-2',
        title: 'Missing spring N split',
        detail: 'Long Bottom · single 220 kgN/ha pass',
        recommendation: 'Prefill a 60/40 split.',
        severity: 'warning',
      },
      {
        id: 'mf-3',
        title: 'Unusual product unit',
        detail: 'Yara Mila Actyva S · litres/ha',
        recommendation: 'Convert to kg/ha at 1.05 g/cm³.',
        severity: 'warning',
      },
    ],
  },
  {
    id: 'organic-fertiliser',
    title: 'Organic fertiliser',
    issues: [
      {
        id: 'of-1',
        title: 'No dry-matter percentage',
        detail: 'Saltway · 3 slurry applications',
        recommendation: 'Default to 6% (NRM 2023).',
        severity: 'warning',
      },
      {
        id: 'of-2',
        title: 'No nutrient analysis',
        detail: 'Compost · 12 fields',
        recommendation: 'Prefill from RB209 typicals.',
        severity: 'note',
      },
    ],
  },
  {
    id: 'crop-protection',
    title: 'Crop protection',
    issues: [
      {
        id: 'cp-1',
        title: 'No Sandy match for crop',
        detail: 'Oats COVER · Long Bottom',
        recommendation: 'Map to "Cover crop (oats)".',
        severity: 'blocking',
      },
      {
        id: 'cp-2',
        title: 'Working area > field boundary',
        detail: 'Stone Pightle · 18.4 vs 15.2 ha',
        recommendation: 'Clamp to 15.2 ha.',
        severity: 'warning',
      },
      {
        id: 'cp-3',
        title: 'Product not in registered list',
        detail: 'RoundUp Flex Plus',
        recommendation: 'Map to Roundup Flex.',
        severity: 'note',
      },
    ],
  },
]

const totalIssues = SECTIONS.reduce((acc, s) => acc + s.issues.length, 0)

const allIssueIds: string[] = SECTIONS.flatMap((s) => s.issues.map((i) => i.id))

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const CompletenessStep = () => {
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(
    () => {
      const seed: Record<string, Resolution> = {}
      for (const id of allIssueIds) seed[id] = 'pending'
      return seed
    },
  )
  const setResolution = (id: string, next: Resolution) =>
    setResolutions((curr) => ({ ...curr, [id]: next }))

  // Active card — the focused one shows full actions; the rest are compact.
  // Auto-advance focus to the next unresolved item after a commit, scoped
  // to the same section so the eye doesn't jump.
  const [activeId, setActiveId] = useState<string | null>(allIssueIds[0])

  const advanceFrom = (id: string, next: Resolution) => {
    if (next === 'pending') return
    const section = SECTIONS.find((s) => s.issues.some((i) => i.id === id))
    const pool = section?.issues ?? []
    const idx = pool.findIndex((i) => i.id === id)
    if (idx === -1) return
    for (let step = 1; step <= pool.length; step++) {
      const candidate = pool[(idx + step) % pool.length]
      if (candidate.id === id) continue
      const r = resolutions[candidate.id]
      if (r === 'pending') {
        setActiveId(candidate.id)
        return
      }
    }
  }

  const commit = (id: string, next: Resolution) => {
    setResolution(id, next)
    advanceFrom(id, next)
  }

  const totalUnresolved = allIssueIds.filter(
    (id) => resolutions[id] === 'pending',
  ).length

  return (
    <div className="relative mx-auto flex w-full max-w-[820px] flex-col gap-8 px-8 py-10 pb-24">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-text-primary">
          Completeness
        </h1>
        <p className="text-md text-text-secondary">
          Sandy flagged {totalIssues} {totalIssues === 1 ? 'gap' : 'gaps'} in
          your upload. Accept the suggested fix or skip — you can do either per
          item.
        </p>
      </header>

      {SECTIONS.map((section) => {
        const unresolvedInSection = section.issues.filter(
          (i) => resolutions[i.id] === 'pending',
        ).length
        return (
          <section
            key={section.id}
            className="flex flex-col gap-3 border-b-2 border-border-tertiary pb-6 last:border-0"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium text-text-secondary">
                {section.title}
              </h2>
              <span className="text-sm font-semibold text-text-secondary">
                {unresolvedInSection === 0
                  ? `${section.issues.length} resolved`
                  : `${unresolvedInSection} of ${section.issues.length} pending`}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {section.issues.map((issue) => (
                <CompletenessCard
                  key={issue.id}
                  issue={issue}
                  resolution={resolutions[issue.id]}
                  isActive={activeId === issue.id}
                  onFocus={() => setActiveId(issue.id)}
                  onCommit={(next) => commit(issue.id, next)}
                />
              ))}
            </div>
          </section>
        )
      })}

      <div className="sticky bottom-4 z-10 flex justify-end">
        {totalUnresolved > 0 ? (
          <p className="rounded-lg bg-bg-tertiary px-4 py-2 text-sm font-semibold text-text-secondary">
            {totalUnresolved} {totalUnresolved === 1 ? 'gap' : 'gaps'} still to
            review
          </p>
        ) : (
          <p className="rounded-lg bg-support-bg-green px-4 py-2 text-sm font-semibold text-text-brand-dark">
            All gaps resolved
          </p>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Card — mirrors the Fix step's IssuesView card structure                     */
/* -------------------------------------------------------------------------- */

const SEVERITY_LABEL: Record<Severity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
  note: 'Note',
}

const SeverityPill = ({ severity }: { severity: Severity }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
      severity === 'blocking' && 'bg-support-bg-red text-support-fg-red',
      severity === 'warning' && 'bg-support-bg-amber text-support-fg-amber',
      severity === 'note' && 'bg-bg-tertiary text-text-secondary',
    )}
  >
    {SEVERITY_LABEL[severity]}
  </span>
)

const StatusIndicator = ({ resolved }: { resolved: boolean }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors',
      resolved
        ? 'border-support-fg-green bg-support-fg-green text-text-primary-inverse'
        : 'border-border-secondary bg-bg-primary',
    )}
  >
    {resolved ? (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <title>Resolved</title>
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : null}
  </span>
)

const resolvedLabelFor = (r: Resolution): string | null => {
  if (r === 'accepted') return 'Accepted'
  if (r === 'skipped') return 'Skipped'
  return null
}

const isResolved = (r: Resolution) => r !== 'pending'

const CompletenessCard = ({
  issue,
  resolution,
  isActive,
  onFocus,
  onCommit,
}: {
  issue: CompletenessIssue
  resolution: Resolution
  isActive: boolean
  onFocus: () => void
  onCommit: (next: Resolution) => void
}) => {
  const resolved = isResolved(resolution)
  const resolvedLabel = resolvedLabelFor(resolution)

  // Compact card: collapsed read-only summary, mirrors Fix's inactive state.
  if (!isActive) {
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: also focusable via tab
      // biome-ignore lint/a11y/noStaticElementInteractions: card reads as a row
      <article
        onClick={onFocus}
        className={clsx(
          'group flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent bg-bg-primary p-5 shadow-sm transition-all duration-200',
          'hover:border-border-tertiary hover:shadow-md',
          resolved && 'opacity-70',
        )}
      >
        <StatusIndicator resolved={resolved} />
        <div className="flex flex-1 flex-col items-start gap-2">
          <p className="text-md font-medium text-text-primary">{issue.title}</p>
          <p className="text-sm text-text-secondary">{issue.detail}</p>
          <SeverityPill severity={issue.severity} />
        </div>
        {resolvedLabel ? (
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-text-brand-dark">
            <span>{resolvedLabel}</span>
          </span>
        ) : null}
      </article>
    )
  }

  // Focused card: full Fix-style layout with the Sandy recommendation block
  // beneath the headline and the action buttons on the right.
  return (
    <article
      className={clsx(
        'relative flex flex-col gap-4 rounded-xl bg-bg-primary p-6 shadow-md transition-all duration-200',
        resolved && 'opacity-90',
      )}
    >
      <div className="flex items-start gap-3">
        <StatusIndicator resolved={resolved} />
        <div className="flex flex-1 flex-col items-start gap-2">
          <p className="text-lg font-medium leading-7 text-text-primary">
            {issue.title}
          </p>
          <p className="text-sm text-text-secondary">{issue.detail}</p>
          <SeverityPill severity={issue.severity} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            variant="primary"
            onClick={() => onCommit('accepted')}
            disabled={resolution === 'accepted'}
          >
            Accept fix
          </Button>
          <Button
            variant="secondary"
            onClick={() => onCommit('skipped')}
            disabled={resolution === 'skipped'}
          >
            Skip
          </Button>
          {resolvedLabel ? (
            <button
              type="button"
              onClick={() => onCommit('pending')}
              className="inline-flex items-center gap-2 rounded-md bg-support-bg-green px-3 py-1 text-sm font-semibold text-text-brand-dark hover:bg-support-bg-green/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40"
            >
              <span>{resolvedLabel}</span>
              <span aria-hidden="true">·</span>
              <span>Undo</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-md bg-bg-secondary px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-brand-dark">
          Sandy fix
        </span>
        <p className="text-sm text-text-primary">{issue.recommendation}</p>
      </div>
    </article>
  )
}
