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
      <Field.Label className="text-sm font-medium text-text-primary">
        {label}
      </Field.Label>
      {description ? (
        <Field.Description className="text-sm text-text-secondary">
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
          /* Disable password-manager autofill — these are one-time numeric
             slots, not credentials. Dashlane / 1Password / LastPass each
             read their own opt-out attribute. */
          data-form-type="other"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          className={clsx(
            'h-14 w-12 rounded-xl border bg-bg-primary text-center text-xl font-semibold tabular-nums',
            'text-text-primary caret-text-primary shadow-sm transition outline-none',
            'border-border-secondary',
            'focus:border-text-primary focus:ring-2 focus:ring-text-primary/10',
            'data-disabled:cursor-not-allowed data-disabled:bg-bg-tertiary data-disabled:text-text-disabled',
            'data-invalid:border-border-danger data-invalid:focus:border-border-danger data-invalid:focus:ring-border-danger/15',
            'data-complete:border-text-primary',
          )}
        />
      ))}
    </OTPField.Root>

    {errorMessage ? (
      <Field.Error className="text-sm text-text-danger" match>
        {errorMessage}
      </Field.Error>
    ) : null}
  </Field.Root>
)
