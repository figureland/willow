import clsx from 'clsx'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from './Button'
import { type WizardStep, WizardStepper } from './WizardStepper'

export type WizardStepConfig = WizardStep & {
  /** Content rendered when the step is active. */
  content: ReactNode
  /**
   * Optional gate — when false, the Continue button is disabled. Useful when
   * a step has required inputs the user hasn't completed.
   */
  canContinue?: boolean
  /**
   * Custom label for the Continue button on this step. Use this when a step
   * has a step-specific call to action ("Review N issues", "Run validation",
   * etc.). Falls back to the layout's default ("Continue" or `finishLabel`
   * on the last step).
   */
  continueLabel?: string
  /**
   * Intercept the Continue button on this step. Return `false` (or a Promise
   * resolving to `false`) to suppress the default navigation — the step can
   * then open a modal, run a side-effect, etc. Return `true` or `undefined`
   * to let the layout advance normally.
   */
  onContinue?: () => boolean | void | Promise<boolean | void>
  /**
   * Hide the layout's Continue button entirely on this step. Use when the
   * step owns its own primary CTA (e.g. a "Save to Sandy" button) and the
   * generic Continue would be redundant. Back stays visible.
   */
  hideContinue?: boolean
  /**
   * Render the step's content full-bleed — no padding around the body and
   * no inter-element gap. Use for steps that own their own outer chrome
   * (e.g. the inbox on the Refine step).
   */
  bare?: boolean
}

export type WizardLayoutProps = {
  /** Page title rendered in the top bar. */
  title: ReactNode
  /** Ordered list of steps. */
  steps: WizardStepConfig[]
  /**
   * Id of the currently active step. Drive this off the URL (path param or
   * search param) so browser back/forward Just Work. When the id doesn't
   * match any step, the layout falls back to step zero.
   */
  currentStepId: string | undefined
  /**
   * Called when the user navigates to a different step (Back, Continue, or
   * clicks the stepper). The consumer is responsible for pushing a new
   * history entry — typically via React Router's `navigate(targetPath)`.
   */
  onNavigate: (stepId: string) => void
  /** Called when the user presses "Cancel" in the top-right. */
  onCancel?: () => void
  /** Called when the user presses "Save and quit" in the top-right. */
  onSaveAndQuit?: () => void
  /**
   * Called when the user finishes the last step (Continue → done). Receives
   * no arguments; the consumer is responsible for any final submit work.
   */
  onComplete?: () => void
  /** Label for the trailing CTA on the final step. Defaults to "Finish". */
  finishLabel?: string
  className?: string
}

/**
 * Generic stepped flow layout. Fills inside the AppWrapper outlet with a
 * title bar, stepper row, scrollable step body, and a footer with back /
 * continue controls.
 *
 * Navigation is fully controlled: the consumer owns the URL (so browser
 * back/forward, deep links and refresh all work natively) and passes the
 * active step in via `currentStepId`. When the user moves to a new step
 * the layout fires `onNavigate(nextStepId)` for the consumer to push.
 *
 * The furthest visited step is tracked internally — when the user lands on
 * a deeper step we promote the bookmark forward, but we don't demote it
 * when they navigate backwards.
 */
export const WizardLayout = ({
  title,
  steps,
  currentStepId,
  onNavigate,
  onCancel,
  onSaveAndQuit,
  onComplete,
  finishLabel = 'Finish',
  className,
}: WizardLayoutProps) => {
  const currentIndex = useMemo(() => {
    const idx = steps.findIndex((s) => s.id === currentStepId)
    return idx >= 0 ? idx : 0
  }, [steps, currentStepId])

  // Track the furthest step the user has reached. Persisted in component
  // state, so this resets on full reload — that's fine for the prototype;
  // swap in localStorage if it becomes annoying.
  const [furthestIndex, setFurthestIndex] = useState(currentIndex)
  const lastPromoted = useRef(currentIndex)
  useEffect(() => {
    if (currentIndex > lastPromoted.current) {
      lastPromoted.current = currentIndex
      setFurthestIndex((prev) => Math.max(prev, currentIndex))
    }
  }, [currentIndex])

  const goToStep = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, nextIndex))
    if (clamped === currentIndex) return
    onNavigate(steps[clamped].id)
  }

  const step = steps[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === steps.length - 1
  const canContinue = step.canContinue !== false

  return (
    <div className={clsx('flex flex-1 min-h-0 flex-col', className)}>
      {/* Top bar — spans the full width above the rail + content. */}
      <header className="border-b-2 border-border-tertiary bg-bg-primary px-8 py-6">
        <div className="flex items-center gap-4">
          <h1 className="flex-1 min-w-0 truncate text-2xl font-semibold leading-9 text-text-primary">
            {title}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {onCancel ? (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            {onSaveAndQuit && !isFirst ? (
              <Button variant="secondary" onClick={onSaveAndQuit}>
                Save and quit
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Horizontal stepper — sits in its own thin row directly below the
          title bar so the main step body gets the full page width. */}
      <div className="border-b-2 border-border-tertiary bg-bg-primary px-8 py-3">
        <WizardStepper
          steps={steps.map(({ id, label, number }) => ({
            id,
            label,
            number,
          }))}
          current={currentIndex}
          furthest={furthestIndex}
          onStepClick={(i) => goToStep(i)}
        />
      </div>

      {/* Body — main step content fills the rest of the column. */}
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex flex-1 min-w-0 flex-col">
          <main
            className={clsx(
              'flex flex-1 flex-col',
              step.bare ? 'min-h-0' : 'gap-4 p-8',
            )}
          >
            {step.content}
          </main>

          <div className="border-t-2 border-border-tertiary bg-bg-primary px-8 py-4">
            <div className="flex items-center justify-between gap-2">
              {/* Spacer keeps Continue right-aligned when Back is hidden. */}
              {isFirst ? (
                <span />
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => goToStep(currentIndex - 1)}
                >
                  Back
                </Button>
              )}
              {step.hideContinue ? (
                <span />
              ) : (
                <Button
                  variant="primary"
                  disabled={!canContinue}
                  onClick={async () => {
                    if (step.onContinue) {
                      const result = await step.onContinue()
                      // Explicit `false` means "I handled it, don't advance".
                      if (result === false) return
                    }
                    if (isLast) onComplete?.()
                    else goToStep(currentIndex + 1)
                  }}
                >
                  {step.continueLabel ?? (isLast ? finishLabel : 'Continue')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
