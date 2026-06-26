import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, MultiSelect } from '../../components/ui'
import type { AcceptedFileKind, UploadedFile } from './UploadStep'

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

export type DataCategory = 'operational' | 'cropping' | 'soil-sampling'

const CATEGORY_OPTIONS: { value: DataCategory; label: string }[] = [
  { value: 'operational', label: 'Operational' },
  { value: 'cropping', label: 'Cropping' },
  { value: 'soil-sampling', label: 'Soil sampling' },
]

/**
 * Guess a sensible default set of categories for a file. A file can cover
 * more than one type (e.g. cropping + operations exports) so this returns
 * an array. Falls back to Operational when no keywords match.
 */
const defaultCategoriesFor = (name: string): DataCategory[] => {
  const lower = name.toLowerCase()
  const out: DataCategory[] = []
  if (/(soil|nrm|sample|ph\b)/.test(lower)) out.push('soil-sampling')
  if (/(crop|sow|sowing|harvest|yield|variety|cropping)/.test(lower))
    out.push('cropping')
  if (out.length === 0) out.push('operational')
  return out
}

/** Human label for the underlying source-file type. CSV and Excel collapse
 *  into "Spreadsheet" — the distinction isn't useful for the user here. */
const FILE_KIND_LABEL: Record<AcceptedFileKind, string> = {
  csv: 'Spreadsheet',
  excel: 'Spreadsheet',
  'excel-template': 'Sandy Template',
  pdf: 'PDF document',
}

/* -------------------------------------------------------------------------- */
/* File-icon glyph                                                             */
/* -------------------------------------------------------------------------- */

const FileGlyph = () => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative — filename next to it owns the label
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
    className="shrink-0 text-icon-secondary"
  >
    <path
      d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 2.41L17.59 9H15a1 1 0 0 1-1-1V5.41Z"
      fill="currentColor"
    />
  </svg>
)

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

export type CategoriseFilesModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: UploadedFile[]
  /** Fired when the user confirms — receives the file-id → categories map. */
  onConfirm: (categories: Record<string, DataCategory[]>) => void
}

export const CategoriseFilesModal = ({
  open,
  onOpenChange,
  files,
  onConfirm,
}: CategoriseFilesModalProps) => {
  // Seed the category map from filename heuristics every time the modal opens
  // with a new set of files. We key on file id so the dropdown state survives
  // re-renders within a single modal session.
  const seed = useMemo(() => {
    const out: Record<string, DataCategory[]> = {}
    for (const f of files) out[f.id] = defaultCategoriesFor(f.name)
    return out
  }, [files])

  const [categories, setCategories] =
    useState<Record<string, DataCategory[]>>(seed)

  // Re-seed whenever the file list itself changes (open → close → reopen
  // with different files). Without this the dropdown would keep the stale
  // selection from the previous session.
  useEffect(() => {
    setCategories(seed)
  }, [seed])

  const setCategory = (id: string, next: DataCategory[]) => {
    setCategories((curr) => ({ ...curr, [id]: next }))
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Help us understand your files"
      description="We've looked at your files and have categorised them by data type. Please review and confirm."
      maxWidth="880px"
      footer={
        <Button variant="primary" onClick={() => onConfirm(categories)}>
          Confirm
        </Button>
      }
    >
      <ul className="flex flex-col gap-3">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-4 rounded-lg border-2 border-border-tertiary px-4 py-3"
          >
            <div className="flex min-w-0 basis-1/2 items-center gap-3">
              <FileGlyph />
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-md font-semibold text-text-primary">
                  {file.name}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {FILE_KIND_LABEL[file.kind]}
                </p>
              </div>
            </div>
            <div className="min-w-0 basis-1/2">
              <MultiSelect<DataCategory>
                aria-label={`Type of data for ${file.name}`}
                value={categories[file.id] ?? []}
                onValueChange={(next) => setCategory(file.id, next)}
                items={CATEGORY_OPTIONS}
                variant="pills"
                placeholder="Select types…"
              />
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
