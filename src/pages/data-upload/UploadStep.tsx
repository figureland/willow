import clsx from 'clsx'
import { type DragEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, IconClose } from '../../components/ui'

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
  // at least one file has been added.
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable callback
  useEffect(() => {
    onFilesChange?.(files)
  }, [files])

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
    setFiles((curr) => [...valid, ...curr])
  }

  const deleteFile = (id: string) => {
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
        <div className="flex flex-col gap-10 py-10">
          <CompactHeader
            onBrowseClick={() => acceptFiles(simulateRandomFiles())}
          />
          <FileList files={files} onDelete={deleteFile} />
        </div>
      ) : (
        <EmptyHero onBrowseClick={() => acceptFiles(simulateRandomFiles())} />
      )}
    </div>
  )
}

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
  <div className="flex flex-1 flex-col items-center justify-center gap-12 py-16 text-center">
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

/* -------------------------------------------------------------------------- */
/* File list — light-grey boxes, one per uploaded file                         */
/* -------------------------------------------------------------------------- */

type FileListProps = {
  files: UploadedFile[]
  onDelete: (id: string) => void
}

const FileList = ({ files, onDelete }: FileListProps) => (
  <ul className="flex flex-col gap-2">
    {files.map((file) => (
      <FileRow key={file.id} file={file} onDelete={onDelete} />
    ))}
  </ul>
)

type FileRowProps = {
  file: UploadedFile
  onDelete: (id: string) => void
}

const FileRow = ({ file, onDelete }: FileRowProps) => (
  <li className="flex items-center gap-4 rounded-lg bg-bg-secondary px-4 py-3">
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-bg-tertiary text-icon-primary">
      <IconDocument size={20} />
    </span>
    <div className="flex flex-1 min-w-0">
      <p className="truncate text-md font-medium text-text-primary">
        {file.name}
      </p>
    </div>
    <button
      type="button"
      onClick={() => onDelete(file.id)}
      aria-label={`Remove ${file.name}`}
      className={clsx(
        'grid size-8 shrink-0 place-items-center rounded-md',
        'text-icon-secondary transition-colors',
        'hover:bg-bg-tertiary hover:text-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      )}
    >
      <IconClose size={16} />
    </button>
  </li>
)
