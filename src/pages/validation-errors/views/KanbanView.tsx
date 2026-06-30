import clsx from 'clsx'
import type { ComponentType } from 'react'
import {
  IconFix,
  IconInformation,
  type IconProps,
  IconRecommendation,
  IconValidation,
} from '../../../components/ui/icons'
import { UPLOAD_STEPS, type UploadStep } from '../../../validations/steps'
import {
  areaOf,
  DATA_CATEGORY_LABEL,
  UX_ITEM_KIND_LABEL,
  type UXItemKind,
  VALIDATION_ERRORS,
  type ValidationError,
} from '../validation-errors'

/* Kind → leading icon on each card. Differentiation comes from the glyph
 * itself; colour stays neutral so the row reads as plain content. */
const KIND_VISUAL: Record<UXItemKind, { Icon: ComponentType<IconProps> }> = {
  validation: { Icon: IconValidation },
  fix: { Icon: IconFix },
  recommendation: { Icon: IconRecommendation },
  information: { Icon: IconInformation },
}

/* -------------------------------------------------------------------------- */
/* KanbanView — one column per step, validation cards stacked inside           */
/* -------------------------------------------------------------------------- */

const validationsForStep = (step: UploadStep): ValidationError[] => {
  if (step.areas.length === 0) return []
  const areaSet = new Set(step.areas)
  return VALIDATION_ERRORS.filter((e) => areaSet.has(areaOf(e)))
}

const ValidationCard = ({
  error,
  active,
  onSelect,
}: {
  error: ValidationError
  active: boolean
  onSelect: () => void
}) => {
  const { Icon } = KIND_VISUAL[error.uxKind]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      data-kanban-card
      className={clsx(
        'flex w-full items-start gap-2.5 rounded-lg border-2 px-3 py-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
        active
          ? 'border-border-primary bg-bg-tertiary'
          : 'border-border-tertiary bg-bg-secondary hover:border-border-secondary hover:bg-bg-tertiary',
      )}
    >
      <span className="mt-0.5 inline-flex shrink-0 items-center justify-center text-text-primary">
        <Icon size={18} title={UX_ITEM_KIND_LABEL[error.uxKind]} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium leading-snug text-text-primary">
          {error.title}
        </span>
        {error.dataCategories && error.dataCategories.length > 0 ? (
          <span className="text-xs text-text-secondary">
            {error.dataCategories.map((c) => DATA_CATEGORY_LABEL[c]).join(', ')}
          </span>
        ) : null}
      </div>
    </button>
  )
}

const KanbanColumn = ({
  step,
  validations,
  activeCode,
  onSelect,
}: {
  step: UploadStep
  validations: ValidationError[]
  activeCode: string | null
  onSelect: (code: string) => void
}) => (
  <section className="flex w-[300px] shrink-0 flex-col gap-3 rounded-xl border-2 border-border-tertiary bg-bg-primary p-3 shadow-sm">
    <header className="flex items-start gap-2 px-1 py-1">
      <span className="inline-flex shrink-0 items-center justify-center rounded-pill bg-bg-brand-primary px-2 py-0.5 text-xs font-semibold tracking-[0.15px] text-text-primary-inverse">
        Step {step.number}
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <h3 className="text-md font-semibold text-text-primary">
          {step.label}
        </h3>
      </div>
    </header>

    <ol className="flex flex-col gap-2 overflow-y-auto pr-1">
      {validations.length === 0 ? (
        <li className="rounded-md border border-dashed border-border-tertiary px-3 py-4 text-xs text-text-secondary">
          {step.description}
        </li>
      ) : (
        validations.map((v) => (
          <li key={v.code}>
            <ValidationCard
              error={v}
              active={v.code === activeCode}
              onSelect={() => onSelect(v.code)}
            />
          </li>
        ))
      )}
    </ol>
  </section>
)

export type KanbanViewProps = {
  activeCode: string | null
  onSelect: (code: string) => void
}

export const KanbanView = ({ activeCode, onSelect }: KanbanViewProps) => (
  <div className="flex flex-1 min-h-0 overflow-x-auto overflow-y-hidden bg-bg-secondary px-8 py-6">
    <div className="flex h-full items-stretch gap-4">
      {UPLOAD_STEPS.map((step) => (
        <KanbanColumn
          key={step.id}
          step={step}
          validations={validationsForStep(step)}
          activeCode={activeCode}
          onSelect={onSelect}
        />
      ))}
    </div>
  </div>
)
