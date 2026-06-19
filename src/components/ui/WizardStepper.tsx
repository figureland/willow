import clsx from 'clsx'
import type { ReactNode } from 'react'
import { IconChevronRight } from './icons'

export type WizardStepStatus = 'upcoming' | 'current' | 'complete'

export type WizardStep = {
  /** Stable identifier (mapped to `?step=` in URL-driven wizards). */
  id: string
  /** Human-readable label shown next to the step number. */
  label: ReactNode
  /**
   * Optional override for the displayed step number. Defaults to the step's
   * 1-based index in the array.
   */
  number?: number | string
}

export type WizardStepperProps = {
  steps: WizardStep[]
  /** 0-based index of the active step. */
  current: number
  /**
   * Highest 0-based index the user has reached so far. Steps `<= furthest`
   * are marked complete (with the green tick); ahead steps stay upcoming.
   * Defaults to `current` (no future completion implied).
   */
  furthest?: number
  /**
   * If provided, completed/visited steps become clickable so users can hop
   * back. Pass the active-step setter from the parent wizard.
   */
  onStepClick?: (index: number, step: WizardStep) => void
  className?: string
}

const stepStatus = (
  index: number,
  current: number,
  furthest: number,
): WizardStepStatus => {
  if (index === current) return 'current'
  // Any step the user has reached counts as visited, including the furthest
  // step itself (e.g. when they've navigated back from there).
  if (index <= furthest) return 'complete'
  return 'upcoming'
}

/**
 * Horizontal numbered step indicator for multi-page flows. Pure presentation;
 * the parent owns the current-index state.
 */
export const WizardStepper = ({
  steps,
  current,
  furthest,
  onStepClick,
  className,
}: WizardStepperProps) => {
  const furthestIdx = furthest ?? current
  return (
    <ol
      aria-label="Progress"
      className={clsx('flex flex-wrap items-center gap-x-3 gap-y-2', className)}
    >
      {steps.map((step, i) => {
        const status = stepStatus(i, current, furthestIdx)
        const clickable =
          !!onStepClick && (status === 'complete' || status === 'current')
        const number = step.number ?? i + 1
        return (
          <li key={step.id} className="flex items-center gap-3">
            <button
              type="button"
              onClick={clickable ? () => onStepClick(i, step) : undefined}
              disabled={!clickable}
              aria-current={status === 'current' ? 'step' : undefined}
              className={clsx(
                'group/wizard-step inline-flex items-center gap-2 rounded-md px-2 py-1',
                'text-md font-medium tracking-[0.15px] transition-colors',
                clickable
                  ? 'cursor-pointer hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40'
                  : 'cursor-default',
                status === 'current' && 'text-text-primary',
                status === 'complete' && 'text-text-secondary',
                status === 'upcoming' && 'text-text-secondary',
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'inline-flex size-6 items-center justify-center rounded-pill text-sm font-semibold tracking-[0.15px]',
                  status === 'current' &&
                    'bg-bg-brand-primary text-text-primary-inverse',
                  status === 'complete' && 'bg-sandy-100 text-text-brand-dark',
                  status === 'upcoming' && 'bg-bg-tertiary text-text-secondary',
                )}
              >
                {number}
              </span>
              <span className="pt-[2px]">{step.label}</span>
            </button>
            {i < steps.length - 1 ? (
              <span aria-hidden="true" className="text-icon-secondary shrink-0">
                <IconChevronRight size={16} />
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
