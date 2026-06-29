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

      <Modal
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard upload?"
        description="You'll lose any unsaved progress. This can't be undone."
        maxWidth="380px"
        footer={
          <>
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
          </>
        }
      >
        <div className="sr-only" />
      </Modal>
    </>
  )
}
