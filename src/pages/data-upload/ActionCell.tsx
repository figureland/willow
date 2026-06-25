import { Badge } from '../../components/ui'

/** Action kinds shown in the Refine / Summary tables. */
export type ActionKind = 'add' | 'edit' | 'delete'

export const ACTION_LABEL: Record<ActionKind, string> = {
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
}

export const ActionGlyph = ({ kind }: { kind: ActionKind }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    {kind === 'add' ? (
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    ) : null}
    {kind === 'edit' ? (
      <>
        <path
          d="M4 20h4l10-10-4-4L4 16v4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M14 6l4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    ) : null}
    {kind === 'delete' ? (
      <path
        d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : null}
  </svg>
)

export const ActionCell = ({ action }: { action: ActionKind }) => (
  <Badge tone="neutral" size="sm" icon={<ActionGlyph kind={action} />}>
    {ACTION_LABEL[action]}
  </Badge>
)
