import clsx from 'clsx'
import { Button, IconClose } from '../../components/ui'
import {
  CATEGORY_LABEL,
  type DataCategoryTag,
  type RecognitionResult,
} from './recognition'
import type { UploadedFile } from './UploadStep'

/* -------------------------------------------------------------------------- */
/* Thumbnail — outline pulses while loading, glyph fades in once resolved      */
/* -------------------------------------------------------------------------- */

/**
 * Single non-success state — every recognition failure (unrecognised template,
 * Sandy parse error, etc.) lands in the same amber "warning" treatment. The
 * row body always carries a sentence explaining what's wrong, so we don't
 * need a louder red state on top.
 */
export type ThumbState = 'loading' | 'done' | 'warning'

export const FileThumb = ({
  kind,
  state = 'done',
}: {
  kind: UploadedFile['kind']
  state?: ThumbState
}) => {
  const label =
    kind === 'pdf' ? 'PDF' : kind === 'excel-template' ? 'XLSM' : 'XLSX'
  return (
    <div className="relative h-28 w-20 shrink-0">
      <div className="absolute inset-0 flex flex-col overflow-hidden rounded-md border-2 border-border-tertiary bg-bg-primary shadow-sm">
        <div
          className={clsx('flex-1 px-2 pt-2', state !== 'done' && 'opacity-60')}
        >
          <div className="h-1 w-3/4 rounded-pill bg-bg-tertiary" />
          <div className="mt-1 h-1 w-full rounded-pill bg-bg-tertiary" />
          <div className="mt-1 h-1 w-5/6 rounded-pill bg-bg-tertiary" />
          <div className="mt-1 h-1 w-2/3 rounded-pill bg-bg-tertiary" />
          <div className="mt-1 h-1 w-full rounded-pill bg-bg-tertiary" />
          <div className="mt-1 h-1 w-1/2 rounded-pill bg-bg-tertiary" />
        </div>
        <div className="flex h-5 items-center justify-center bg-bg-tertiary text-[10px] font-semibold tracking-wider text-text-secondary">
          {label}
        </div>
      </div>
      <ThumbStatusOutline state={state} />
      {state !== 'loading' ? <ThumbStatusGlyph state={state} /> : null}
    </div>
  )
}

const ThumbStatusOutline = ({ state }: { state: ThumbState }) => {
  if (state === 'done') return null
  const stroke =
    state === 'loading'
      ? 'stroke-text-brand-dark'
      : 'stroke-support-fg-amber'
  const dasharray = state === 'loading' ? '20 60' : undefined
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 80 112"
      fill="none"
    >
      <title>{state}</title>
      <rect
        x="1"
        y="1"
        width="78"
        height="110"
        rx="6"
        ry="6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={dasharray}
        className={clsx(stroke, state === 'loading' && 'animate-thumb-outline')}
      />
    </svg>
  )
}

const ThumbStatusGlyph = ({
  state,
}: {
  state: Exclude<ThumbState, 'loading'>
}) => {
  const tone =
    state === 'done'
      ? 'bg-support-fg-green text-text-primary-inverse'
      : 'bg-support-fg-amber text-text-primary-inverse'
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      <span
        className={clsx(
          'grid size-9 origin-center place-items-center rounded-full shadow-md animate-thumb-tick',
          tone,
        )}
      >
        {state === 'done' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <title>Done</title>
            <path
              d="M5 12l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <title>Warning</title>
            <path
              d="M12 7v6M12 17h.01"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Row helpers — state → tint, recognition → state                             */
/* -------------------------------------------------------------------------- */

export const thumbStateFor = (
  recognition: RecognitionResult | undefined,
  loading: boolean,
): ThumbState => {
  if (loading) return 'loading'
  if (!recognition) return 'done'
  // Every recognition failure — hard errors, unrecognised templates, missing
  // tabs, etc. — folds into the single amber "warning" state. The row body
  // carries a sentence explaining what's wrong.
  if (recognition.kind === 'error' || recognition.kind === 'unrecognised') {
    return 'warning'
  }
  return 'done'
}

export const rowToneClasses = (state: ThumbState): string => {
  switch (state) {
    case 'loading':
      return 'border-border-tertiary bg-bg-secondary'
    case 'warning':
      // Background-only — no outline. Keeps the row visually softer than
      // the old red/outlined error state while still flagging attention.
      return 'border-transparent bg-support-bg-amber hover:bg-support-bg-amber/80'
    default:
      return 'border-border-tertiary bg-bg-primary hover:border-border-secondary hover:bg-bg-secondary'
  }
}

/* -------------------------------------------------------------------------- */
/* Card row — same component across loading / recognised / review states      */
/* -------------------------------------------------------------------------- */

export type FileRecognitionRowProps = {
  file: UploadedFile
  /** Recognition result — omitted while loading. */
  recognition?: RecognitionResult
  /** User-overridden categories — falls back to the detected single. */
  categories?: DataCategoryTag[]
  loading?: boolean
  /** When provided, the row becomes a button (e.g. opens the review modal). */
  onClick?: () => void
  /** When provided, render an X to remove the file (only useful pre-scan). */
  onRemove?: () => void
}

export const FileRecognitionRow = ({
  file,
  recognition,
  categories,
  loading = false,
  onClick,
  onRemove,
}: FileRecognitionRowProps) => {
  const cats =
    categories && categories.length > 0
      ? categories
      : recognition?.detectedCategory
        ? [recognition.detectedCategory]
        : []
  const state = thumbStateFor(recognition, loading)
  const content = (
    <>
      <FileThumb kind={file.kind} state={state} />
      <div className="flex flex-1 flex-col min-w-0 gap-1">
        <p className="truncate text-lg font-medium text-text-primary">
          {file.name}
        </p>
        {loading ? (
          <p className="text-md text-text-secondary">Uploading and scanning…</p>
        ) : recognition ? (
          <>
            <p className="text-md text-text-secondary">
              {recognition.templateLabel}
              {recognition.templateNote ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{recognition.templateNote}</span>
                </>
              ) : null}
            </p>
            {/* Skip the category line when there's no detected category
                — the empty "No category detected" line just adds noise. */}
            {cats.length > 0 ? (
              <p className="text-sm text-text-secondary">
                {cats.map((c) => CATEGORY_LABEL[c]).join(' · ')}
              </p>
            ) : null}
            {/* Every warning state surfaces the same single info line so
                the user knows the file needs their attention. The row is
                already clickable; the copy nudges them to open it. */}
            {state === 'warning' ? (
              <p className="text-sm font-medium text-support-fg-amber">
                We didn't recognise this file. Click here to help Sandy
                understand and import your data.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {!loading && onClick ? (
        <Button
          variant="secondary"
          size="sm"
          // Same handler as the row's onClick — clicking either pushes the
          // user into review. Stop the row click from firing twice.
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          Edit
        </Button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
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
      ) : null}
    </>
  )

  const tone = rowToneClasses(state)
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left',
          'transition-[box-shadow,transform,background-color,border-color] duration-150',
          'shadow-none hover:shadow-md hover:-translate-y-px',
          tone,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
        )}
      >
        {content}
      </button>
    )
  }
  return (
    <div
      className={clsx(
        'flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3',
        tone,
      )}
    >
      {content}
    </div>
  )
}
