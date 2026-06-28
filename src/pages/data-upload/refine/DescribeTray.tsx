import clsx from 'clsx'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
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

  return (
    <>
      <button
        type="button"
        aria-label="Close describe tray"
        onClick={() => phase === 'idle' && onClose()}
        className={clsx(
          'absolute inset-0 z-10 cursor-default bg-bg-primary/40 transition-opacity duration-200',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-label={title}
        className={clsx(
          'absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[500px]',
          'rounded-t-2xl border-2 border-b-0 border-border-secondary bg-bg-primary shadow-2xl',
          'transition-all duration-300 ease-out',
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-4">
          <p className="text-md font-medium text-text-primary">{title}</p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
          <div className="flex flex-col gap-3 px-5 pb-4 pt-3">
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
              rows={4}
              className={clsx(
                'w-full resize-none rounded-lg border-2 border-border-tertiary bg-bg-primary px-3 py-2',
                'text-sm text-text-primary placeholder:text-text-placeholder',
                'focus:border-border-primary focus:outline-none',
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-text-secondary">
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
          <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
            <div className="rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text-primary">
              {text}
            </div>
            <div className="flex items-center gap-3 px-1 py-2">
              {phase === 'thinking' ? (
                <Spinner size={16} className="text-text-secondary" />
              ) : (
                <span
                  aria-hidden
                  className="grid size-4 place-items-center rounded-full bg-support-fg-green text-text-primary-inverse"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
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
              <p className="text-sm text-text-primary transition-opacity duration-200">
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
