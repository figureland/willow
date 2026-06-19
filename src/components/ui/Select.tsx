import { Select as BaseSelect } from '@base-ui/react/select'
import clsx from 'clsx'
import { type ReactNode, type Ref, useId, useMemo, useState } from 'react'
import { Checkbox } from './Checkbox'
import { IconSearch } from './icons'

/**
 * Heavier close glyph used by the trigger's clear button. The shared
 * `IconClose` is a hairline diagonal sized for the side-sheet's larger
 * header — at 16px inside the trigger it reads as far too thin, so we
 * inline a chunkier Material-style cross here.
 */
const ICON_STROKE = 2.5

const ClearIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M6 6L18 18M18 6L6 18"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

/**
 * Stroke-style chevron — explicitly matches `ClearIcon`'s line weight so the
 * two glyphs read as siblings inside the trigger.
 */
const ChevronIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * Trailing affordance group rendered absolutely over the trigger.
 *
 * Two zones, right-aligned:
 *   - `ChevronTail`: always-rendered chevron, anchored to the right edge.
 *   - `ClearTail`:   optional clear button + 1px divider, sitting immediately
 *     to the left of the chevron when a value is selected.
 *
 * The chevron lives outside Base UI's `<Trigger>` flex flow so the trigger's
 * right padding doesn't push it inward when state changes — its position is
 * constant across populated/empty/error states.
 */

const ChevronTail = () => (
  <span
    aria-hidden="true"
    className={clsx(
      'absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none',
      'size-5 grid place-items-center text-icon-primary',
    )}
  >
    <ChevronIcon />
  </span>
)

