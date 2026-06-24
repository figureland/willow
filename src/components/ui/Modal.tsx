import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import { IconClose } from './icons'

export type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible title (announced by screen readers, rendered in the header). */
  title: ReactNode
  /** Optional eyebrow rendered above the title. */
  eyebrow?: ReactNode
  /** Optional descriptive line under the title. */
  description?: ReactNode
  /**
   * Max width as a CSS value. Defaults to 640px — bump for content-heavy
   * dialogs (e.g. 720 / 880). The dialog still clamps to 92vw.
   */
  maxWidth?: string
  /** Sticky footer (e.g. action bar). */
  footer?: ReactNode
  /**
   * Optional bar rendered flush against the top edge of the modal — useful
   * for a thin progress indicator that should sit above the header.
   */
  topBar?: ReactNode
  children: ReactNode
}

/**
 * Centred overlay dialog built on Base UI's accessible Dialog primitive.
 * Mirrors the SideSheet's chrome — same title pattern, close button, and
 * sticky footer — but rendered as a centred card instead of a right-edge
 * panel. Use for confirmation flows, focused review tasks, and short forms.
 */
export const Modal = ({
  open,
  onOpenChange,
  title,
  eyebrow,
  description,
  maxWidth = '640px',
  footer,
  topBar,
  children,
}: ModalProps) => (
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
          'fixed inset-0 z-50 m-auto flex max-h-[90vh] flex-col overflow-hidden',
          'bg-bg-primary rounded-xl border-2 border-border-tertiary shadow-xl',
          'outline-none',
          'transition-[opacity,transform] duration-200 ease-out',
          'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
          'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
        )}
        style={{ width: '92vw', maxWidth }}
      >
        {topBar}
        <header className="flex items-start gap-4 px-6 py-5 border-b-2 border-border-tertiary">
          <div className="flex flex-1 min-w-0 flex-col gap-1">
            {eyebrow ? (
              <span className="text-sm font-semibold text-text-secondary">
                {eyebrow}
              </span>
            ) : null}
            <BaseDialog.Title className="text-xl font-semibold leading-7 text-text-primary">
              {title}
            </BaseDialog.Title>
            {description ? (
              <BaseDialog.Description className="text-md text-text-secondary">
                {description}
              </BaseDialog.Description>
            ) : null}
          </div>
          <BaseDialog.Close
            aria-label="Close"
            className={clsx(
              'mt-1 grid size-8 shrink-0 place-items-center rounded-md',
              'text-icon-secondary hover:bg-bg-secondary hover:text-text-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sandy-600/40',
            )}
          >
            <IconClose size={18} />
          </BaseDialog.Close>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          <footer className="border-t-2 border-border-tertiary px-6 py-4 flex items-center justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>
)
