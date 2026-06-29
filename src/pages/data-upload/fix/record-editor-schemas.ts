import type { CroppingRecord, OperationRecord } from './fix-records'
import type { EditableField } from './RecordEditorSheet'
import { CROP_TYPE_ITEMS, operationTypeItemsFor } from './record-editor-options'

/* -------------------------------------------------------------------------- */
/* Shared editable field schemas for the RecordEditorSheet                    */
/* -------------------------------------------------------------------------- */

const parseNullableNumber = (raw: string): number | null | undefined => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

const parseNullableString = (raw: string): string | null | undefined => {
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Cropping schema with the Farm/Field pair locked. Used by the Field view +
 * Issues view, both of which preserve the existing farm/field context.
 */
export const CROPPING_FIELD_FIELDS: EditableField<CroppingRecord>[] = [
  {
    key: 'farmName',
    rowKey: 'farmName',
    label: 'Farm',
    readOnly: true,
  },
  {
    key: 'fieldName',
    rowKey: 'fieldName',
    label: 'Field',
    readOnly: true,
  },
  {
    key: 'harvestYear',
    rowKey: 'harvestYear',
    label: 'Year',
    fromInput: (v) => {
      const n = Number(v.trim())
      return Number.isFinite(n) ? n : undefined
    },
  },
  { key: 'cropName', rowKey: 'cropName', label: 'Crop' },
  {
    kind: 'select',
    key: 'cropType',
    rowKey: 'cropType',
    label: 'Type',
    items: CROP_TYPE_ITEMS,
    fromInput: parseNullableString,
  },
  {
    key: 'cropVariety',
    rowKey: 'cropVariety',
    label: 'Variety',
    fromInput: parseNullableString,
  },
  {
    key: 'workingArea',
    rowKey: 'workingArea',
    label: 'Area (ha)',
    fromInput: parseNullableNumber,
  },
  {
    key: 'tillage',
    rowKey: 'tillage',
    label: 'Tillage',
    fromInput: parseNullableString,
  },
  {
    key: 'yield',
    rowKey: 'yield',
    label: 'Yield (t/ha)',
    fromInput: parseNullableNumber,
  },
  {
    key: 'plantingDate',
    rowKey: 'plantingDate',
    label: 'Planting',
    fromInput: parseNullableString,
  },
  {
    key: 'harvestDate',
    rowKey: 'harvestDate',
    label: 'Harvest',
    fromInput: parseNullableString,
  },
  {
    key: 'totalYield',
    rowKey: 'totalYield',
    label: 'Total (t)',
    fromInput: parseNullableNumber,
  },
]

/** Operation schema with Farm/Field locked. The Type list is scoped to the
 *  records being edited (operation types vary per group). */
export const buildOperationFieldFields = (
  records: OperationRecord[],
): EditableField<OperationRecord>[] => [
  {
    key: 'farmName',
    rowKey: 'farmName',
    label: 'Farm',
    readOnly: true,
  },
  {
    key: 'fieldName',
    rowKey: 'fieldName',
    label: 'Field',
    readOnly: true,
  },
  {
    key: 'harvestYear',
    rowKey: 'harvestYear',
    label: 'Year',
    fromInput: (v) => {
      const n = Number(v.trim())
      return Number.isFinite(n) ? n : undefined
    },
  },
  { key: 'operationGroup', rowKey: 'operationGroup', label: 'Group' },
  {
    kind: 'select',
    key: 'operationType',
    rowKey: 'operationType',
    label: 'Type',
    items: operationTypeItemsFor(records),
  },
  {
    key: 'operationDate',
    rowKey: 'operationDate',
    label: 'Date',
    fromInput: parseNullableString,
  },
  {
    key: 'productName',
    rowKey: 'productName',
    label: 'Product',
    fromInput: parseNullableString,
  },
  {
    key: 'quantity',
    rowKey: 'quantity',
    label: 'Quantity',
    fromInput: parseNullableNumber,
  },
  {
    key: 'unit',
    rowKey: 'unit',
    label: 'Unit',
    fromInput: parseNullableString,
  },
  {
    key: 'appliedArea',
    rowKey: 'appliedArea',
    label: 'Applied (ha)',
    fromInput: parseNullableNumber,
  },
]
