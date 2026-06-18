import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Tabs primitives built on Base UI. The bar shows a thick sandy-600 underline
 * for the active tab and a 2px tertiary divider beneath everything else,
 * matching the Figma source. Compose like:
 *
 *   <Tabs defaultValue="accounts">
 *     <TabBar>
 *       <Tab value="overview">Overview</Tab>
 *       <Tab value="accounts">NC Accounts</Tab>
 *     </TabBar>
 *     <TabPanel value="overview">…</TabPanel>
 *     <TabPanel value="accounts">…</TabPanel>
 *   </Tabs>
 */

export type TabsProps<Value extends string = string> = {
  value?: Value
  defaultValue?: Value
  onValueChange?: (value: Value) => void
  className?: string
  children: ReactNode
}

export const Tabs = <Value extends string = string>({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: TabsProps<Value>) => (
  <BaseTabs.Root
    value={value}
    defaultValue={defaultValue}
    onValueChange={(next) => onValueChange?.(next as Value)}
    className={clsx('flex flex-col', className)}
  >
    {children}
  </BaseTabs.Root>
)

export type TabBarProps = {
  className?: string
  children: ReactNode
}

export const TabBar = ({ className, children }: TabBarProps) => (
  <BaseTabs.List
    className={clsx(
      // The border-bottom sits on the scroll container so it always spans the
      // visible width. Children are kept on a single line via flex-nowrap and
      // each tab opts out of shrinking — the bar scrolls horizontally when
      // there isn't room for every tab.
      'relative flex items-end flex-nowrap gap-[6px]',
      'border-b-2 border-border-tertiary',
      'overflow-x-auto overscroll-x-contain',
      // Hide the horizontal scrollbar while keeping native scroll behaviour.
      'scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]',
      '[&::-webkit-scrollbar]:hidden',
      className,
    )}
  >
    {children}
  </BaseTabs.List>
)

export type TabProps = {
  value: string
  disabled?: boolean
  className?: string
  children: ReactNode
}

export const Tab = ({ value, disabled, className, children }: TabProps) => (
  <BaseTabs.Tab
    value={value}
    disabled={disabled}
    className={clsx(
      'relative shrink-0 whitespace-nowrap cursor-pointer',
      'font-sans font-semibold text-md tracking-[0.15px]',
      // pb is 10 + 3 = 13px so the active underline (sitting flush with the
      // tab's bottom edge) has room without clipping. The bar's overflow-x
      // would otherwise hide a negative-positioned pseudo, so we draw the
      // underline INSIDE the tab's content box.
      'px-[10px] pt-[10px] pb-[13px] rounded-t-md',
      'text-text-secondary data-active:text-text-primary',
      'after:absolute after:left-0 after:right-0 after:bottom-0',
      'after:h-[3px] after:rounded-full',
      'after:bg-transparent data-active:after:bg-sandy-600',
      'hover:text-text-primary',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
      'disabled:cursor-not-allowed disabled:text-text-disabled',
      'transition-colors',
      className,
    )}
  >
    {children}
  </BaseTabs.Tab>
)

export type TabPanelProps = {
  value: string
  className?: string
  children: ReactNode
}

export const TabPanel = ({ value, className, children }: TabPanelProps) => (
  <BaseTabs.Panel value={value} className={clsx('outline-none', className)}>
    {children}
  </BaseTabs.Panel>
)
