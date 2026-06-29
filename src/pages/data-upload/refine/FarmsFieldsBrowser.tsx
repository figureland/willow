import clsx from 'clsx'
import { useMemo, useState } from 'react'
import type { DetectionSummary, FarmSummary } from '../summary'

/* -------------------------------------------------------------------------- */
/* FarmsFieldsBrowser — two-pane farm list + field table                       */
/*                                                                             */
/* Extracted from the old refine "Summary" panel so it can be re-used inside  */
/* the new identity-step modal without duplicating the layout.                 */
/* -------------------------------------------------------------------------- */

/**
 * Stable hash mapping (farmId, fieldName) to a "records detected" count.
 * Same inputs produce the same output across renders so the field table
 * doesn't reshuffle as the user clicks around.
 */
const recordCountFor = (farmId: string, fieldName: string): number => {
  const key = `${farmId}:${fieldName}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return 1 + (Math.abs(h) % 30)
}

const yearsObservedFor = (
  farmId: string,
  fieldName: string,
  allYears: number[],
): number[] => {
  if (allYears.length === 0) return []
  const key = `${farmId}:${fieldName}:years`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  const count = 1 + (Math.abs(h) % allYears.length)
  const seen = new Set<number>()
  for (let i = 0; i < count; i++) {
    const idx = Math.abs(h + i * 7919) % allYears.length
    seen.add(allYears[idx])
  }
  return [...seen].sort((a, b) => a - b)
}

const FarmRow = ({
  farm,
  active,
  onSelect,
}: {
  farm: FarmSummary
  active: boolean
  onSelect: () => void
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={active ? 'true' : undefined}
    className={clsx(
      'flex w-full items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      active
        ? 'border-border-primary bg-bg-tertiary'
        : 'border-transparent bg-bg-primary hover:border-border-tertiary hover:bg-bg-secondary',
    )}
  >
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-md font-medium text-text-primary">
        {farm.name}
      </span>
      <span className="text-sm text-text-secondary">
        {farm.fieldCount} {farm.fieldCount === 1 ? 'field' : 'fields'}
      </span>
    </div>
  </button>
)

export const FarmsFieldsBrowser = ({
  summary,
  /** Optional fixed pixel height for the inner table. Defaults to 450.
   *  Ignored when `unstyled` is true — the parent owns the height. */
  height = 450,
  /** When true, drop the rounded border + fixed height so the browser
   *  sits flush inside a parent that already supplies the chrome (e.g.
   *  the IdentityPreview review modal). */
  unstyled = false,
}: {
  summary: DetectionSummary
  height?: number
  unstyled?: boolean
}) => {
  const farms = summary.farmRows
  const [activeFarmId, setActiveFarmId] = useState<string>(
    () => farms[0]?.id ?? '',
  )
  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? farms[0]
  const fields = useMemo(() => {
    if (!activeFarm) return []
    const names: string[] = [...activeFarm.fieldNames]
    while (names.length < activeFarm.fieldCount) {
      names.push(`Field ${names.length + 1}`)
    }
    return names.slice(0, activeFarm.fieldCount).map((name) => ({
      name,
      records: recordCountFor(activeFarm.id, name),
      years: yearsObservedFor(activeFarm.id, name, summary.years),
    }))
  }, [activeFarm, summary.years])

  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden bg-bg-primary lg:flex-row',
        unstyled ? 'h-full' : 'rounded-xl border-2 border-border-tertiary',
      )}
      style={unstyled ? undefined : { height }}
    >
      <div className="flex min-h-0 w-full flex-col border-b-2 border-border-tertiary lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r-2">
        <header className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Farms ({farms.length})
          </p>
        </header>
        <ol className="flex flex-1 min-h-0 flex-col gap-1 overflow-y-auto p-3">
          {farms.map((farm) => (
            <li key={farm.id}>
              <FarmRow
                farm={farm}
                active={farm.id === activeFarmId}
                onSelect={() => setActiveFarmId(farm.id)}
              />
            </li>
          ))}
        </ol>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-baseline justify-between px-5 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Fields on {activeFarm?.name ?? '—'} ({fields.length})
          </p>
          <p className="text-xs text-text-secondary">
            {fields.reduce((a, b) => a + b.records, 0).toLocaleString()} records
            total
          </p>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-bg-secondary text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2 text-left">Field</th>
                <th className="w-[160px] px-3 py-2 text-left">Years</th>
                <th className="w-[120px] px-3 py-2 text-right">Records</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, idx) => (
                <tr
                  key={f.name}
                  className={clsx(
                    'align-middle',
                    idx > 0 && 'border-t border-border-tertiary',
                  )}
                >
                  <td className="px-3 py-2 text-md text-text-primary">
                    {f.name}
                  </td>
                  <td className="px-3 py-2 text-md tabular-nums text-text-secondary">
                    {f.years.join(', ')}
                  </td>
                  <td className="px-3 py-2 text-right text-md tabular-nums text-text-secondary">
                    {f.records.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
