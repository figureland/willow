import clsx from 'clsx'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button, IconPlus, Spinner } from '../../components/ui'

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
  /**
   * Lifecycle:
   *   - `analysing` — file just landed, mock backend "analyse" running
   *   - `ready`     — analysis finished, file ready for the next step
   */
  status: 'analysing' | 'ready'
}

/** Base analyse time before per-file jitter is layered on top. */
const ANALYSE_BASE_MS = 900
/** Max additional random delay per file — stagger so ready states don't all
 *  flip at the same instant, which makes the UI feel mechanical. */
const ANALYSE_JITTER_MS = 2400

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

/** Human-friendly label rendered in the file list row. */
const labelForKind = (kind: FileKind): string => {
  switch (kind) {
    case 'csv':
      return 'Spreadsheet'
    case 'excel':
      return 'Excel spreadsheet'
    case 'excel-template':
      return 'Sandy import template'
    case 'pdf':
      return 'Document'
    case 'invalid':
      return 'Invalid file type'
  }
}

/** 1.2 MB / 740 KB / 312 B — short and bold for the file list. */
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/* -------------------------------------------------------------------------- */
/* Signage-style icons                                                         */
/* -------------------------------------------------------------------------- */

const SignageIcon = ({
  size = 96,
  className,
  children,
  title,
}: {
  size?: number
  className?: string
  children: React.ReactNode
  title?: string
}) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — parent button / heading owns the label
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    focusable="false"
    className={className}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
)

/** Generic chunky document. Drives the upload mark and every file-row glyph. */
const IconDocument = ({
  size = 32,
  strokeWidth = 2,
}: {
  size?: number
  strokeWidth?: number
}) => (
  <SignageIcon size={size}>
    <path
      d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M14 3v4h4"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </SignageIcon>
)

/** Thick rubbish-bin glyph used for row deletion. */
const IconTrash = ({ size = 20 }: { size?: number }) => (
  <SignageIcon size={size}>
    <path
      d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SignageIcon>
)

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

export type UploadStepProps = {
  /** Fired whenever the file list changes — lets the wizard gate Continue. */
  onFilesChange?: (files: UploadedFile[]) => void
}

