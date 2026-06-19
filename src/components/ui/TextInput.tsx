import clsx from 'clsx'
import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  useId,
} from 'react'

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'prefix'
> & {
  label?: ReactNode
  description?: ReactNode
  errorMessage?: ReactNode
  /** Icon rendered inside the input, before the value (e.g. `<IconSearch />`). */
  leadingIcon?: ReactNode
  /** Icon rendered inside the input, after the value (e.g. a clear button). */
  trailingIcon?: ReactNode
  /** Right-aligned secondary text (e.g. "5 fields"). */
  hint?: ReactNode
  /** Allow the input to fill its parent. Defaults to true. */
  fullWidth?: boolean
  ref?: Ref<HTMLInputElement>
  onValueChange?: (next: string) => void
}

/**
 * Single-line text input modelled on the Sandy Design System "Input" component.
 *
 * - 2px `border-secondary`, 6px radius, white bg.
 * - Hover ⇒ `border-secondary-hover`, focus ⇒ `border-primary-focus`
 *   (sandy-400), filled stays `border-secondary` until interacted with.
 * - `errorMessage` swaps the border to `border-danger` and renders the
 *   message under the input.
 * - `leadingIcon` / `trailingIcon` adjust horizontal padding to keep the
 *   text well-spaced from the chrome.
 */
export const TextInput = ({
  label,
  description,
  errorMessage,
  leadingIcon,
  trailingIcon,
  hint,
  fullWidth = true,
  className,
  id,
  disabled,
  onChange,
  onValueChange,
  ref,
  ...rest
}: TextInputProps) => {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = errorMessage ? `${inputId}-error` : undefined

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e)
    onValueChange?.(e.target.value)
  }

  return (
    <div
      className={clsx(
        'flex flex-col gap-1',
        fullWidth ? 'w-full' : 'inline-flex',
        className,
      )}
    >
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      ) : null}
      {description ? (
        <span id={descriptionId} className="text-sm text-text-secondary">
          {description}
        </span>
      ) : null}

      <div
        className={clsx(
          'group/textinput relative flex items-center gap-2 rounded-md border-2 bg-bg-primary',
          'transition-colors',
          // Padding shifts slightly so an icon "swap" feels balanced — the
          // Figma source uses 14px on the side without an icon and 10px on
          // the side that has one.
          leadingIcon ? 'pl-2.5' : 'pl-3.5',
          trailingIcon || hint ? 'pr-2.5' : 'pr-3.5',
          'py-2',
          disabled
            ? 'bg-field-disabled border-border-disabled cursor-not-allowed'
            : errorMessage
              ? 'border-border-danger'
              : clsx(
                  'border-border-secondary',
                  'hover:border-border-secondary-hover',
                  'focus-within:border-border-primary-focus',
                ),
        )}
      >
        {leadingIcon ? (
          <span
            className={clsx(
              'shrink-0 grid place-items-center',
              disabled ? 'text-icon-disabled' : 'text-icon-primary',
            )}
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={
            [descriptionId, errorId].filter(Boolean).join(' ') || undefined
          }
          onChange={handleChange}
          // Opt out of password managers (1Password, Dashlane, Bitwarden,
          // LastPass, Chrome) by default — these fields are domain values
          // (field names, crops, etc.), never credentials. Callers can
          // override any of these via `{...rest}`.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          {...rest}
          className={clsx(
            'flex-1 min-w-0 bg-transparent outline-none',
            'text-md tracking-[0.25px]',
            'text-text-primary placeholder:text-text-placeholder',
            'disabled:cursor-not-allowed disabled:text-text-disabled disabled:placeholder:text-text-disabled',
          )}
        />

        {hint ? (
          <span className="shrink-0 text-sm text-text-secondary">{hint}</span>
        ) : null}

        {trailingIcon ? (
          <span
            className={clsx(
              'shrink-0 grid place-items-center',
              disabled ? 'text-icon-disabled' : 'text-icon-primary',
            )}
            aria-hidden="true"
          >
            {trailingIcon}
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <span id={errorId} role="alert" className="text-sm text-text-danger">
          {errorMessage}
        </span>
      ) : null}
    </div>
  )
}
