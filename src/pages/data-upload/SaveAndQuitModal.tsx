import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Button, Modal, TextInput } from '../../components/ui'

/* -------------------------------------------------------------------------- */
/* Save-and-quit confirmation                                                  */
/* -------------------------------------------------------------------------- */

export type SaveAndQuitModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-filled session name. Falls back to "Untitled" when blank. */
  suggestedName: string
  /** Called when the user confirms the save. Receives the final name. */
  onSave: (name: string) => void
  /** Called when the user confirms the destructive discard. */
  onDiscard: () => void
}

export const SaveAndQuitModal = ({
  open,
  onOpenChange,
  suggestedName,
  onSave,
  onDiscard,
}: SaveAndQuitModalProps) => {
  const [name, setName] = useState(suggestedName)
  const [discardOpen, setDiscardOpen] = useState(false)

  // Reset to the suggested name whenever the modal re-opens, so a previous
  // edit doesn't bleed into the next attempt.
  useEffect(() => {
    if (open) setName(suggestedName)
  }, [open, suggestedName])

  const trimmed = name.trim()
  const finalName = trimmed.length > 0 ? trimmed : 'Untitled'

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Save upload session"
        description="Pick up where you left off later — your progress and unresolved issues will be waiting."
        maxWidth="520px"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="destructive" onClick={() => setDiscardOpen(true)}>
              Discard
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => onSave(finalName)}>
                Save and quit
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <TextInput
            label="Session name"
            value={name}
            onValueChange={setName}
            placeholder="Untitled"
            autoFocus
          />
        </div>
      </Modal>

      <BaseDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
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
              'fixed inset-0 z-50 m-auto h-fit w-[92vw] max-w-[380px]',
              'flex flex-col gap-4 rounded-xl border-2 border-border-tertiary bg-bg-primary p-5 shadow-xl outline-none',
              'transition-[opacity,transform] duration-150 ease-out',
              'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
              'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
            )}
          >
            <BaseDialog.Title className="text-md font-semibold text-text-primary">
              Discard upload?
            </BaseDialog.Title>
            <BaseDialog.Description className="text-sm text-text-secondary">
              You'll lose any unsaved progress. This can't be undone.
            </BaseDialog.Description>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
                No, keep editing
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setDiscardOpen(false)
                  onDiscard()
                }}
              >
                Yes, discard
              </Button>
            </div>
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </>
  )
}