const ClearTail = ({
  ariaLabel,
  onClear,
}: {
  ariaLabel: string
  onClear: () => void
}) => (
  // Right offset = trigger right pad (12px) + chevron (20px) + 8px breathing
  // room = 40px.
  <div className="absolute top-1/2 -translate-y-1/2 right-[40px] flex items-center gap-2">
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onClear()
      }}
      className={clsx(
        'size-5 grid place-items-center rounded-sm',
        'text-icon-secondary hover:text-icon-primary',
        'hover:bg-bg-tertiary transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      )}
    >
      <ClearIcon />
    </button>
    <span aria-hidden="true" className="h-5 w-px bg-border-secondary" />
  </div>
)

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type SelectOption<Value extends string = string> = {
  value: Value
  label: ReactNode
  /** Optional right-aligned secondary text (e.g. "5 fields"). */
  hint?: ReactNode
  disabled?: boolean
  /**
   * Text used by the search filter. Falls back to the rendered `label` when
   * it's a string; required when `label` is a node.
   */
  searchText?: string
}

export type SelectGroup<Value extends string = string> = {
  label: ReactNode
  options: SelectOption<Value>[]
}

export type SelectItems<Value extends string = string> =
  | SelectOption<Value>[]
  | SelectGroup<Value>[]

type SelectState = 'default' | 'error' | 'disabled'

type SharedProps<Value extends string> = {
  items: SelectItems<Value>
  placeholder?: string
  label?: ReactNode
  description?: ReactNode
  errorMessage?: ReactNode
  /** Show an in-popup search filter (case-insensitive). */
  searchable?: boolean
  /** Placeholder text for the search filter. */
  searchPlaceholder?: string
  /** Empty-state copy when the search has no results. */
  emptyMessage?: ReactNode
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  /** Width of the trigger and popup. Defaults to full width of the parent. */
  width?: number | string
  ref?: Ref<HTMLButtonElement>
}

export type SelectProps<Value extends string = string> = SharedProps<Value> & {
  value?: Value | null
  defaultValue?: Value
  onValueChange?: (value: Value | null) => void
  /**
   * Show an inline clear button (×) in the trigger when a value is selected.
   * Defaults to `true`. Set to `false` to suppress.
   */
  clearable?: boolean
  /** Accessible label for the clear button. */
  clearLabel?: string
}

export type MultiSelectProps<Value extends string = string> =
  SharedProps<Value> & {
    value?: Value[]
    defaultValue?: Value[]
    onValueChange?: (value: Value[]) => void
    /**
     * Label rendered in the trigger when one or more options are selected.
     * Defaults to "N selected".
     */
    formatSelected?: (selected: SelectOption<Value>[]) => ReactNode
    /**
     * When `true` and `items` is a list of groups, each group renders a
     * checkbox header. Clicking it selects every (non-disabled) child;
     * clicking again clears them. The checkbox shows an `indeterminate`
     * tri-state when only some children are selected.
     */
    selectableGroups?: boolean
    /**
     * Show an inline clear button (×) in the trigger when at least one
     * option is selected. Defaults to `true`. Set to `false` to suppress.
     */
    clearable?: boolean
    /** Accessible label for the clear button. */
    clearLabel?: string
  }

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const isGroupArray = <V extends string>(
  items: SelectItems<V>,
): items is SelectGroup<V>[] =>
  items.length > 0 && 'options' in (items[0] as object)

const flatten = <V extends string>(items: SelectItems<V>): SelectOption<V>[] =>
  isGroupArray(items)
    ? items.flatMap((g) => g.options)
    : (items as SelectOption<V>[])

const matchesQuery = <V extends string>(
  option: SelectOption<V>,
  q: string,
): boolean => {
  if (!q) return true
  const text =
    option.searchText ??
    (typeof option.label === 'string' ? option.label : String(option.value))
  return text.toLowerCase().includes(q.toLowerCase())
}

const filterItems = <V extends string>(
  items: SelectItems<V>,
  q: string,
): SelectItems<V> => {
  if (!q) return items
  if (isGroupArray(items)) {
    return items
      .map((g) => ({
        ...g,
        options: g.options.filter((o) => matchesQuery(o, q)),
      }))
      .filter((g) => g.options.length > 0)
  }
  return (items as SelectOption<V>[]).filter((o) => matchesQuery(o, q))
}

/* -------------------------------------------------------------------------- */
/* Trigger surface — shared between Select and MultiSelect.                    */
/* -------------------------------------------------------------------------- */

const triggerSurface = ({
  state = 'default',
  isPlaceholder = false,
}: {
  state?: SelectState
  isPlaceholder?: boolean
}) =>
  clsx(
    'group/select-trigger relative w-full flex items-center gap-2',
    // Right padding reserves room for the absolutely-positioned chevron
    // (always rendered, 20px box + 12px from edge = 32px). When the clear
    // tail is also shown the trigger gets `pr-[80px]` from the call site.
    'pl-3.5 pr-9 py-2 rounded-md border-2 bg-bg-primary',
    'text-md tracking-[0.25px] outline-none transition-colors',
    isPlaceholder ? 'text-text-placeholder' : 'text-text-primary',
    state === 'disabled'
      ? 'bg-field-disabled border-border-disabled text-text-disabled cursor-not-allowed'
      : state === 'error'
        ? 'border-border-danger'
        : 'border-border-secondary hover:border-border-secondary-hover',
    state !== 'disabled' &&
      'focus-visible:border-border-primary-focus data-[popup-open]:border-border-primary',
  )

/* -------------------------------------------------------------------------- */
/* Field wrapper — label / description / error                                 */
/* -------------------------------------------------------------------------- */

type FieldShellProps = {
  id: string
  label?: ReactNode
  description?: ReactNode
  errorMessage?: ReactNode
  width?: number | string
  className?: string
  children: ReactNode
}

const FieldShell = ({
  id,
  label,
  description,
  errorMessage,
  width,
  className,
  children,
}: FieldShellProps) => {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = errorMessage ? `${id}-error` : undefined
  return (
    <div
      className={clsx('flex flex-col gap-1', className)}
      style={width ? { width } : undefined}
    >
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      {description ? (
        <span id={descriptionId} className="text-sm text-text-secondary">
          {description}
        </span>
      ) : null}
      {children}
      {errorMessage ? (
        <span id={errorId} role="alert" className="text-sm text-text-danger">
          {errorMessage}
        </span>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Popup chrome — search input + list shell                                    */
/* -------------------------------------------------------------------------- */

const popupClass = clsx(
  'z-30 overflow-hidden rounded-md border-2 border-border-secondary bg-bg-primary',
  'shadow-[0_8px_8px_-2px_rgba(0,0,0,0.05)]',
  'min-w-[var(--anchor-width)] max-w-[min(calc(100vw-32px),520px)]',
  'origin-[var(--transform-origin)] transition-opacity duration-150 ease-out',
  'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
)

type SearchBarProps = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

const SearchBar = ({ value, onChange, placeholder }: SearchBarProps) => (
  <div className="flex items-center gap-3 px-3 py-2 border-b-2 border-border-secondary">
    <IconSearch className="text-icon-primary" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Search'}
      aria-label="Filter options"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-1p-ignore="true"
      data-lpignore="true"
      data-bwignore="true"
      data-form-type="other"
      className={clsx(
        'flex-1 min-w-0 bg-transparent outline-none',
        'text-md tracking-[0.25px] text-text-primary placeholder:text-text-placeholder',
      )}
    />
  </div>
)

type EmptyStateProps = { children?: ReactNode }

const EmptyState = ({ children }: EmptyStateProps) => (
  <div className="px-3 py-4 text-sm text-text-secondary">
    {children ?? 'No results.'}
  </div>
)

/* -------------------------------------------------------------------------- */
/* Single-value Select (Base UI Select)                                        */
/* -------------------------------------------------------------------------- */

export const Select = <Value extends string = string>({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select',
  label,
  description,
  errorMessage,
  searchable = false,
  searchPlaceholder = 'Search by name',
  emptyMessage,
  disabled,
  required,
  name,
  id,
  className,
  width,
  ref,
  clearable = true,
  clearLabel = 'Clear selection',
}: SelectProps<Value>) => {
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const [query, setQuery] = useState('')

  // Internal value mirror so the clear button works when the consumer is
  // uncontrolled. When `value` is supplied, defer to it instead.
  const [internalValue, setInternalValue] = useState<Value | null>(
    defaultValue ?? null,
  )
  const isControlled = value !== undefined
  const currentValue = isControlled ? (value as Value | null) : internalValue
  const commitValue = (next: Value | null) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  const filtered = useMemo(
    () => (searchable ? filterItems(items, query) : items),
    [items, query, searchable],
  )
  const flatOptions = useMemo(() => flatten(items), [items])
  const selected = useMemo(
    () => flatOptions.find((o) => o.value === currentValue),
    [flatOptions, currentValue],
  )

  const state: SelectState = disabled
    ? 'disabled'
    : errorMessage
      ? 'error'
      : 'default'

  const showClear = clearable && !!selected && !disabled

  return (
    <FieldShell
      id={triggerId}
      label={label}
      description={description}
      errorMessage={errorMessage}
      width={width}
      className={className}
    >
      <BaseSelect.Root
        value={currentValue ?? undefined}
        onValueChange={(next) => commitValue(next as Value)}
        onOpenChange={(open) => {
          if (!open) setQuery('')
        }}
        disabled={disabled}
        required={required}
        name={name}
        id={triggerId}
      >
        <div className="relative">
          <BaseSelect.Trigger
            ref={ref}
            className={clsx(
              triggerSurface({ state, isPlaceholder: !selected }),
              // Reserve room for the clear tail (button + divider) sitting
              // between the text and the always-rendered chevron.
              showClear && 'pr-[80px]',
            )}
          >
            <span className="flex-1 min-w-0 text-left truncate">
              <BaseSelect.Value placeholder={placeholder}>
                {() => (selected ? selected.label : placeholder)}
              </BaseSelect.Value>
            </span>
          </BaseSelect.Trigger>

          <ChevronTail />
          {showClear ? (
            <ClearTail
              ariaLabel={clearLabel}
              onClear={() => commitValue(null)}
            />
          ) : null}
        </div>

        <BaseSelect.Portal>
          <BaseSelect.Positioner sideOffset={4} className="z-30 outline-none">
            <BaseSelect.Popup className={popupClass}>
              {searchable ? (
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder={searchPlaceholder}
                />
              ) : null}
              <BaseSelect.List className="max-h-[280px] overflow-y-auto py-1">
                {renderSingleItems(filtered)}
                {flatten(filtered).length === 0 ? (
                  <EmptyState>{emptyMessage}</EmptyState>
                ) : null}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </FieldShell>
  )
}

const renderSingleItems = <V extends string>(items: SelectItems<V>) => {
  if (isGroupArray(items)) {
    return items.map((group, gi) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: group order is stable within a render pass
      <BaseSelect.Group key={`g-${gi}`}>
        <BaseSelect.GroupLabel className="px-3 pt-3 pb-1 text-xs font-medium uppercase tracking-[0.5px] text-text-secondary">
          {group.label}
        </BaseSelect.GroupLabel>
        {group.options.map((o) => (
          <SingleItem key={o.value} option={o} />
        ))}
      </BaseSelect.Group>
    ))
  }
  return (items as SelectOption<V>[]).map((o) => (
    <SingleItem key={o.value} option={o} />
  ))
}

const SingleItem = <V extends string>({
  option,
}: {
  option: SelectOption<V>
}) => (
  <BaseSelect.Item
    value={option.value}
    disabled={option.disabled}
    className={clsx(
      'flex items-center gap-3 px-3 py-2 cursor-pointer outline-none',
      'text-md tracking-[0.25px] text-text-primary',
      'data-highlighted:bg-bg-tertiary',
      'data-selected:font-semibold data-selected:text-text-primary',
      'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
    )}
  >
    <BaseSelect.ItemText className="flex-1 min-w-0 truncate">
      {option.label}
    </BaseSelect.ItemText>
    {option.hint ? (
      <span className="text-sm text-text-secondary shrink-0">
        {option.hint}
      </span>
    ) : null}
  </BaseSelect.Item>
)

/* -------------------------------------------------------------------------- */
/* Multi-value Select (Base UI Select with multiple=true + checkboxes)         */
/* -------------------------------------------------------------------------- */

export const MultiSelect = <Value extends string = string>({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select',
  label,
  description,
  errorMessage,
  searchable = true,
  searchPlaceholder = 'Search by name',
  emptyMessage,
  disabled,
  required,
  name,
  id,
  className,
  width,
  ref,
  formatSelected,
  selectableGroups = false,
  clearable = true,
  clearLabel = 'Clear selection',
}: MultiSelectProps<Value>) => {
  const generatedId = useId()
  const triggerId = id ?? generatedId
  const [query, setQuery] = useState('')

  // Internal value mirror so selectableGroups bulk-toggle works even when the
  // caller hasn't wired up an onValueChange handler. When the caller controls
  // value externally, we always defer to their value.
  const [internalValue, setInternalValue] = useState<Value[]>(
    defaultValue ?? [],
  )
  const isControlled = value !== undefined
  const currentValue = isControlled ? (value as Value[]) : internalValue
  const commitValue = (next: Value[]) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  const filtered = useMemo(
    () => (searchable ? filterItems(items, query) : items),
    [items, query, searchable],
  )
  const flatOptions = useMemo(() => flatten(items), [items])
  const selectedOptions = useMemo(
    () => flatOptions.filter((o) => currentValue.includes(o.value)),
    [flatOptions, currentValue],
  )

  const state: SelectState = disabled
    ? 'disabled'
    : errorMessage
      ? 'error'
      : 'default'

  const triggerLabel: ReactNode =
    selectedOptions.length === 0
      ? placeholder
      : formatSelected
        ? formatSelected(selectedOptions)
        : selectedOptions.length === 1
          ? selectedOptions[0].label
          : `${selectedOptions.length} selected`

  return (
    <FieldShell
      id={triggerId}
      label={label}
      description={description}
      errorMessage={errorMessage}
      width={width}
      className={className}
    >
      <BaseSelect.Root
        multiple
        value={currentValue}
        onValueChange={(next) => commitValue(next as Value[])}
        onOpenChange={(open) => {
          if (!open) setQuery('')
        }}
        disabled={disabled}
        required={required}
        name={name}
        id={triggerId}
      >
        <div className="relative">
          <BaseSelect.Trigger
            ref={ref}
            className={clsx(
              triggerSurface({
                state,
                isPlaceholder: selectedOptions.length === 0,
              }),
              clearable &&
                selectedOptions.length > 0 &&
                !disabled &&
                'pr-[80px]',
            )}
          >
            <span className="flex-1 min-w-0 text-left truncate">
              {triggerLabel}
            </span>
          </BaseSelect.Trigger>

          <ChevronTail />
          {clearable && selectedOptions.length > 0 && !disabled ? (
            <ClearTail ariaLabel={clearLabel} onClear={() => commitValue([])} />
          ) : null}
        </div>

        <BaseSelect.Portal>
          <BaseSelect.Positioner sideOffset={4} className="z-30 outline-none">
            <BaseSelect.Popup className={popupClass}>
              {searchable ? (
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder={searchPlaceholder}
                />
              ) : null}
              <BaseSelect.List className="max-h-[320px] overflow-y-auto py-1">
                {renderMultiItems({
                  items: filtered,
                  currentValue,
                  commitValue,
                  selectableGroups,
                })}
                {flatten(filtered).length === 0 ? (
                  <EmptyState>{emptyMessage}</EmptyState>
                ) : null}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </FieldShell>
  )
}

type MultiRenderArgs<V extends string> = {
  items: SelectItems<V>
  currentValue: V[]
  commitValue: (next: V[]) => void
  selectableGroups: boolean
}

const renderMultiItems = <V extends string>({
  items,
  currentValue,
  commitValue,
  selectableGroups,
}: MultiRenderArgs<V>) => {
  if (isGroupArray(items)) {
    return items.map((group, gi) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: group order is stable within a render pass
      <BaseSelect.Group key={`g-${gi}`}>
        {selectableGroups ? (
          <GroupHeader
            group={group}
            currentValue={currentValue}
            commitValue={commitValue}
          />
        ) : (
          <BaseSelect.GroupLabel className="px-3 pt-3 pb-1 text-xs font-medium uppercase tracking-[0.5px] text-text-secondary">
            {group.label}
          </BaseSelect.GroupLabel>
        )}
        {group.options.map((o) => (
          <MultiItem key={o.value} option={o} indented={selectableGroups} />
        ))}
      </BaseSelect.Group>
    ))
  }
  return (items as SelectOption<V>[]).map((o) => (
    <MultiItem key={o.value} option={o} />
  ))
}

type GroupHeaderProps<V extends string> = {
  group: SelectGroup<V>
  currentValue: V[]
  commitValue: (next: V[]) => void
}

const GroupHeader = <V extends string>({
  group,
  currentValue,
  commitValue,
}: GroupHeaderProps<V>) => {
  const enabledChildren = group.options.filter((o) => !o.disabled)
  const enabledValues = enabledChildren.map((o) => o.value)
  const selectedCount = enabledValues.filter((v) =>
    currentValue.includes(v),
  ).length
  const allChecked =
    enabledValues.length > 0 && selectedCount === enabledValues.length
  const indeterminate = selectedCount > 0 && !allChecked

  const toggle = () => {
    if (allChecked) {
      // remove every child
      commitValue(currentValue.filter((v) => !enabledValues.includes(v)))
    } else {
      // add every missing child
      const merged = new Set<V>(currentValue)
      for (const v of enabledValues) merged.add(v)
      commitValue(Array.from(merged))
    }
  }

  return (
    <button
      type="button"
      // Sits outside the Base UI item list so keyboard nav still skips it
      // (the children below remain focusable as listbox options). Acts as a
      // group bulk-toggle.
      className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer select-none border-b border-border-tertiary hover:bg-bg-tertiary outline-none focus-visible:bg-bg-tertiary"
      onClick={toggle}
    >
      <Checkbox
        checked={allChecked}
        indeterminate={indeterminate}
        aria-hidden="true"
        className="pointer-events-none"
      />
      <span className="flex-1 min-w-0 text-xs font-medium uppercase tracking-[0.5px] text-text-secondary truncate text-left">
        {group.label}
      </span>
    </button>
  )
}

const MultiItem = <V extends string>({
  option,
  indented = false,
}: {
  option: SelectOption<V>
  indented?: boolean
}) => (
  <BaseSelect.Item
    value={option.value}
    disabled={option.disabled}
    className={clsx(
      'flex items-center gap-3 px-3 py-2 cursor-pointer outline-none',
      'text-md tracking-[0.25px] text-text-primary',
      'data-highlighted:bg-bg-tertiary',
      'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
      indented && 'pl-9',
    )}
  >
    {/* The Base UI item itself owns the click + keyboard activation; the
        checkbox below mirrors the selected state visually but doesn't need
        its own input/event handler — pointer-events-none + tabIndex=-1 keep
        it purely decorative while staying accessible. */}
    <BaseSelect.ItemIndicator
      keepMounted
      className="contents"
      render={(props, state) => (
        <Checkbox
          {...props}
          checked={state.selected}
          aria-hidden="true"
          className="pointer-events-none"
        />
      )}
    />
    <BaseSelect.ItemText className="flex-1 min-w-0 truncate">
      {option.label}
    </BaseSelect.ItemText>
    {option.hint ? (
      <span className="text-sm text-text-secondary shrink-0">
        {option.hint}
      </span>
    ) : null}
  </BaseSelect.Item>
)
