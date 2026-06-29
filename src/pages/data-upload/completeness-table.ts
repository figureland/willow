/* -------------------------------------------------------------------------- */
/* CompletenessTable — shared shape for the imputation preview tables          */
/* -------------------------------------------------------------------------- */

export type CompletenessChange =
  | { kind: 'add-cell'; rowId: string; column: string; value: string }
  | {
      kind: 'edit-cell'
      rowId: string
      column: string
      oldValue: string
      newValue: string
    }
  | { kind: 'remove-row'; rowId: string }
  | { kind: 'add-row'; rowId: string; cells: Record<string, string> }

export type CompletenessColumn = {
  key: string
  label: string
  numeric?: boolean
}

export type CompletenessTableRow = {
  id: string
  cells: Record<string, string>
}

export type CompletenessTable = {
  /** Section title shown above the grid, e.g. "Operations · Long Bottom". */
  title: string
  columns: CompletenessColumn[]
  /**
   * The user's existing rows for the affected scope (may be empty when Sandy
   * is reconstructing a whole table from scratch).
   */
  rows: CompletenessTableRow[]
  /** Changes Sandy will apply on accept. */
  changes: CompletenessChange[]
}
