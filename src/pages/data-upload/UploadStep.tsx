import clsx from 'clsx'
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react'
import { toast } from 'sonner'
import { IconPlus, Spinner } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Recognised upload kinds. Anything we can't map lands as `invalid` so the
 * user gets a clear "we don't accept this" affordance instead of a stalled
 * analyse spinner.
 */
export type FileKind =
  | 'csv'
  | 'excel'
  | 'excel-template'
  | 'pdf'
  | 'gatekeeper'
  | 'invalid'

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

const ANALYSE_DURATION_MS = 1800

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
    case 'json':
      return 'gatekeeper'
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
    case 'gatekeeper':
      return 'Gatekeeper export'
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
/* Step component                                                              */
/* -------------------------------------------------------------------------- */

export const UploadStep = () => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Track timers so unmount / delete clears them and we don't flip a removed
  // file's status after the fact.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  const startAnalysis = (id: string) => {
    const timer = setTimeout(() => {
      setFiles((curr) =>
        curr.map((f) => (f.id === id ? { ...f, status: 'ready' } : f)),
      )
      timersRef.current.delete(id)
    }, ANALYSE_DURATION_MS)
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
          description: 'Accepted formats: CSV, Excel, PDF, Gatekeeper export.',
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

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) acceptFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
      <DropZone
        isDragging={isDragging}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onBrowseClick={() => inputRef.current?.click()}
      />

      <div className="flex flex-col justify-center gap-6">
        <TemplatePanel farmCount={3} fieldCount={32} />
        <FileList files={files} onDelete={deleteFile} />
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        aria-label="Choose files to upload"
        onChange={onPickFiles}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Template panel                                                              */
/* -------------------------------------------------------------------------- */

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

const TemplatePanel = ({
  farmCount,
  fieldCount,
}: {
  farmCount: number
  fieldCount: number
}) => (
  <div className="flex flex-col gap-3 rounded-xl border-2 border-border-tertiary bg-bg-primary p-5">
    <div className="flex flex-col gap-1">
      <p className="text-2xl font-semibold leading-9 text-text-primary">
        Use template
      </p>
      <p className="text-md text-text-secondary">
        Download a custom Excel template tailored for your organisation (
        {farmCount} farms and {fieldCount} fields).
      </p>
    </div>
    <a
      href="/api/template.xlsx"
      download
      className={clsx(
        'inline-flex w-fit items-center gap-2 rounded-md',
        'bg-bg-primary border-2 border-border-secondary text-text-primary',
        'px-4 py-2 text-md font-semibold tracking-[0.15px]',
        'hover:border-border-secondary-hover hover:bg-bg-secondary transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      )}
    >
      <IconDownload />
      <span className="pt-[2px]">Download template</span>
    </a>
  </div>
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
}

const DropZone = ({
  isDragging,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
}: DropZoneProps) => (
  // biome-ignore lint/a11y/noStaticElementInteractions: a div is the only valid drop target here — using <button> would conflict with the nested "Choose files" button below
  <div
    onDragEnter={onDragEnter}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    className={clsx(
      'relative flex flex-col items-center justify-center gap-6 text-center',
      'p-12 min-h-[420px] transition-colors',
      isDragging ? 'text-text-brand-dark' : 'text-text-primary',
    )}
  >
    <div className="flex flex-col items-center gap-2">
      <p className="text-2xl font-semibold leading-9">
        Drop files here to get started
      </p>
      <p className="text-md text-text-secondary">
        CSV · Excel · PDF · Gatekeeper export — drag from your desktop, or
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
    <ul className="flex flex-col gap-2 border-l-2 border-border-tertiary pl-6">
      {files.map((file) => (
        <FileRow key={file.id} file={file} onDelete={onDelete} />
      ))}
    </ul>
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
