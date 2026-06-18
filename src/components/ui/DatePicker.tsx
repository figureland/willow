import { Popover as BasePopover } from '@base-ui/react/popover'
import clsx from 'clsx'
import { format, isValid } from 'date-fns'
import { type ReactNode, type Ref, useId, useState } from 'react'
import { type DateRange, DayPicker } from 'react-day-picker'
import { IconChevronDown, IconChevronUp } from './icons'

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type CommonProps = {
  label?: ReactNode
  description?: ReactNode
  errorMessage?: ReactNode
  placeholder?: string
  /** Format string passed to date-fns. Defaults to `dd MMM yyyy`. */
  format?: string
  /** Earliest selectable date. */
  fromDate?: Date
  /** Latest selectable date. */
  toDate?: Date
  /** Predicate to disable individual dates. */
  isDateDisabled?: (date: Date) => boolean
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  /** Override the trigger width (CSS value). Defaults to `100%`. */
  width?: number | string
  ref?: Ref<HTMLButtonElement>
}

type SingleProps = CommonProps & {
  mode?: 'single'
  value?: Date | null
  defaultValue?: Date
  onValueChange?: (date: Date | undefined) => void
}

type RangeProps = CommonProps & {
  mode: 'range'
  value?: DateRange | null
  defaultValue?: DateRange
  onValueChange?: (range: DateRange | undefined) => void
}

export type DatePickerProps = SingleProps | RangeProps

/* -------------------------------------------------------------------------- */
/* Trigger                                                                     */
/* -------------------------------------------------------------------------- */

const triggerClass = (state: 'default' | 'error' | 'disabled') =>
  clsx(
    'group/dp-trigger w-full flex items-center gap-2 rounded-md border-2 bg-bg-primary',
    'pl-3.5 pr-2.5 py-2 text-md tracking-[0.25px] outline-none transition-colors',
    'cursor-pointer',
    state === 'disabled'
      ? 'bg-field-disabled border-border-disabled text-text-disabled cursor-not-allowed'
      : state === 'error'
        ? 'border-border-danger'
        : 'border-border-secondary hover:border-border-secondary-hover',
    state !== 'disabled' &&
      'focus-visible:border-border-primary-focus data-[popup-open]:border-border-primary',
  )

const formatRange = (range: DateRange | null | undefined, pattern: string) => {
  if (!range?.from && !range?.to) return ''
  const from = range.from ? format(range.from, pattern) : '—'
  const to = range.to ? format(range.to, pattern) : '—'
  if (range.from && !range.to) return from
  return `${from} – ${to}`
}

/* -------------------------------------------------------------------------- */
/* Calendar (DayPicker tokenised)                                              */
/* -------------------------------------------------------------------------- */

const dayBase = clsx(
  'size-9 rounded-md text-md tracking-[0.25px] outline-none transition-colors',
  'hover:bg-bg-tertiary focus-visible:ring-2 focus-visible:ring-sandy-600/40',
  'aria-disabled:text-text-disabled aria-disabled:hover:bg-transparent aria-disabled:cursor-not-allowed',
  'data-[outside]:text-text-secondary',
  'data-[today]:font-semibold data-[today]:text-text-brand',
)

const calendarClassNames = {
  root: 'inline-flex flex-col gap-2 text-text-primary',
  months: 'flex flex-col gap-2',
  month: 'flex flex-col gap-2',
  month_caption:
    'flex items-center justify-center pt-1 pb-1 text-md font-semibold text-text-primary',
  nav: 'flex items-center gap-1 justify-end',
  button_previous:
    'size-9 grid place-items-center rounded-md text-icon-primary hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40 disabled:text-text-disabled disabled:hover:bg-transparent',
  button_next:
    'size-9 grid place-items-center rounded-md text-icon-primary hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40 disabled:text-text-disabled disabled:hover:bg-transparent',
  month_grid: 'w-full border-collapse',
  weekdays: '',
  weekday:
    'size-9 text-xs font-medium uppercase tracking-[0.5px] text-text-secondary text-center',
  week: '',
  day: 'p-0 align-middle',
  day_button: dayBase,
  today: '',
  outside: '',
  disabled: '',
  hidden: 'invisible',
}

/* Drive selection visuals through modifiers — this gives us a single
   declaration per state and avoids the cascade ambiguity that happens when
   Day cells carry both `selected` and `range_middle` at once. */
