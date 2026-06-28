import clsx from 'clsx'
import { Badge } from '../../../components/ui'
import { UPLOAD_STEPS, type UploadStep } from '../../../validations/steps'
import {
  areaOf,
  DATA_CATEGORY_LABEL,
  VALIDATION_AREA_LABEL,
  VALIDATION_ERRORS,
  type ValidationError,
} from '../validation-errors'

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
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={active ? 'true' : undefined}
    className={clsx(
      'flex w-full flex-col items-start gap-2 rounded-lg border-2 px-3 py-3 text-left transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      active
        ? 'border-border-primary bg-bg-tertiary'
        : 'border-border-tertiary bg-bg-primary hover:border-border-secondary hover:bg-bg-secondary',
    )}
  >
    <div className="flex w-full items-center justify-between gap-2">
      <Badge tone={error.severity === 'blocking' ? 'red' : 'orange'} size="sm">
        {error.severity === 'blocking' ? 'Blocking' : 'Warning'}
      </Badge>
      {error.dataCategories && error.dataCategories.length > 0 ? (
        <span className="text-xs text-text-secondary">
          {error.dataCategories.map((c) => DATA_CATEGORY_LABEL[c]).join(', ')}
        </span>
      ) : null}
    </div>
    <span className="text-sm font-medium leading-snug text-text-primary">
      {error.title}
    </span>
    <code className="font-mono text-xs text-text-secondary">{error.code}</code>
  </button>
)

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
  <section className="flex w-[300px] shrink-0 flex-col gap-3 rounded-xl bg-bg-secondary p-3">
    <header className="flex items-start gap-2 px-1 py-1">
      <span className="inline-flex shrink-0 items-center justify-center rounded-pill bg-bg-brand-primary px-2 py-0.5 text-xs font-semibold tracking-[0.15px] text-text-primary-inverse">
        Step {step.number}
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <h3 className="text-md font-semibold text-text-primary">
          {step.label}
        </h3>
        {step.areas.length > 0 ? (
          <p className="text-xs text-text-secondary">
            {step.areas.map((a) => VALIDATION_AREA_LABEL[a]).join(' · ')} ·{' '}
            {validations.length}
          </p>
        ) : (
          <p className="text-xs text-text-secondary">
            No catalogued validations
          </p>
        )}
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
