import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, MultiSelect, Select } from '../../components/ui'
import { DescribePopover } from './DescribePopover'
import { FileThumb, rowToneClasses, thumbStateFor } from './FileRecognitionRow'
import {
  BUILTIN_TEMPLATES,
  CATEGORY_OPTIONS,
  CUSTOM_TEMPLATES,
  type DataCategoryTag,
  getSavedTemplate,
  isFileIssue,
  type RecognitionResult,
  type ReviewState,
} from './recognition'
import type { UploadedFile } from './UploadStep'

/* -------------------------------------------------------------------------- */
/* FileReviewModal — carousel over every file with a per-file editor          */
/* -------------------------------------------------------------------------- */

export type FileReviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: UploadedFile[]
  recognitions: Record<string, RecognitionResult>
  reviews: Record<string, ReviewState>
  onChange: (fileId: string, next: ReviewState) => void
  /**
   * Either the file id to single out (card-click flow), or "issues" to
   * restrict the carousel to files Sandy flagged with warnings / errors.
   */
  scope?: { kind: 'single'; fileId: string } | { kind: 'issues' }
  /** Fired after the user closes the modal — caller decides whether to
   *  trigger a re-scan based on whether the reviews changed. */
  onDone?: () => void
}

export const FileReviewModal = ({
  open,
  onOpenChange,
  files,
  recognitions,
  reviews,
  onChange,
  scope,
  onDone,
}: FileReviewModalProps) => {
  // Build the carousel's file list from the scope. Single-file scope yields
  // a one-item carousel (no dots); "issues" scope filters to flagged files.
  const visibleFiles = useMemo(() => {
    if (!scope) return files
    if (scope.kind === 'single') {
      const f = files.find((x) => x.id === scope.fileId)
      return f ? [f] : []
    }
    return files.filter((f) => isFileIssue(recognitions[f.id]))
  }, [files, recognitions, scope])

  const [index, setIndex] = useState(0)
  // Re-seed the active index whenever the modal opens or the scope shifts
  // (e.g. card-click → issues-only).
  // biome-ignore lint/correctness/useExhaustiveDependencies: scope drives reset
  useEffect(() => {
    if (open) setIndex(0)
  }, [open, scope])

  const total = visibleFiles.length
  const file = visibleFiles[Math.max(0, Math.min(index, total - 1))]
  const recognition = file ? recognitions[file.id] : undefined
  const review = file ? reviews[file.id] : undefined

  if (!file || !recognition || !review) return null

  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1))
  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const isLast = index === total - 1

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) onDone?.()
      }}
      title="Review your files"
      unstyled
      maxWidth="760px"
      fillHeight
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-col gap-1 px-8 pb-4 pt-8">
          <h2 className="text-3xl font-medium leading-tight text-text-primary">
            Review your files
          </h2>
          <p className="text-md text-text-secondary">
            Confirm what's in each file so Sandy reads it the right way.
          </p>
        </header>

        {/* Carousel */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {visibleFiles.map((f) => {
              const r = recognitions[f.id]
              const rv = reviews[f.id]
              if (!r || !rv) {
                return (
                  <section
                    key={f.id}
                    className="h-full w-full shrink-0"
                    aria-hidden
                  />
                )
              }
              return (
                <section
                  key={f.id}
                  className="h-full w-full shrink-0 overflow-y-auto px-8 pb-6"
                >
                  <FileReviewPanel
                    file={f}
                    recognition={r}
                    review={rv}
                    onChange={(next) => onChange(f.id, next)}
                  />
                </section>
              )
            })}
          </div>
        </div>

        {/* Footer — Back · dots · Next/Done, flush against the bottom */}
        <footer className="flex items-center justify-between gap-4 border-t-2 border-border-tertiary px-8 py-4">
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <Button variant="secondary" onClick={goPrev}>
                Back
              </Button>
            ) : null}
          </div>
          {total > 1 ? (
            <PaginationDots
              count={total}
              active={index}
              onSelect={(i) => setIndex(i)}
            />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {isLast ? (
              <Button variant="primary" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            ) : (
              <Button variant="primary" onClick={goNext}>
                Next
              </Button>
            )}
          </div>
        </footer>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* PaginationDots                                                              */
/* -------------------------------------------------------------------------- */

const PaginationDots = ({
  count,
  active,
  onSelect,
}: {
  count: number
  active: number
  onSelect: (i: number) => void
}) => (
  <div className="flex items-center justify-center gap-2">
    {Array.from({ length: count }, (_, i) => (
      <button
        // biome-ignore lint/suspicious/noArrayIndexKey: index IS the identity
        key={i}
        type="button"
        aria-label={`Go to file ${i + 1}`}
        aria-current={i === active ? 'true' : undefined}
        onClick={() => onSelect(i)}
        className={clsx(
          'size-2.5 rounded-full transition-all duration-200',
          i === active
            ? 'w-6 bg-text-primary'
            : 'bg-border-secondary hover:bg-border-secondary-hover',
        )}
      />
    ))}
  </div>
)

/* -------------------------------------------------------------------------- */
/* Per-file body                                                               */
/* -------------------------------------------------------------------------- */

const FileReviewPanel = ({
  file,
  recognition,
  review,
  onChange,
}: {
  file: UploadedFile
  recognition: RecognitionResult
  review: ReviewState
  onChange: (next: ReviewState) => void
}) => {
  const [describeOpen, setDescribeOpen] = useState(false)
  // Local "is the template-picker open" — toggled by the Change action.
  const [changingTemplate, setChangingTemplate] = useState(false)

  const isError = recognition.kind === 'error'
  const headerState = thumbStateFor(recognition, false)
  // Source of truth for the attached template is the review state — the
  // recogniser only seeds it initially via seedReview(). This lets the user
  // explicitly remove the template by clearing review.matchedTemplateId.
  const activeTemplate = getSavedTemplate(review.matchedTemplateId)

  const setCategories = (next: DataCategoryTag[]) =>
    onChange({ ...review, categories: next, reviewed: true })

  const setTemplateId = (next: string) =>
    onChange({
      ...review,
      matchedTemplateId: next,
      // Picking a saved template clears any in-progress new-template draft.
      createNewTemplate: false,
      newTemplateName: undefined,
      reviewed: true,
    })

  const setNewTemplateName = (next: string) =>
    onChange({
      ...review,
      newTemplateName: next.length > 0 ? next : undefined,
      reviewed: true,
    })

  const setCreateNewTemplate = (next: boolean) =>
    onChange({ ...review, createNewTemplate: next, reviewed: true })

  const removeTemplate = () =>
    onChange({
      ...review,
      matchedTemplateId: undefined,
      reviewed: true,
    })

  const setDescription = (next: string) =>
    onChange({
      ...review,
      description: next.length > 0 ? next : undefined,
      reviewed: true,
    })

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* File header — thumb + filename. Status communicated via row tint. */}
      <div
        className={clsx(
          'flex items-start gap-4 rounded-xl border-2 p-4',
          rowToneClasses(headerState),
        )}
      >
        <FileThumb kind={file.kind} state={headerState} />
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <p className="truncate text-xl font-medium text-text-primary">
            {file.name}
          </p>
          <p className="text-md text-text-secondary">
            {recognition.templateLabel}
            {recognition.templateNote ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>{recognition.templateNote}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Error surface — only the hard "invalid Sandy template" case keeps
          its red treatment. The softer "no matching custom template" case
          is rolled into the Template panel below as plain copy. */}
      {isError && recognition.errorVariant === 'invalid-sandy-template' ? (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-support-border-red bg-support-bg-red px-4 py-4">
          <p className="text-lg font-medium text-support-fg-red">
            {recognition.errorMessage}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                const a = document.createElement('a')
                a.href = '/api/template.xlsx'
                a.download = ''
                a.click()
              }}
            >
              Download a fresh Sandy template
            </Button>
          </div>
        </div>
      ) : null}

      {/* Consolidated template panel. Sits above Data categories.
           Three states:
            1. picker open                      → grouped Select + Cancel
            2. saved template attached          → "We recognise this file as
                                                   your X" + Change
            3. no template attached             → minimal info line + two
                                                   buttons split by "or"
                                                   (Link existing / Describe) */}
      {recognition.kind !== 'error' ||
      recognition.errorVariant === 'no-existing-template' ? (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-border-tertiary bg-bg-primary px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-md font-medium text-text-primary">Template</p>
            {!changingTemplate && activeTemplate ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Drop the binding, flip into "creating new" mode, and
                    // open the Describe popover so the user can immediately
                    // author a new custom template.
                    removeTemplate()
                    setCreateNewTemplate(true)
                    setDescribeOpen(true)
                  }}
                >
                  Create new instead
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setChangingTemplate(true)}
                >
                  Change
                </Button>
              </div>
            ) : null}
          </div>

          {changingTemplate ? (
            <>
              <Select<string>
                aria-label="Saved template"
                value={review.matchedTemplateId ?? activeTemplate?.id ?? ''}
                onValueChange={(v) => {
                  if (!v) return
                  setTemplateId(v)
                  setChangingTemplate(false)
                }}
                items={[
                  {
                    label: 'Built-in',
                    options: BUILTIN_TEMPLATES.map((t) => ({
                      value: t.id,
                      label: t.name,
                      hint: t.lastUsedLabel,
                    })),
                  },
                  {
                    label: 'Your templates',
                    options: CUSTOM_TEMPLATES.map((t) => ({
                      value: t.id,
                      label: t.name,
                      hint: t.lastUsedLabel,
                    })),
                  },
                ]}
                clearable={false}
                placeholder="Pick a template"
              />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setChangingTemplate(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : activeTemplate ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-md text-text-primary">
                We'll import this file using the{' '}
                <span className="font-medium">{activeTemplate.name}</span>{' '}
                template.
              </p>
              <p className="text-sm text-text-secondary">
                {activeTemplate.lastUsedLabel}
              </p>
            </div>
          ) : review.createNewTemplate ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="text-md text-text-primary">
                    Importing as a new file type
                    {review.newTemplateName ? (
                      <>
                        :{' '}
                        <span className="font-medium">
                          {review.newTemplateName}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-sm text-text-secondary">
                    We'll save these settings as a new template for next time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setDescribeOpen(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCreateNewTemplate(false)
                      setDescription('')
                      setNewTemplateName('')
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {review.description ? (
                <div className="rounded-lg bg-bg-secondary px-3 py-2">
                  <p className="whitespace-pre-wrap text-md text-text-primary">
                    {review.description}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                We couldn't match this file to a saved template. We'll create a
                new one for you.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setChangingTemplate(true)}
                >
                  Link to existing template
                </Button>
                <span className="text-sm text-text-secondary">or</span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreateNewTemplate(true)
                    setDescribeOpen(true)
                  }}
                >
                  Create new template
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Category picker (multi-select) */}
      {recognition.kind !== 'error' ||
      recognition.errorVariant === 'no-existing-template' ? (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-border-tertiary bg-bg-primary px-4 py-3">
          <p className="text-md font-medium text-text-primary">
            What sort of data is in this file?
          </p>
          <MultiSelect<DataCategoryTag>
            aria-label="What sort of data is in this file?"
            value={review.categories}
            onValueChange={setCategories}
            items={CATEGORY_OPTIONS}
            variant="pills"
            placeholder="Add categories…"
          />
        </div>
      ) : null}

      <DescribePopover
        open={describeOpen}
        onClose={() => setDescribeOpen(false)}
        value={review.description ?? ''}
        onSave={(next) => setDescription(next)}
        title="Describe this file"
        // Only expose the template-name field when we're actually about to
        // create a new template (no saved one attached yet).
        templateName={
          activeTemplate ? undefined : (review.newTemplateName ?? '')
        }
        onTemplateNameSave={
          activeTemplate ? undefined : (next) => setNewTemplateName(next)
        }
      />
    </div>
  )
}