const modifiersClassNames = {
  selected:
    '[&>button]:bg-sandy-600 [&>button]:text-text-primary-inverse [&>button]:hover:bg-sandy-700',
  range_start:
    '[&>button]:rounded-r-none [&>button]:bg-sandy-600 [&>button]:text-text-primary-inverse',
  range_end:
    '[&>button]:rounded-l-none [&>button]:bg-sandy-600 [&>button]:text-text-primary-inverse',
  range_middle:
    'bg-sandy-100 [&>button]:!bg-transparent [&>button]:!text-text-primary [&>button]:!rounded-none [&>button]:hover:!bg-sandy-200',
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export const DatePicker = (props: DatePickerProps) => {
  const {
    label,
    description,
    errorMessage,
    placeholder = props.mode === 'range' ? 'Select date range' : 'Select date',
    format: pattern = 'dd MMM yyyy',
    fromDate,
    toDate,
    isDateDisabled,
    disabled,
    required,
    name,
    id,
    className,
    width = '100%',
    ref,
  } = props

  const generatedId = useId()
  const triggerId = id ?? generatedId
  const descriptionId = description ? `${triggerId}-description` : undefined
  const errorId = errorMessage ? `${triggerId}-error` : undefined

  // Internal value mirror so the calendar works without an external handler.
  const [internalSingle, setInternalSingle] = useState<Date | undefined>(
    props.mode === 'range'
      ? undefined
      : ((props as SingleProps).defaultValue ?? undefined),
  )
  const [internalRange, setInternalRange] = useState<DateRange | undefined>(
    props.mode === 'range'
      ? ((props as RangeProps).defaultValue ?? undefined)
      : undefined,
  )

  const isControlledSingle =
    props.mode !== 'range' && (props as SingleProps).value !== undefined
  const isControlledRange =
    props.mode === 'range' && (props as RangeProps).value !== undefined

  const singleValue: Date | undefined = isControlledSingle
    ? ((props as SingleProps).value ?? undefined)
    : internalSingle
  const rangeValue: DateRange | undefined = isControlledRange
    ? ((props as RangeProps).value ?? undefined)
    : internalRange

  const handleSelectSingle = (date: Date | undefined) => {
    if (!isControlledSingle) setInternalSingle(date)
    ;(props as SingleProps).onValueChange?.(date)
  }
  const handleSelectRange = (range: DateRange | undefined) => {
    if (!isControlledRange) setInternalRange(range)
    ;(props as RangeProps).onValueChange?.(range)
  }

  const displayValue =
    props.mode === 'range'
      ? formatRange(rangeValue, pattern)
      : singleValue && isValid(singleValue)
        ? format(singleValue, pattern)
        : ''

  const state: 'default' | 'error' | 'disabled' = disabled
    ? 'disabled'
    : errorMessage
      ? 'error'
      : 'default'

  const commonDisabled = [
    ...(fromDate ? [{ before: fromDate }] : []),
    ...(toDate ? [{ after: toDate }] : []),
    ...(isDateDisabled ? [isDateDisabled] : []),
  ]

  return (
    <div className={clsx('flex flex-col gap-1', className)} style={{ width }}>
      {label ? (
        <label
          htmlFor={triggerId}
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

      <BasePopover.Root>
        <BasePopover.Trigger
          ref={ref}
          id={triggerId}
          disabled={disabled}
          aria-describedby={
            [descriptionId, errorId].filter(Boolean).join(' ') || undefined
          }
          aria-invalid={errorMessage ? true : undefined}
          aria-required={required || undefined}
          className={triggerClass(state)}
        >
          <span
            className={clsx(
              'flex-1 min-w-0 text-left truncate',
              displayValue ? 'text-text-primary' : 'text-text-placeholder',
            )}
          >
            {displayValue || placeholder}
          </span>
          <span
            aria-hidden="true"
            className={clsx(
              'shrink-0 grid place-items-center',
              disabled ? 'text-icon-disabled' : 'text-icon-primary',
            )}
          >
            <CalendarGlyph />
          </span>
          {/* Hidden input mirrors the value for native form submission */}
          {name ? (
            <input
              type="hidden"
              name={name}
              value={
                props.mode === 'range'
                  ? rangeValue?.from
                    ? `${rangeValue.from.toISOString()}|${rangeValue.to?.toISOString() ?? ''}`
                    : ''
                  : (singleValue?.toISOString() ?? '')
              }
            />
          ) : null}
        </BasePopover.Trigger>

        <BasePopover.Portal>
          <BasePopover.Positioner sideOffset={4} className="z-30 outline-none">
            <BasePopover.Popup
              className={clsx(
                'z-30 rounded-md border-2 border-border-secondary bg-bg-primary p-3',
                'shadow-[0_8px_8px_-2px_rgba(0,0,0,0.05)]',
                'origin-[var(--transform-origin)] transition-opacity duration-150 ease-out',
                'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
              )}
            >
              {props.mode === 'range' ? (
                <DayPicker
                  mode="range"
                  selected={rangeValue}
                  onSelect={handleSelectRange}
                  disabled={commonDisabled.length ? commonDisabled : undefined}
                  showOutsideDays
                  classNames={calendarClassNames}
                  modifiersClassNames={modifiersClassNames}
                  components={{
                    Chevron: ChevronComponent,
                  }}
                />
              ) : (
                <DayPicker
                  mode="single"
                  selected={singleValue}
                  onSelect={handleSelectSingle}
                  disabled={commonDisabled.length ? commonDisabled : undefined}
                  showOutsideDays
                  classNames={calendarClassNames}
                  modifiersClassNames={modifiersClassNames}
                  components={{
                    Chevron: ChevronComponent,
                  }}
                />
              )}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>

      {errorMessage ? (
        <span id={errorId} role="alert" className="text-sm text-text-danger">
          {errorMessage}
        </span>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Internal: chevron + calendar glyph                                          */
/* -------------------------------------------------------------------------- */

const ChevronComponent = ({
  orientation,
}: {
  orientation?: 'up' | 'down' | 'left' | 'right'
}) => {
  if (orientation === 'left') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M15 6L9 12L15 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (orientation === 'right') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M9 6L15 12L9 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (orientation === 'up') return <IconChevronUp size={16} />
  return <IconChevronDown size={16} />
}

const CalendarGlyph = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M7 3v2M17 3v2M3 9h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
