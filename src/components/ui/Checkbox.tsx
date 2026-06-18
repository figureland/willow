import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import clsx from 'clsx'
import { type ReactNode, type Ref, useId } from 'react'

export type CheckboxProps = {
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  value?: string
  id?: string
  label?: ReactNode
  description?: ReactNode
  className?: string
  onCheckedChange?: (checked: boolean) => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * Six-pixel rounded square box with a 1.6px secondary stroke when unchecked
 * and a sandy-600 fill with a 2px white tick when checked — matches the
 * Figma source 1:1. The whole control is a Base UI Checkbox under the hood,
 * so we get keyboard support, indeterminate, form binding and ARIA for free.
 */
export const Checkbox = ({
  checked,
  defaultChecked,
  indeterminate,
  disabled,
  required,
  invalid,
  name,
  value,
  id,
  label,
  description,
  className,
  onCheckedChange,
  ref,
}: CheckboxProps) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined

  const box = (
    <BaseCheckbox.Root
      ref={ref}
      id={inputId}
      name={name}
      value={value}
      checked={checked}
      defaultChecked={defaultChecked}
      indeterminate={indeterminate}
      disabled={disabled}
      required={required}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      aria-describedby={descriptionId}
      aria-invalid={invalid || undefined}
      className={clsx(
        'shrink-0 size-4 rounded-[2px] border-[1.6px] bg-bg-primary',
        'grid place-items-center transition-colors outline-none',
        'border-text-secondary',
        'hover:border-text-primary',
        'data-checked:bg-sandy-600 data-checked:border-sandy-600',
        'data-checked:hover:bg-sandy-800 data-checked:hover:border-sandy-800',
        'data-indeterminate:bg-sandy-600 data-indeterminate:border-sandy-600',
        'focus-visible:ring-2 focus-visible:ring-sandy-600/40 focus-visible:ring-offset-1',
        'data-disabled:cursor-not-allowed data-disabled:border-border-disabled data-disabled:bg-bg-tertiary',
        'data-disabled:data-checked:bg-button-disabled data-disabled:data-checked:border-border-disabled',
        invalid && 'border-orange-600 data-checked:bg-orange-600',
      )}
    >
      <BaseCheckbox.Indicator
        className="grid place-items-center text-text-inverse data-unchecked:hidden"
        keepMounted
      >
        {indeterminate ? (
          <span
            aria-hidden="true"
            className="h-[2px] w-[10px] rounded-full bg-current"
          />
        ) : (
          // 10.4×8.6 checkmark from Figma — scaled into the 16px box
          <svg
            width="10"
            height="8"
            viewBox="0 0 10.4142 8.63133"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M9.70711 0.707107L3.1971 7.21712L0.707107 4.72713"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )

  if (!label && !description) {
    return <span className={className}>{box}</span>
  }

  return (
    <label
      htmlFor={inputId}
      className={clsx(
        'inline-flex gap-3 cursor-pointer',
        description ? 'items-start' : 'items-center',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70',
        className,
      )}
    >
      {box}
      {/* The text node carries pt-[2px] to mirror Button — Overpass' built-in
          line-height makes glyphs sit slightly above the optical centre, so
          a 2px top nudge brings the label down to align with the control. */}
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
