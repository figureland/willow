import clsx from 'clsx'

/* -------------------------------------------------------------------------- */
/* CompletionToast — fixed bottom-of-viewport push-up notification             */
/* -------------------------------------------------------------------------- */

/**
 * Shared toast used by the data-upload flows (refine completion, upload
 * re-scan announcement). Renders a pill at the bottom of the viewport that
 * fades + slides up when `visible` flips true.
 *
 * Pass a custom `icon` to swap the green tick for something else (e.g. a
 * spinner while a re-scan is mid-flight); the default is the green tick.
 */
export type CompletionToastProps = {
  visible: boolean
  label: string
  icon?: React.ReactNode
  /** Tailwind background-colour class for the pill. Defaults to green. */
  tone?: 'green' | 'neutral'
}

export const CompletionToast = ({
  visible,
  label,
  icon,
  tone = 'green',
}: CompletionToastProps) => (
  <div
    role="status"
    aria-live="polite"
    aria-hidden={!visible}
    className={clsx(
      'pointer-events-none fixed inset-x-0 bottom-[24px] z-30 flex justify-center px-4',
      'transition-all duration-300 ease-out',
      visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
    )}
  >
    <div
      className={clsx(
        'flex items-center gap-3 rounded-full px-5 py-3 text-text-primary-inverse shadow-lg',
        tone === 'green' && 'bg-support-fg-green',
        tone === 'neutral' && 'bg-text-primary',
      )}
    >
      {icon ?? <DefaultTick />}
      <span className="text-md font-semibold">{label}</span>
    </div>
  </div>
)

const DefaultTick = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <title>Complete</title>
    <path
      d="M5 12.5l4.5 4.5L19 7"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
