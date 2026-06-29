import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '../../../components/ui'
import type { DetectionSummary } from '../summary'
import { FarmsFieldsBrowser } from './FarmsFieldsBrowser'

/* -------------------------------------------------------------------------- */
/* IdentityPreview — summary card + review modal                              */
/*                                                                             */
/* Replaces the standalone refine "Summary" panel. Sits at the top of the     */
/* identity (farms-and-fields) step so the user sees what Sandy recognised    */
/* before diving into the unresolved issues.                                   */
/* -------------------------------------------------------------------------- */

export const IdentityPreview = ({ summary }: { summary: DetectionSummary }) => {
  const [open, setOpen] = useState(false)
  return (
    // Soft lime-green surface lifted from the Encouraged completeness card —
    // signals "here's what Sandy got right" without competing with the
    // unresolved-issue cards below.
    <section className="flex flex-col gap-4 rounded-xl bg-bayer-200 px-6 py-5 text-bayer-950">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap items-end gap-10">
          <Stat target={summary.farms.total} label="Farms recognised" />
          <Stat target={summary.fields.total} label="Fields recognised" />
          <Stat target={summary.totalRecords} label="Records detected" />
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Review farms & fields
        </Button>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Farms and fields we recognised"
        unstyled
        maxWidth="1100px"
        fillHeight
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Modal already renders its own close button in unstyled mode — we
              only own the visible heading here. */}
          <header className="flex items-start gap-4 px-8 pt-7 pb-5 pr-16">
            <h2 className="text-2xl font-medium leading-tight text-text-primary">
              Farms and fields we recognised
            </h2>
          </header>
          {/* Embedded table sits flush — no border, no extra padding. */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <FarmsFieldsBrowser summary={summary} unstyled />
          </div>
        </div>
      </Modal>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Count-up stat — ticks from 0 up to the target value over ~900ms            */
/* -------------------------------------------------------------------------- */

const COUNT_UP_DURATION_MS = 900

const useCountUp = (target: number) => {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) {
      setValue(0)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / COUNT_UP_DURATION_MS)
      // Ease-out cubic — fast start, gentle landing.
      const eased = 1 - (1 - t) ** 3
      setValue(Math.round(target * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target])

  return value
}

const Stat = ({ target, label }: { target: number; label: string }) => {
  const value = useCountUp(target)
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-semibold tabular-nums text-bayer-950">
        {value.toLocaleString()}
      </span>
      <span className="text-sm text-bayer-900/80">{label}</span>
    </div>
  )
}
