import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Spinner, TextInput } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* TemplateDescribeTray — AI-flavoured describe popover with an optional      */
/* template title alongside the description. Mirrors the schema DescribeTray  */
/* animation (idle → thinking → done) so users get the same beat of feedback. */
/* When the AI step finishes we hand back the name + description verbatim;    */
/* the caller decides what to do with them (e.g. mint a new custom template). */
/* -------------------------------------------------------------------------- */

const ASSIST_STEPS = [
  'Reading your description…',
  'Scanning the file for matches…',
  'Drafting a template…',
] as const

export type TemplateDescribeTrayProps = {
  open: boolean
  onClose: () => void
  /** Heading inside the tray. */
  title?: string
  /** Initial template name when re-opening to edit. */
  initialName?: string
  /** Initial description when re-opening to edit. */
  initialDescription?: string
  /**
   * Fired once the simulated assist finishes. Hands back the user's input;
   * the caller writes it back into review state, mints a template id, etc.
   */
  onApply: (next: { name: string; description: string }) => void
}

export const TemplateDescribeTray = ({
  open,
  onClose,
  title = 'Describe this file',
  initialName,
  initialDescription,
  onApply,
}: TemplateDescribeTrayProps) => {
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState(initialName ?? '')
  const [text, setText] = useState(initialDescription ?? '')
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Reset every time the tray reopens so a previous session doesn't bleed
  // forward + animations stay crisp.
  useEffect(() => {
    if (!open) {
      setMounted(false)
      return
    }
    setName(initialName ?? '')
    setText(initialDescription ?? '')
    setPhase('idle')
    setStepIndex(0)
    const t = window.setTimeout(() => setMounted(true), 10)
    return () => window.clearTimeout(t)
  }, [open, initialName, initialDescription])

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
        onApply({ name: name.trim(), description: text.trim() })
        window.setTimeout(() => onClose(), 900)
      },
      ASSIST_STEPS.length * 700 + 200,
    )
    return () => {
      window.clearInterval(stepTimer)
      window.clearTimeout(doneTimer)
    }
  }, [phase, name, text, onApply, onClose])

  if (!open) return null

  const handleSubmit = () => {
    if (!text.trim()) return
    setPhase('thinking')
  }

  const sheet = (
    <>
      <button
        type="button"
        aria-label="Close describe popover"
        onClick={() => phase === 'idle' && onClose()}
        className={clsx(
          'fixed inset-0 z-[100] cursor-default bg-bg-primary/40 transition-opacity duration-200',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-label={title}
        className={clsx(
          'mx-auto w-full max-w-[640px]',
          'fixed inset-x-0 bottom-0 z-[101]',
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
            disabled={phase === 'thinking'}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <title>Close</title>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {phase === 'idle' ? (
          <div className="flex flex-col gap-3 px-6 pb-5 pt-3">
            <TextInput
              label="Template name (optional)"
              value={name}
              onValueChange={setName}
              placeholder="e.g. 2025 fertiliser export"
            />
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
              placeholder="Tell Sandy how this file is laid out — what's in each column, where the dates live, anything that helps us read it."
              rows={10}
              className={clsx(
                'w-full resize-none rounded-lg border-2 border-border-tertiary bg-bg-primary px-3 py-2',
                'text-md text-text-primary placeholder:text-text-placeholder',
                'focus:border-border-primary focus:outline-none',
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-text-secondary">
                Sandy will use your description to build a reusable template.
              </p>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!text.trim()}
              >
                Send to Sandy
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-6 pb-6 pt-3">
            {name ? (
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{name}</span>
              </p>
            ) : null}
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
                  ? 'Template drafted — review it on the file.'
                  : ASSIST_STEPS[stepIndex]}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(sheet, document.body)
    : sheet
}
