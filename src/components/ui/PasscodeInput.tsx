import { Field } from '@base-ui/react/field'
import { OTPFieldPreview as OTPField } from '@base-ui/react/otp-field'
import clsx from 'clsx'

export type PasscodeInputProps = {
  length?: number
  value?: string
  defaultValue?: string
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
  label?: string
  description?: string
  errorMessage?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  name?: string
  className?: string
  id?: string
}

export const PasscodeInput = ({
  length = 6,
  value,
  defaultValue,
  disabled,
  autoFocus = true,
  invalid = false,
  label = 'Passcode',
  description,
  errorMessage,
  onChange,
  onComplete,
  name,
  className,
  id,
}: PasscodeInputProps) => (
  <Field.Root
    name={name}
    disabled={disabled}
    invalid={invalid || !!errorMessage}
    className={clsx('flex flex-col gap-3', className)}
  >
    <div className="flex flex-col gap-1">
      <Field.Label className="text-sm font-medium text-neutral-700">
        {label}
      </Field.Label>
      {description ? (
        <Field.Description className="text-sm text-neutral-500">
          {description}
        </Field.Description>
      ) : null}
    </div>

    <OTPField.Root
      id={id}
      length={length}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={(next) => onChange?.(next)}
      onValueComplete={(next) => onComplete?.(next)}
      className="flex items-center gap-2"
    >
      {Array.from({ length }, (_, i) => (
        <OTPField.Input
          // biome-ignore lint/suspicious/noArrayIndexKey: OTP slots are fixed and never reorder
          key={i}
          autoFocus={autoFocus && i === 0}
          aria-label={`${label} digit ${i + 1} of ${length}`}
          className={clsx(
            'h-14 w-12 rounded-xl border bg-white text-center text-xl font-semibold tabular-nums',
            'text-neutral-900 caret-neutral-900 shadow-sm transition outline-none',
            'border-neutral-300',
            'focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10',
            'data-disabled:cursor-not-allowed data-disabled:bg-neutral-100 data-disabled:text-neutral-400',
            'data-invalid:border-red-500 data-invalid:focus:border-red-500 data-invalid:focus:ring-red-500/15',
            'data-complete:border-neutral-900',
          )}
        />
      ))}
    </OTPField.Root>

    {errorMessage ? (
      <Field.Error className="text-sm text-red-600" match>
        {errorMessage}
      </Field.Error>
    ) : null}
  </Field.Root>
)
