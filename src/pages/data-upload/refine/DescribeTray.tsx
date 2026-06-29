import clsx from 'clsx'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Spinner } from '../../../components/ui'

/* -------------------------------------------------------------------------- */
/* DescribeAutoOpenContext — lets the IssueCard request "open the tray on     */
/* mount" without re-shaping the IssueAdapter contract.                        */
/* -------------------------------------------------------------------------- */

export const DescribeAutoOpenContext = createContext(false)
export const useDescribeAutoOpen = () => useContext(DescribeAutoOpenContext)

/* -------------------------------------------------------------------------- */
/* DescribeTray — slide-up AI-assist tray shared by the schema + value-mapping */
/* panels. Caller passes the labels, placeholder, and an apply callback that  */
/* mutates the panel state when the simulated assist finishes.                 */
/* -------------------------------------------------------------------------- */

export type DescribeTrayProps = {
  open: boolean
  onClose: () => void
  /** Button + dialog title (e.g. "Describe this file" / "Describe these values"). */
  triggerLabel?: string
  title: string
  placeholder: string
  /** Footer hint shown beneath the textarea while idle. */
  hint?: string
  /** Called once the simulated assist finishes — applies the AI's guesses. */
  onApply: () => void
  /**
   * When true, portal the tray into `document.body` and pin it to the
   * bottom of the viewport. When false (default), stay positioned
   * relative to the nearest positioned ancestor — used by the card-level
   * trigger so the tray slides up from the bottom of the card.
   */
  portal?: boolean
  /**
   * Optional inventory of expected properties + whether Sandy could already
   * find them. Rendered ABOVE the textarea so the user can see what they
   * need to describe (the missing ones) at a glance.
   */
  expectedProperties?: {
    label: string
    presence: 'found' | 'missing'
  }[]
  /** Heading copy for the inventory block. Defaults to "What we're looking for". */
  expectedPropertiesTitle?: string
  /**
   * Singular/plural noun shown in the missing summary. Defaults to
   * `{ one: 'still missing', many: 'still missing' }`.
   */
  expectedPropertiesMissingLabel?: { one: string; many: string }
}

const ASSIST_STEPS = [
  'Reading your description…',
  'Scanning the data for matches…',
  'Drafting a mapping…',
] as const

