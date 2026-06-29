import clsx from 'clsx'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui'
import { CompletionToast } from './CompletionToast'
import { FileRecognitionRow } from './FileRecognitionRow'
import { FileReviewModal } from './FileReviewModal'
import {
  isFileIssue,
  type RecognitionResult,
  type ReviewState,
  recogniseFile,
  seedReview,
} from './recognition'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Recognised upload kinds. Anything we can't map lands as `invalid` so the
 * user gets a clear "we don't accept this" affordance instead of a stalled
 * analyse spinner.
 */
export type FileKind = 'csv' | 'excel' | 'excel-template' | 'pdf' | 'invalid'

/** Kinds we actually store in state — invalid is rejected at the door. */
export type AcceptedFileKind = Exclude<FileKind, 'invalid'>

export type UploadedFile = {
  id: string
  name: string
  size: number
  kind: AcceptedFileKind
}

const extOf = (name: string) => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/**
 * Map a filename extension onto our recognised kinds.
 *
 * Excel files whose filename contains the word "template" are assumed to be
 * the macro-enabled Sandy import template. The real implementation would
 * read the workbook and check for a specific named range / macro signature
 * — for the prototype the name match is good enough.
 */
const inferKind = (name: string): FileKind => {
  const ext = extOf(name)
  const isExcel = ext === 'xls' || ext === 'xlsx' || ext === 'xlsm'
  if (isExcel && /template/i.test(name)) return 'excel-template'
  switch (ext) {
    case 'csv':
      return 'csv'
    case 'xls':
    case 'xlsx':
    case 'xlsm':
      return 'excel'
    case 'pdf':
      return 'pdf'
    default:
      return 'invalid'
  }
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/* -------------------------------------------------------------------------- */
/* Random-file simulator                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tiny pool of plausible filenames used when the user clicks "Choose files"
 * — we mint a synthetic `File` for each and feed them through the same
 * `acceptFiles` path as real drops. Keeps the prototype demoable without
 * needing the user to hunt down real source data.
 */
const SIMULATOR_POOL: { name: string; sizeBytes: number }[] = [
  { name: 'spring-2026-cropping-plan.xlsx', sizeBytes: 184_320 },
  { name: 'heron-lea-field-list.csv', sizeBytes: 12_480 },
  { name: 'westhill-fertiliser-log.csv', sizeBytes: 22_100 },
  { name: 'sandy-import-template.xlsm', sizeBytes: 96_200 },
  { name: 'NRM-soil-results.pdf', sizeBytes: 1_280_400 },
  { name: 'farmkeeper-operations-export.csv', sizeBytes: 38_200 },
  { name: 'xfarm-yield-export.csv', sizeBytes: 41_800 },
  { name: 'agronomist-notes.pdf', sizeBytes: 412_006 },
  { name: 'glenford-livestock-april.xlsx', sizeBytes: 76_400 },
  { name: 'march-yield-summary.xlsx', sizeBytes: 88_700 },
]

const pickRandom = <T,>(arr: T[], count: number): T[] => {
  const pool = [...arr]
  const out: T[] = []
  const take = Math.min(count, pool.length)
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

/** Mint a synthetic File so the simulator can flow through `acceptFiles`. */
const makeSyntheticFile = ({
  name,
  sizeBytes,
}: {
  name: string
  sizeBytes: number
}): File => {
  // The bytes aren't ever read — we only inspect name + size — so a stub
  // payload is fine. Padding to the requested size would burn memory for
  // nothing.
  const blob = new Blob(['simulated-file-content'], { type: 'text/plain' })
  // Overlay the requested size onto the File so `formatSize` reads the
  // realistic value, even though the underlying Blob is tiny.
  const f = new File([blob], name)
  Object.defineProperty(f, 'size', { value: sizeBytes })
  return f
}

const simulateRandomFiles = (): File[] => {
  const count = 2 + Math.floor(Math.random() * 3) // 2–4 files
  return pickRandom(SIMULATOR_POOL, count).map(makeSyntheticFile)
}

/* -------------------------------------------------------------------------- */
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export type UploadSummary = {
  files: UploadedFile[]
  /** Files that finished scanning AND need user attention. */
  issueCount: number
  /** True once at least one file has finished scanning. */
  anyProcessed: boolean
  /** True when every file has finished scanning. */
  allProcessed: boolean
  /** True while a re-scan is running after the user changed a setting. */
  reprocessing: boolean
}

export type UploadStepProps = {
  /** Fired whenever the file list / scan state changes. */
  onSummaryChange?: (summary: UploadSummary) => void
  /**
   * Counter the wizard increments when the user hits Continue while there
   * are unresolved issues — we open the review modal at the first issue.
   */
  reviewRequestToken?: number
}

/** Per-file simulated processing window. Stagger so the cards don't all
 *  flip to recognised at the same instant. */
const PROCESS_BASE_MS = 900
const PROCESS_JITTER_MS = 1600

export const UploadStep = ({
  onSummaryChange,
  reviewRequestToken,
}: UploadStepProps = {}) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setDragging] = useState(false)
  // Per-file recognition output — keyed by file id. Built once per file the
  // moment it lands so the result is stable across re-renders.
  const [recognitions, setRecognitions] = useState<
    Record<string, RecognitionResult>
  >({})
  // Which files have finished the simulated scan.
  const [processed, setProcessed] = useState<Record<string, boolean>>({})
  // Editable per-file review (category, reviewed flag).
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({})
  // Open the review modal — either scoped to a single file (card click) or
  // to all files Sandy flagged (wizard "Review N issues" Continue).
  const [reviewScope, setReviewScope] = useState<
    { kind: 'single'; fileId: string } | { kind: 'issues' } | null
  >(null)
  // Snapshot of reviews when the modal opens — lets us decide whether to
  // re-scan on close.
  const reviewSnapshotRef = useRef<Record<string, ReviewState> | null>(null)
  // Set to true while a simulated re-scan is running.
  const [reprocessing, setReprocessing] = useState(false)

  // Track timers so unmount / delete / re-scan clears them.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )
  // Clear every timer when the component tears down so stray callbacks
  // can't fire setState on a dead component.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])

  const startProcessing = (file: UploadedFile, indexAtAdd: number) => {
    // Defensive: clear any orphan timer for this file first so we never
    // leave a dangling timeout that could late-write `processed[id] = true`
    // after a re-scan was kicked off.
    const existing = timersRef.current.get(file.id)
    if (existing) {
      clearTimeout(existing)
      timersRef.current.delete(file.id)
    }
    const recognition = recogniseFile(file, indexAtAdd)
    setRecognitions((prev) => ({ ...prev, [file.id]: recognition }))
    setReviews((prev) =>
      prev[file.id]
        ? prev // keep manual edits across re-scans
        : { ...prev, [file.id]: seedReview(recognition) },
    )
    // Make sure this file is in the loading state before the timer flips it
    // back to processed — otherwise a previous true value would shadow the
    // intended "loading" UI.
    setProcessed((prev) => {
      if (!(file.id in prev)) return prev
      const next = { ...prev }
      delete next[file.id]
      return next
    })
    const delay = PROCESS_BASE_MS + Math.random() * PROCESS_JITTER_MS
    const timer = setTimeout(() => {
      setProcessed((prev) => ({ ...prev, [file.id]: true }))
      timersRef.current.delete(file.id)
    }, delay)
    timersRef.current.set(file.id, timer)
  }

  const acceptFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const valid: UploadedFile[] = []
    for (const file of arr) {
      const kind = inferKind(file.name)
      if (kind === 'invalid') {
        toast.error(`${file.name} isn't a supported file type`, {
          description: 'Accepted formats: CSV, Excel, PDF.',
        })
        continue
      }
      valid.push({
        id: newId(),
        name: file.name,
        size: file.size,
        kind,
      })
    }
    if (valid.length === 0) return
    // IMPORTANT: keep side-effects (setTimeout / state setters with timers)
    // OUT of the state-setter callback. React StrictMode will invoke the
    // updater twice in dev, double-scheduling timers and leaving orphans
    // that can prevent `processed[id]` from ever flipping true.
    setFiles((curr) => [...valid, ...curr])
    valid.forEach((f, i) => {
      startProcessing(f, i)
    })
  }

  const deleteFile = (id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setFiles((curr) => curr.filter((f) => f.id !== id))
    setRecognitions((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
    setProcessed((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
    setReviews((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }

  /**
   * Re-scan only the files whose review settings actually changed. Each
   * affected file flips back to loading, then resolves as `done` (the user's
   * edits are treated as "we now know how to read it"). Reviews survive.
   */
  const reprocessFiles = (ids: string[]) => {
    if (ids.length === 0) return
    // Clear any in-flight timers BEFORE touching state — never put side
    // effects inside a setState updater, because StrictMode invokes it twice
    // and the second invocation would also `clearTimeout` the NEW timer we
    // schedule below, leaving the file stuck in the loading state forever.
    for (const id of ids) {
      const existing = timersRef.current.get(id)
      if (existing) {
        clearTimeout(existing)
        timersRef.current.delete(id)
      }
    }
    // Drop the affected files' processed-flags FIRST so the "all processed"
    // gate can't briefly evaluate true between setReprocessing and
    // setProcessed and immediately clear reprocessing.
    setProcessed((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
    setReprocessing(true)
    // Promote each re-scanned file to a clean recognition so it leaves the
    // error / warning state once the user's edits land.
    setRecognitions((prev) => {
      const next = { ...prev }
      for (const id of ids) {
        const current = next[id]
        if (!current) continue
        next[id] = {
          ...current,
          kind: 'custom-template',
          errorMessage: undefined,
          errorVariant: undefined,
        }
      }
      return next
    })
    for (const id of ids) {
      const delay = PROCESS_BASE_MS + Math.random() * PROCESS_JITTER_MS
      const timer = setTimeout(() => {
        setProcessed((prev) => ({ ...prev, [id]: true }))
        timersRef.current.delete(id)
      }, delay)
      timersRef.current.set(id, timer)
    }
  }

  const hasFiles = files.length > 0
  const allProcessed = hasFiles && files.every((f) => processed[f.id])
  const issueCount = files.filter((f) => isFileIssue(recognitions[f.id])).length

  // Bubble up summary so the wizard can label / gate Continue.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable callback
  useEffect(() => {
    onSummaryChange?.({
      files,
      issueCount,
      anyProcessed: files.some((f) => processed[f.id]),
      allProcessed,
      reprocessing,
    })
  }, [files, issueCount, processed, allProcessed, reprocessing])

  // Once every file has finished the post-edit re-scan, drop the
  // "reprocessing" flag so the wizard unblocks Continue.
  useEffect(() => {
    if (reprocessing && allProcessed) setReprocessing(false)
  }, [reprocessing, allProcessed])

  // When the wizard wants us to open the review modal (because Continue
  // was clicked while issues remain), filter the carousel to those issues.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire only when the token changes
  useEffect(() => {
    if (reviewRequestToken === undefined || reviewRequestToken === 0) return
    setReviewScope({ kind: 'issues' })
    reviewSnapshotRef.current = reviews
  }, [reviewRequestToken])

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setDragging(true)
  }
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) acceptFiles(e.dataTransfer.files)
  }

  const modalOpen = reviewScope !== null
  const handleReviewClose = () => {
    setReviewScope(null)
    // Re-scan only the files whose review actually changed.
    const before = reviewSnapshotRef.current
    reviewSnapshotRef.current = null
    if (before) {
      const changed = changedFileIds(before, reviews)
      if (changed.length > 0) reprocessFiles(changed)
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: page-level drop target
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={clsx(
        'relative mx-auto flex w-full max-w-[720px] flex-1 min-h-0 flex-col',
        'transition-colors',
        isDragging && 'rounded-xl bg-support-bg-green/50',
      )}
    >
      {hasFiles ? (
        <div className="flex flex-col gap-10 py-10 animate-fade-up">
          <CompactHeader
            onBrowseClick={() => acceptFiles(simulateRandomFiles())}
          />

          <ul className="flex flex-col gap-3">
            {files.map((file) => {
              const recognition = recognitions[file.id]
              const isLoading = !processed[file.id]
              return (
                <li key={file.id} className="animate-fade-up">
                  <FileRecognitionRow
                    file={file}
                    loading={isLoading}
                    recognition={isLoading ? undefined : recognition}
                    categories={reviews[file.id]?.categories}
                    onClick={
                      isLoading
                        ? undefined
                        : () => {
                            reviewSnapshotRef.current = reviews
                            setReviewScope({ kind: 'single', fileId: file.id })
                          }
                    }
                    // Remove is available across every state — users can
                    // back out of a loading file or drop a finished one.
                    onRemove={() => deleteFile(file.id)}
                  />
                </li>
              )
            })}
          </ul>

          {allProcessed && !reprocessing ? <ConfirmationPanel /> : null}
        </div>
      ) : (
        <EmptyHero onBrowseClick={() => acceptFiles(simulateRandomFiles())} />
      )}

      <FileReviewModal
        open={modalOpen}
        onOpenChange={(o) => {
          if (!o) handleReviewClose()
        }}
        files={files}
        recognitions={recognitions}
        reviews={reviews}
        onChange={(id, next) => setReviews((curr) => ({ ...curr, [id]: next }))}
        scope={reviewScope ?? undefined}
      />

      <CompletionToast
        visible={reprocessing}
        label={(() => {
          const n = files.filter((f) => !processed[f.id]).length
          return `Processing ${n} ${n === 1 ? 'file' : 'files'} again with your changes…`
        })()}
        icon={<ToastSpinner />}
      />
    </div>
  )
}

/** Small inline spinner that matches the toast's text colour. */
const ToastSpinner = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className="animate-spin"
  >
    <title>Processing</title>
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="3"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
)

/**
 * Cheap deep-equality on the bits of ReviewState that influence Sandy's
 * extraction rules. If any of these change while the modal is open, we
 * trigger a re-scan on close to keep the demo's flow honest.
 */
const changedFileIds = (
  before: Record<string, ReviewState>,
  after: Record<string, ReviewState>,
): string[] => {
  const out: string[] = []
  for (const id of Object.keys(after)) {
    const a = before[id]
    const b = after[id]
    if (!a) {
      out.push(id)
      continue
    }
    if (
      a.matchedTemplateId !== b.matchedTemplateId ||
      !!a.createNewTemplate !== !!b.createNewTemplate ||
      (a.newTemplateName ?? '') !== (b.newTemplateName ?? '') ||
      (a.description ?? '') !== (b.description ?? '') ||
      a.categories.join('|') !== b.categories.join('|')
    ) {
      out.push(id)
    }
  }
  return out
}

/**
 * Once every file is scanned we surface a quiet, non-blocking panel that
 * names the "Does this look right?" question. The wizard's own Continue
 * button (in the top bar) advances the user out of this step — we don't
 * need a second one here.
 */
const ConfirmationPanel = () => (
  <div className="flex flex-col gap-1 rounded-xl border-2 border-border-tertiary bg-bg-secondary px-5 py-4 animate-fade-up">
    <p className="text-lg font-medium text-text-primary">
      Does this look right?
    </p>
    <p className="text-md text-text-secondary">
      Tap any file to review or correct its details, then hit Continue to move
      on.
    </p>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Hero (no files yet) — centred, large title, secondary CTA with file+ icon  */
/* -------------------------------------------------------------------------- */

const IconFilePlus = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <title>Add file</title>
    <path
      d="M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M13 3v5h5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M11.5 12.5v5M9 15h5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const EmptyHero = ({ onBrowseClick }: { onBrowseClick: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-12 py-16 text-center animate-fade-up">
    <h1 className="max-w-[560px] text-5xl font-medium leading-[1.05] tracking-tight text-text-primary">
      Drop files to get started
    </h1>
    <div className="flex flex-col items-center gap-3">
      <Button
        variant="secondary"
        onClick={onBrowseClick}
        leadingIcon={<IconFilePlus size={20} />}
      >
        Add files
      </Button>
      <p className="text-sm text-text-secondary">
        We can import Excel, CSV Spreadsheet, PDF.
      </p>
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* Compact header (files present) — title + Add more, then list below          */
/* -------------------------------------------------------------------------- */

const CompactHeader = ({ onBrowseClick }: { onBrowseClick: () => void }) => (
  <div className="flex items-center justify-between gap-4">
    <h1 className="text-3xl font-medium leading-tight text-text-primary">
      Your files
    </h1>
    <Button
      variant="secondary"
      onClick={onBrowseClick}
      leadingIcon={<IconFilePlus size={18} />}
    >
      Add more
    </Button>
  </div>
)
