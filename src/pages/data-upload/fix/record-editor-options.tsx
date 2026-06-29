import type { SelectItems } from '../../../components/ui'
import { FARMS, FIELDS, getFieldsForFarm } from '../../../data'
import type { CroppingRecord, OperationRecord } from './fix-records'

/* -------------------------------------------------------------------------- */
/* Sandy-data-backed option lists for the record editor                       */
/* -------------------------------------------------------------------------- */

/**
 * Flat list of every farm — drives the Farm dropdown in the record editor.
 */
export const farmItems: SelectItems = FARMS.map((farm) => ({
  value: farm.id,
  label: farm.name,
}))

/**
 * Field options scoped to a given farm — drives the Field dropdown once the
 * user has picked the parent farm. Returns an empty list when the farm id is
 * blank so the dropdown shows a "pick a farm first" placeholder.
 */
export const fieldItemsForFarm = (farmId: string): SelectItems => {
  if (!farmId) return []
  return getFieldsForFarm(farmId).map((field) => ({
    value: field.id,
    label: field.name,
  }))
}

/** Resolve the farm id whose name matches the row, or '' when unknown. */
export const farmIdForRow = (row: { farmName: string }): string =>
  FARMS.find((f) => f.name === row.farmName)?.id ?? ''

/** Resolve the field id under that farm whose name matches the row. */
export const fieldIdForRow = (row: {
  farmName: string
  fieldName: string
}): string => {
  const farmId = farmIdForRow(row)
  if (!farmId) return ''
  return (
    FIELDS.find((f) => f.farmId === farmId && f.name === row.fieldName)?.id ??
    ''
  )
}

/** Names to write back onto the row once the user has confirmed a pair. */
export const farmFieldPatchByIds = <
  Row extends { farmName: string; fieldName: string },
>(
  farmId: string,
  fieldId: string,
): Partial<Row> | undefined => {
  const farm = FARMS.find((f) => f.id === farmId)
  const field = FIELDS.find((f) => f.id === fieldId)
  if (!farm || !field) return undefined
  return { farmName: farm.name, fieldName: field.name } as Partial<Row>
}

/* -------------------------------------------------------------------------- */
/* Type vocabularies                                                           */
/* -------------------------------------------------------------------------- */

export const CROP_TYPE_ITEMS: SelectItems = [
  { value: 'Main crop', label: 'Main crop' },
  { value: 'Cover crop', label: 'Cover crop' },
]

/**
 * Operation types are scoped by operation group — return the list of
 * canonical types observed for a given group in the operations dataset.
 *
 * We don't have a separate Sandy vocabulary for these yet, so the list comes
 * from the same fixtures that drive the data table. When the user edits a
 * single row we can show only that row's group's types; for multi-edit we
 * fall back to every observed type across the selection.
 */
export const operationTypeItemsFor = (
  rows: Pick<OperationRecord, 'operationType'>[],
): SelectItems => {
  const types = new Set<string>()
  for (const r of rows) {
    if (r.operationType) types.add(r.operationType)
  }
  return [...types]
    .sort((a, b) => a.localeCompare(b))
    .map((t) => ({ value: t, label: t }))
}

/* -------------------------------------------------------------------------- */
/* Shared type-narrowing helpers used by the field schemas                     */
/* -------------------------------------------------------------------------- */

export const cropTypeItems = CROP_TYPE_ITEMS

export type EditableCroppingRecord = CroppingRecord
