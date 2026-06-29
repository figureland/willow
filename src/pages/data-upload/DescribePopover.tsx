import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, TextInput } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* DescribePopover — slide-up sheet for editing the file's plain-text         */
/* description. No simulated AI: the text is just saved back to the caller.   */
/* When `templateName` props are provided, surfaces an optional template-name */
/* input above the description so the user can name the new custom template.  */
/* -------------------------------------------------------------------------- */

export type DescribePopoverProps = {
  open: boolean
  onClose: () => void
  /** Current description (so re-opening shows what was previously typed). */
  value: string
  onSave: (next: string) => void
  title?: string
  placeholder?: string
  /** When provided, render a template-name input above the textarea. */
  templateName?: string
  onTemplateNameSave?: (next: string) => void
}

export const DescribePopover = ({
  open,
  onClose,
  value,
  onSave,
  title = 'Describe this file',
  placeholder = "e.g. Each row is a fertiliser application. Crop variety lives in the 'variety' column.",
  templateName,
  onTemplateNameSave,
}: DescribePopoverProps) => {
  const [mounted, setMounted] = useState(false)
  const [text, setText] = useState(value)
  const [name, setName] = useState(templateName ?? '')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const showTemplateName = onTemplateNameSave !== undefined

  useEffect(() => {
    if (!open) {
      setMounted(false)
      return
    }
    setText(value)
    setName(templateName ?? '')
    const t = window.setTimeout(() => setMounted(true), 10)
    return () => window.clearTimeout(t)
  }, [open, value, templateName])

  useEffect(() => {
    if (open && mounted) textareaRef.current?.focus()
  }, [open, mounted])

  if (!open) return null

  const handleSave = () => {
    onSave(text.trim())
    if (showTemplateName) onTemplateNameSave?.(name.trim())
    onClose()
  }
  const handleClear = () => {
    onSave('')
    if (showTemplateName) onTemplateNameSave?.('')
    onClose()
  }

  const sheet = (
    <>
      <button
        type="button"
        aria-label="Close describe popover"
        onClick={onClose}
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

        <div className="flex flex-col gap-3 px-6 pb-5 pt-3">
          {showTemplateName ? (
            <TextInput
              label="Template name (optional)"
              value={name}
              onValueChange={setName}
              placeholder="e.g. 2025 fertiliser export"
            />
          ) : null}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSave()
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
              Sandy uses this to help understand the file structure.
            </p>
            <div className="flex items-center gap-2">
              {value ? (
                <Button variant="secondary" onClick={handleClear}>
                  Clear
                </Button>
              ) : null}
              <Button variant="primary" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return typeof document !== 'undefined'
    ? createPortal(sheet, document.body)
    : sheet
}