export const UploadStep = ({ onFilesChange }: UploadStepProps = {}) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setDragging] = useState(false)
  // Bubble up file changes so the wizard footer can disable Continue until
  // at least one file has been added and finished analysing. The callback
  // is stable from the wizard; we only need to react to local file state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable callback
  useEffect(() => {
    onFilesChange?.(files)
  }, [files])
  // Track timers so unmount / delete clears them and we don't flip a removed
  // file's status after the fact.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  const startAnalysis = (id: string) => {
    const delay = ANALYSE_BASE_MS + Math.random() * ANALYSE_JITTER_MS
    const timer = setTimeout(() => {
      setFiles((curr) =>
        curr.map((f) => (f.id === id ? { ...f, status: 'ready' } : f)),
      )
      timersRef.current.delete(id)
    }, delay)
    timersRef.current.set(id, timer)
  }

  const acceptFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const valid: UploadedFile[] = []
    for (const file of arr) {
      const kind = inferKind(file.name)
      // Invalid files never enter the list — surface them as a toast and
      // drop on the floor. Keeping them out of state means there's nothing
      // to delete and no red row to apologise for in the UI.
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
        status: 'analysing',
      })
    }
    if (valid.length === 0) return
    setFiles((curr) => [...valid, ...curr])
    for (const f of valid) startAnalysis(f.id)
  }

  const deleteFile = (id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setFiles((curr) => curr.filter((f) => f.id !== id))
  }

  const hasFiles = files.length > 0

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

  return (
    <div
      className={clsx(
        'grid flex-1 min-h-0 gap-6',
        // Animated track: when there are files, the right column expands from
        // 0fr → 1fr and the drop zone column flexes from 1fr → 2fr. CSS
        // transitions on grid-template-columns are widely supported and let
        // us avoid measuring widths in JS.
        'transition-[grid-template-columns] duration-300 ease-out',
        hasFiles ? 'grid-cols-[3fr_2fr]' : 'grid-cols-[1fr_0fr]',
      )}
    >
      <div className="flex min-w-0 flex-col">
        <DropZone
          isDragging={isDragging}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onBrowseClick={() => acceptFiles(simulateRandomFiles())}
          farmCount={3}
          fieldCount={32}
        />
      </div>

      {/* File-list column. Always mounted so the grid track can animate; the
          content fades + slides in once any file lands so it doesn't pop. */}
      <div
        className={clsx(
          'min-w-0 min-h-0 h-full overflow-hidden transition-[opacity,transform] duration-300 ease-out',
          hasFiles
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-2 pointer-events-none',
        )}
        aria-hidden={!hasFiles}
      >
        <FileList files={files} onDelete={deleteFile} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Template panel                                                              */
/* -------------------------------------------------------------------------- */

/** Minimal spreadsheet pictogram: outlined grid with one cell shaded. */
const IconSpreadsheet = ({ size = 24 }: { size?: number }) => (
  <SignageIcon size={size}>
    <rect
      x="3.5"
      y="4.5"
      width="17"
      height="15"
      rx="1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15M15 4.5v15"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="9"
      y="9.5"
      width="6"
      height="5"
      fill="currentColor"
      opacity="0.18"
    />
  </SignageIcon>
)

const IconDownload = ({ size = 20 }: { size?: number }) => (
  <SignageIcon size={size}>
    <path
      d="M12 4V15M12 15L7.5 10.5M12 15L16.5 10.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 19H20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </SignageIcon>
)

/* -------------------------------------------------------------------------- */
/* Drop zone                                                                   */
/* -------------------------------------------------------------------------- */

type DropZoneProps = {
  isDragging: boolean
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onBrowseClick: () => void
  farmCount: number
  fieldCount: number
}

const DropZone = ({
  isDragging,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
  farmCount,
  fieldCount,
}: DropZoneProps) => (
  // biome-ignore lint/a11y/noStaticElementInteractions: a div is the only valid drop target here — using <button> would conflict with the nested "Choose files" button below
  <div
    onDragEnter={onDragEnter}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    className={clsx(
      'relative flex flex-1 min-h-0 flex-col rounded-xl border-2 transition-colors',
      isDragging
        ? 'border-support-fg-green bg-support-bg-green text-text-brand-dark'
        : 'border-border-tertiary bg-bg-primary text-text-primary',
    )}
  >
    {/* Drop target — fills the card. */}
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="text-2xl font-semibold leading-9">
          Drop files here to get started
        </p>
        <p className="text-md text-text-secondary">
          CSV · Excel · PDF — drag from your desktop, or
        </p>
      </div>

      <button
        type="button"
        onClick={onBrowseClick}
        className={clsx(
          'inline-flex items-center gap-2 rounded-md',
          'bg-button-primary text-text-primary-inverse',
          'px-5 py-3 text-md font-semibold tracking-[0.15px]',
          'hover:bg-button-primary-hover active:bg-button-primary-active',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40 focus-visible:ring-offset-2',
        )}
      >
        <IconPlus size={20} />
        <span className="pt-[2px]">Choose files</span>
      </button>
    </div>

    {/* Template footer — sits inside the same card, separated by a hairline. */}
    <div className="flex items-center justify-between gap-4 border-t-2 border-border-tertiary px-6 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-md bg-support-bg-green text-text-primary"
        >
          <IconSpreadsheet size={24} />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="text-lg font-semibold text-text-primary">
            Need a template?
          </p>
          <p className="text-md text-text-secondary truncate">
            A custom Excel template for your {farmCount} farms and {fieldCount}{' '}
            fields.
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        leadingIcon={<IconDownload size={20} />}
        onClick={() => {
          // Mock download — the prototype has no real template endpoint.
          const a = document.createElement('a')
          a.href = '/api/template.xlsx'
          a.download = ''
          a.click()
        }}
      >
        Download
      </Button>
    </div>
  </div>
)

/* -------------------------------------------------------------------------- */
/* File list                                                                   */
/* -------------------------------------------------------------------------- */

type FileListProps = {
  files: UploadedFile[]
  onDelete: (id: string) => void
}

const FileList = ({ files, onDelete }: FileListProps) => {
  if (files.length === 0) return null
  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-xl border-2 border-border-tertiary bg-bg-primary p-2">
      <ul className="flex flex-col gap-1">
        {files.map((file) => (
          <FileRow key={file.id} file={file} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  )
}

type FileRowProps = {
  file: UploadedFile
  onDelete: (id: string) => void
}

const FileRow = ({ file, onDelete }: FileRowProps) => (
  <li className="flex items-center gap-4 px-6 py-4">
    <span className="grid size-12 shrink-0 place-items-center rounded-md bg-bg-tertiary text-icon-primary">
      <IconDocument />
    </span>
    <div className="flex flex-1 flex-col min-w-0 gap-1">
      <p className="truncate text-md font-semibold text-text-primary">
        {file.name}
      </p>
      <p className="text-sm text-text-secondary">
        <span className="font-semibold">{labelForKind(file.kind)}</span>
        <span aria-hidden="true"> · </span>
        <span className="tabular-nums">{formatSize(file.size)}</span>
      </p>
    </div>

    {file.status === 'analysing' ? (
      <span
        className="flex items-center gap-2 text-sm font-semibold text-text-secondary"
        aria-live="polite"
      >
        <Spinner size={16} />
        Analysing
      </span>
    ) : (
      <span className="flex items-center gap-2 text-sm font-semibold text-text-brand-dark">
        <ReadyDot />
        Ready
      </span>
    )}

    <button
      type="button"
      onClick={() => onDelete(file.id)}
      aria-label={`Remove ${file.name}`}
      className={clsx(
        'ml-2 grid size-9 shrink-0 place-items-center rounded-md',
        'text-icon-secondary transition-colors',
        'hover:bg-bg-secondary hover:text-text-danger',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      )}
    >
      <IconTrash />
    </button>
  </li>
)

const ReadyDot = () => (
  <span
    aria-hidden="true"
    className="inline-block size-2.5 rounded-pill bg-bg-brand-primary"
  />
)
