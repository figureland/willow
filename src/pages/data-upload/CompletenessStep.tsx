import clsx from 'clsx'
import { useState } from 'react'
import { Badge, Button, Card } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

type Severity = 'blocking' | 'warning' | 'note'

type Resolution = 'pending' | 'accepted' | 'skipped'

type CompletenessIssue = {
  id: string
  /** Short bold title — what's wrong, in plain language. */
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

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const CompletenessStep = () => {
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(
    () => {
      const seed: Record<string, Resolution> = {}
      for (const section of SECTIONS) {
        for (const issue of section.issues) seed[issue.id] = 'pending'
      }
      return seed
    },
  )
  const setResolution = (id: string, next: Resolution) =>
    setResolutions((curr) => ({ ...curr, [id]: next }))

  const resolvedCount = Object.values(resolutions).filter(
    (r) => r !== 'pending',
  ).length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h2 className="text-2xl font-semibold leading-9 text-text-primary">
            Completeness
          </h2>
          <p className="text-md text-text-secondary">
            Gap analysis showing what's missing and whether Sandy can prefill.
            Accept the fix or skip — you can do either per item.
          </p>
        </div>
        <Badge tone={resolvedCount === totalIssues ? 'green' : 'neutral'}>
          {resolvedCount} of {totalIssues} resolved
        </Badge>
      </header>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <section key={section.id} className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-text-primary">
              {section.title}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {section.issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  resolution={resolutions[issue.id]}
                  onResolve={(next) => setResolution(issue.id, next)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Issue card                                                                  */
/* -------------------------------------------------------------------------- */

const SEVERITY_LABEL: Record<Severity, string> = {
  blocking: 'Blocking',
  warning: 'Warning',
  note: 'Note',
}

const SEVERITY_TONE: Record<Severity, 'red' | 'orange' | 'green'> = {
  blocking: 'red',
  warning: 'orange',
  note: 'green',
}

const IssueCard = ({
  issue,
  resolution,
  onResolve,
}: {
  issue: CompletenessIssue
  resolution: Resolution
  onResolve: (next: Resolution) => void
}) => (
  <Card
    className={clsx(
      'flex flex-col gap-3',
      resolution === 'skipped' && 'opacity-60',
    )}
  >
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={SEVERITY_TONE[issue.severity]} size="sm">
          {SEVERITY_LABEL[issue.severity]}
        </Badge>
        {resolution !== 'pending' ? (
          <Badge
            tone={resolution === 'accepted' ? 'green' : 'neutral'}
            size="sm"
          >
            {resolution === 'accepted' ? 'Accepted' : 'Skipped'}
          </Badge>
        ) : null}
      </div>
      <h4 className="text-md font-semibold text-text-primary">{issue.title}</h4>
      <p className="text-sm text-text-secondary">{issue.detail}</p>
    </header>

    <div className="flex flex-col gap-1 rounded-md bg-bg-secondary px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-brand-dark">
        Sandy fix
      </span>
      <p className="text-sm text-text-primary">{issue.recommendation}</p>
    </div>

    <div className="flex items-center gap-2">
      <Button
        variant={resolution === 'accepted' ? 'primary' : 'secondary'}
        onClick={() => onResolve('accepted')}
      >
        Accept fix
      </Button>
      <Button
        variant={resolution === 'skipped' ? 'primary' : 'ghost'}
        onClick={() => onResolve('skipped')}
      >
        Skip
      </Button>
    </div>
  </Card>
)
