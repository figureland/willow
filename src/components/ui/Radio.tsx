import { Radio as BaseRadio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'
import clsx from 'clsx'
import { type ReactNode, type Ref, useId } from 'react'

/* -------------------------------------------------------------------------- */
/* RadioGroup                                                                  */
/* -------------------------------------------------------------------------- */

export type RadioGroupProps<Value = string> = {
  value?: Value
  defaultValue?: Value
  onValueChange?: (value: Value) => void
  disabled?: boolean
  required?: boolean
  name?: string
  label?: ReactNode
  description?: ReactNode
  /** Stack direction. Defaults to a vertical column. */
  orientation?: 'vertical' | 'horizontal'
  className?: string
  children: ReactNode
}

export const RadioGroup = <Value extends string = string>({
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  name,
  label,
  description,
  orientation = 'vertical',
  className,
  children,
}: RadioGroupProps<Value>) => {
  const generatedId = useId()
  const labelId = label ? `${generatedId}-label` : undefined
  const descriptionId = description ? `${generatedId}-description` : undefined

  return (
    <div
      className={clsx('flex flex-col gap-2', className)}
      {...(label ? { role: 'group', 'aria-labelledby': labelId } : null)}
    >
      {label ? (
        <span id={labelId} className="text-sm font-medium text-text-primary">
          {label}
        </span>
      ) : null}
      {description ? (
        <span id={descriptionId} className="text-sm text-text-secondary">
          {description}
        </span>
      ) : null}
      <BaseRadioGroup
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => onValueChange?.(next as Value)}
        disabled={disabled}
        required={required}
        name={name}
        aria-describedby={descriptionId}
        className={clsx(
          'flex',
          orientation === 'horizontal' ? 'flex-row gap-6' : 'flex-col gap-2',
        )}
      >
        {children}
      </BaseRadioGroup>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Radio                                                                       */
/* -------------------------------------------------------------------------- */

export type RadioProps = {
  value: string
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  invalid?: boolean
  id?: string
  className?: string
  ref?: Ref<HTMLButtonElement>
}

/**
 * A 16px circular target. Off = 1.6px secondary stroke. On = sandy-600 hollow
 * ring with a smaller filled brand dot in the centre. Disabled collapses
 * everything to the system's border-disabled grey. Matches Figma source 1:1.
 *
 * Must be rendered inside a `<RadioGroup>`.
 */
export const Radio = ({
  value,
  label,
  description,
  disabled,
  invalid,
  id,
  className,
  ref,
}: RadioProps) => {
  const generatedId = useId()
  const radioId = id ?? generatedId
  const descriptionId = description ? `${radioId}-description` : undefined

  const dot = (
    <BaseRadio.Root
      ref={ref}
      value={value}
      id={radioId}
      disabled={disabled}
      aria-describedby={descriptionId}
      aria-invalid={invalid || undefined}
      className={clsx(
        'shrink-0 size-4 rounded-full bg-bg-primary',
        'border-[1.6px] border-text-secondary',
        'grid place-items-center transition-colors outline-none',
        'hover:border-text-primary',
        'data-checked:border-sandy-600',
        'data-checked:hover:border-sandy-800',
        'focus-visible:ring-2 focus-visible:ring-sandy-600/40 focus-visible:ring-offset-1',
        'data-disabled:cursor-not-allowed data-disabled:border-border-disabled',
        'data-disabled:data-checked:border-border-disabled',
        invalid && 'border-orange-600 data-checked:border-orange-600',
      )}
    >
      <BaseRadio.Indicator
        keepMounted
        className={clsx(
          'size-2 rounded-full bg-sandy-600',
          'data-unchecked:hidden',
          'data-disabled:bg-border-disabled',
          invalid && 'bg-orange-600',
        )}
      />
    </BaseRadio.Root>
  )

  if (!label && !description) {
    return <span className={className}>{dot}</span>
  }

  return (
    <label
      htmlFor={radioId}
      className={clsx(
        'inline-flex gap-3 cursor-pointer',
        // When there's only a label, center it against the 16px control. With
        // a description, keep the column top-aligned but nudge the control
        // down to sit on the label's optical centre.
        description ? 'items-start' : 'items-center',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70',
        className,
      )}
    >
      {dot}
      {/* Text node carries pt-[2px] to mirror Button — Overpass' built-in
          line-height makes glyphs sit slightly above the optical centre. */}
      <span className="flex flex-col gap-0.5 pt-[2px]">
        {label ? (
          <span className="text-md leading-5 text-text-primary">{label}</span>
        ) : null}
        {description ? (
          <span id={descriptionId} className="text-sm text-text-secondary">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}
