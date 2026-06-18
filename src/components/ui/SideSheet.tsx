import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { IconClose } from './icons'

export type SideSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible title for the sheet (announced by screen readers). */
  title: ReactNode
  /** Optional sub-title slot rendered next to the title. */
  eyebrow?: ReactNode
  /** Sheet width as a CSS value. Defaults to 75vw. */
  width?: string
  /** Sticky footer (e.g. action bar). */
  footer?: ReactNode
  children: ReactNode
}

/**
 * A right-edge overlay panel built on Base UI's accessible Dialog primitive.
 * Used for detail views that don't deserve a full page navigation — the
 * caller still owns URL state so the sheet can be deep-linked.
 *
 * Visual contract:
 *   - Slides in from the right.
 *   - Width defaults to 75vw, can be overridden via `width`.
 *   - Tokenised chrome: white surface, 2px tertiary divider under the header,
 *     border-secondary 2px on the left edge.
 *   - Backdrop is the standard dim-out with a fade transition.
 */
export const SideSheet = ({
  open,
  onOpenChange,
  title,
  eyebrow,
  width = '75vw',
  footer,
  children,
}: SideSheetProps) => (
  <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        className={clsx(
          'fixed inset-0 z-40 bg-black/40',
          'transition-opacity duration-200 ease-out',
          'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
        )}
      />
      <BaseDialog.Popup
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex flex-col',
          'bg-bg-primary border-l-2 border-border-secondary shadow-xl',
          'outline-none',
          'transition-transform duration-300 ease-out',
          'data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full',
        )}
        style={{ width, maxWidth: '100vw' }}
      >
        <header className="flex items-start gap-4 px-8 py-6 border-b-2 border-border-tertiary">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {eyebrow ? (
              <span className="text-xs uppercase tracking-wider text-text-secondary">
                {eyebrow}
              </span>
            ) : null}
            <BaseDialog.Title className="text-2xl font-semibold leading-9 text-text-primary truncate">
              {title}
            </BaseDialog.Title>
          </div>
          <BaseDialog.Close
            render={
              <Button
                variant="ghost"
                size="md"
                aria-label="Close"
                leadingIcon={<IconClose />}
              >
                <span className="sr-only">Close</span>
              </Button>
            }
          />
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>

        {footer ? (
          <footer className="border-t-2 border-border-tertiary px-8 py-4 flex items-center justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>
)
