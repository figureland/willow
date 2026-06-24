import { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Select } from '../../components/ui'
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
 * Guess a sensible default category for a file. Falls back to Operational
 * when no keywords match — covers the long tail of FMS exports.
 */
const defaultCategoryFor = (name: string): DataCategory => {
  const lower = name.toLowerCase()
  if (/(soil|nrm|sample|ph\b)/.test(lower)) return 'soil-sampling'
  if (/(crop|sow|sowing|harvest|yield|variety|cropping)/.test(lower))
    return 'cropping'
  return 'operational'
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
  /** Fired when the user confirms — receives the file-id → category map. */
  onConfirm: (categories: Record<string, DataCategory>) => void
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
    const out: Record<string, DataCategory> = {}
    for (const f of files) out[f.id] = defaultCategoryFor(f.name)
    return out
  }, [files])

  const [categories, setCategories] =
    useState<Record<string, DataCategory>>(seed)

  // Re-seed whenever the file list itself changes (open → close → reopen
  // with different files). Without this the dropdown would keep the stale
  // selection from the previous session.
  useEffect(() => {
    setCategories(seed)
  }, [seed])

  const setCategory = (id: string, next: DataCategory) => {
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
      <div className="flex flex-col gap-2">
        {/* Column headers — widths mirror the rows below. */}
        <div className="flex items-center gap-4 px-4">
          <div className="flex-1 min-w-0 text-sm font-semibold text-text-secondary">
            File
          </div>
          <div className="w-[180px] shrink-0 text-sm font-semibold text-text-secondary">
            File type
          </div>
          <div className="w-[200px] shrink-0 text-sm font-semibold text-text-secondary">
            Type of data
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-4 rounded-lg border-2 border-border-tertiary px-4 py-3"
            >
              <div className="flex flex-1 min-w-0 items-center gap-3">
                <FileGlyph />
                <p className="text-md font-semibold text-text-primary truncate">
                  {file.name}
                </p>
              </div>
              <div className="w-[180px] shrink-0 text-md text-text-secondary">
                {FILE_KIND_LABEL[file.kind]}
              </div>
              <div className="w-[200px] shrink-0">
                <Select<DataCategory>
                  aria-label={`Type of data for ${file.name}`}
                  value={categories[file.id] ?? 'operational'}
                  onValueChange={(next) => next && setCategory(file.id, next)}
                  items={CATEGORY_OPTIONS}
                  clearable={false}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