export const DescribeTray = ({
  open,
  onClose,
  title,
  placeholder,
  hint,
  onApply,
  portal = false,
  expectedProperties,
  expectedPropertiesTitle,
  expectedPropertiesMissingLabel,
}: DescribeTrayProps) => {
  const [mounted, setMounted] = useState(false)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!open) {
      setMounted(false)
      return
    }
    const t = window.setTimeout(() => setMounted(true), 10)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (open) return
    setText('')
    setPhase('idle')
    setStepIndex(0)
  }, [open])

  useEffect(() => {
    if (open && mounted && phase === 'idle') {
      textareaRef.current?.focus()
    }
  }, [open, mounted, phase])

  useEffect(() => {
    if (phase !== 'thinking') return
    const stepTimer = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ASSIST_STEPS.length - 1))
    }, 700)
    const doneTimer = window.setTimeout(
      () => {
        setPhase('done')
        onApply()
        window.setTimeout(() => onClose(), 900)
      },
      ASSIST_STEPS.length * 700 + 200,
    )
    return () => {
      window.clearInterval(stepTimer)
      window.clearTimeout(doneTimer)
    }
  }, [phase, onApply, onClose])

  if (!open) return null

  const handleSubmit = () => {
    if (!text.trim()) return
    setPhase('thinking')
  }

  const tray = (
    <>
      <button
        type="button"
        aria-label="Close describe tray"
        onClick={() => phase === 'idle' && onClose()}
        className={clsx(
          'cursor-default bg-bg-primary/40 transition-opacity duration-200',
          portal ? 'fixed inset-0 z-[100]' : 'absolute inset-0 z-10',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-label={title}
        className={clsx(
          'mx-auto w-full',
          expectedProperties ? 'max-w-[760px]' : 'max-w-[640px]',
          portal
            ? 'fixed inset-x-0 bottom-0 z-[101]'
            : 'absolute inset-x-0 bottom-0 z-20',
          'rounded-t-2xl border-2 border-b-0 border-border-secondary bg-bg-primary shadow-2xl',
          'transition-all duration-300 ease-out',
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-6 pt-5">
          <p className="text-lg font-medium text-text-primary">{title}</p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <title>Close</title>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {phase === 'idle' ? (
          <div className="flex flex-col gap-3 px-6 pb-5 pt-3">
            {expectedProperties && expectedProperties.length > 0 ? (
              <ExpectedPropertiesList
                properties={expectedProperties}
                title={expectedPropertiesTitle}
                missingLabel={expectedPropertiesMissingLabel}
              />
            ) : null}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder={placeholder}
              rows={10}
              className={clsx(
                'w-full resize-none rounded-lg border-2 border-border-tertiary bg-bg-primary px-3 py-2',
                'text-md text-text-primary placeholder:text-text-placeholder',
                'focus:border-border-primary focus:outline-none',
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-text-secondary">
                {hint ?? 'Sandy will read your description and fill the gaps.'}
              </p>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!text.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-6 pb-6 pt-3">
            <div className="rounded-lg bg-bg-secondary px-4 py-3 text-md text-text-primary">
              {text}
            </div>
            <div className="flex items-center gap-3 px-1 py-2">
              {phase === 'thinking' ? (
                <Spinner size={18} className="text-text-secondary" />
              ) : (
                <span
                  aria-hidden
                  className="grid size-5 place-items-center rounded-full bg-support-fg-green text-text-primary-inverse"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <title>Done</title>
                    <path
                      d="M5 12l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              <p className="text-md text-text-primary transition-opacity duration-200">
                {phase === 'done'
                  ? 'Mapping drafted — review below.'
                  : ASSIST_STEPS[stepIndex]}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return portal && typeof document !== 'undefined'
    ? createPortal(tray, document.body)
    : tray
}

/* -------------------------------------------------------------------------- */
/* ExpectedPropertiesList — found vs missing inventory shown above the input  */
/* -------------------------------------------------------------------------- */

const ExpectedPropertiesList = ({
  properties,
  title,
  missingLabel,
}: {
  properties: { label: string; presence: 'found' | 'missing' }[]
  title?: string
  missingLabel?: { one: string; many: string }
}) => {
  const missingCount = properties.filter((p) => p.presence === 'missing').length
  const summary =
    missingCount === 0
      ? 'All found'
      : `${missingCount} ${
          missingCount === 1
            ? (missingLabel?.one ?? 'still missing')
            : (missingLabel?.many ?? 'still missing')
        }`
  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-border-tertiary bg-bg-secondary px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {title ?? "What we're looking for"}
        </p>
        <p className="text-xs text-text-secondary">{summary}</p>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {properties.map((p) => {
          const found = p.presence === 'found'
          return (
            <li
              key={p.label}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-xs font-medium',
                found
                  ? 'border-support-border-green bg-support-bg-green text-text-brand-dark'
                  : 'border-support-border-amber bg-support-bg-amber text-support-fg-amber',
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  'inline-block size-1.5 rounded-full',
                  found ? 'bg-support-fg-green' : 'bg-support-fg-amber',
                )}
              />
              {p.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* DescribeTrigger — the button that opens the tray. Shared chrome/icon style. */
/* -------------------------------------------------------------------------- */

export const DescribeTrigger = ({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-md border-2 border-border-tertiary',
      'bg-bg-primary px-2.5 py-1 text-xs font-medium text-text-primary',
      'transition-colors hover:border-border-secondary hover:bg-bg-tertiary',
    )}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <title>Sparkle</title>
      <path
        d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"
        fill="currentColor"
      />
    </svg>
    {label}
  </button>
)
