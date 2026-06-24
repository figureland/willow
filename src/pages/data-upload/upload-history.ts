/* -------------------------------------------------------------------------- */
/* Upload history — shared mock data                                           */
/* -------------------------------------------------------------------------- */

/**
 * Each upload is treated as a "transaction" against the Sandy database — a
 * single commit that adds, edits or deletes a set of records. The history
 * page renders these as a vertical timeline; the summary page renders the
 * per-record changes inside one entry.
 */

import type { ActionKind } from './ActionCell'

export type UploadStatus = 'committed' | 'partial' | 'reverted'

/** What happened to a single record inside an upload — reuses the Refine-data
 * action vocabulary so the summary table speaks the same language. */
export type ChangeAction = ActionKind

/** One row in the per-upload summary table. */
export type ChangeRow = {
  id: string
  action: ChangeAction
  /** Domain entity touched by this change (e.g. "Field", "Operation"). */
  entity: string
  /** Free-text name/identifier so the user can recognise the record. */
  record: string
  farm: string
  /** Short freeform description of what specifically changed. */
  detail: string
}

/** Format Sandy detected on the source file. Drives the Type column label. */
export type FileFormat = 'csv' | 'excel' | 'pdf' | 'excel-template'

/** How Sandy turned the file into records. Drives the "Parsed as" column. */
export type ParseMethod =
  | 'sheet-detection'
  | 'sandy-template'
  | 'column-mapping'
  | 'pdf-extraction'

export type UploadFile = {
  id: string
  /** Original file name as uploaded. */
  filename: string
  format: FileFormat
  /** File size in bytes — rendered short ("1.2 MB" etc). */
  sizeBytes: number
  parsedAs: ParseMethod
  /** Mock download URL for the file. */
  downloadUrl: string
}

export type UploadEntry = {
  id: string
  title: string
  /** Brief one-line description of what was in the upload. */
  summary: string
  committedBy: string
  /** ISO datetime — drives both the absolute timestamp and the day grouping. */
  committedAt: string
  records: number
  files: number
  status: UploadStatus
  /** Per-record changes — drives the summary page's data table. */
  changes: ChangeRow[]
  /** Source files uploaded as part of this transaction. */
  sourceFiles: UploadFile[]
}

const change = (
  id: string,
  action: ChangeAction,
  entity: string,
  record: string,
  farm: string,
  detail: string,
): ChangeRow => ({ id, action, entity, record, farm, detail })

const file = (
  id: string,
  filename: string,
  format: FileFormat,
  sizeBytes: number,
  parsedAs: ParseMethod,
): UploadFile => ({
  id,
  filename,
  format,
  sizeBytes,
  parsedAs,
  downloadUrl: `#/mock-download/${id}`,
})

export const UPLOAD_HISTORY: UploadEntry[] = [
  {
    id: 'upload-1',
    title: 'Autumn 2026 sowing plan',
    summary: '6 farms · winter wheat & OSR cropping plan',
    committedBy: 'Toby Bates',
    committedAt: '2026-06-12T14:32:00Z',
    records: 312,
    files: 4,
    status: 'committed',
    changes: [
      change(
        'c1-1',
        'add',
        'Cropping plan',
        'Heron Lea · Long Meadow',
        'Heron Lea',
        'Winter wheat (Crusoe) · 24.6 ha',
      ),
      change(
        'c1-2',
        'add',
        'Cropping plan',
        'Heron Lea · Brook Field',
        'Heron Lea',
        'Winter OSR (Aurelia) · 18.2 ha',
      ),
      change(
        'c1-3',
        'edit',
        'Field',
        'Westhill · Top Hill',
        'Westhill',
        'Area corrected 12.1 → 12.4 ha',
      ),
      change(
        'c1-4',
        'add',
        'Cropping plan',
        'Westhill · Five Acre',
        'Westhill',
        'Winter wheat (Skyfall) · 5.1 ha',
      ),
      change(
        'c1-5',
        'edit',
        'Field',
        'Glenford · Far Riggs',
        'Glenford',
        'Renamed from "Far Rigg"',
      ),
    ],
    sourceFiles: [
      file(
        'f1-1',
        'autumn-2026-sowing-plan.xlsx',
        'excel',
        184_320,
        'sheet-detection',
      ),
      file('f1-2', 'heron-lea-field-list.csv', 'csv', 12_480, 'column-mapping'),
      file('f1-3', 'westhill-field-areas.csv', 'csv', 9_872, 'column-mapping'),
      file('f1-4', 'agronomist-notes.pdf', 'pdf', 412_006, 'pdf-extraction'),
    ],
  },
  {
    id: 'upload-2',
    title: 'May fertiliser applications',
    summary: '218 applications · 4 farms · NPK + urea',
    committedBy: 'Sarah Holt',
    committedAt: '2026-06-03T09:14:00Z',
    records: 218,
    files: 2,
    status: 'committed',
    changes: [
      change(
        'c2-1',
        'add',
        'Operation',
        'Heron Lea · Long Meadow — 14 May',
        'Heron Lea',
        'NPK 20-10-10 · 220 kg/ha',
      ),
      change(
        'c2-2',
        'add',
        'Operation',
        'Heron Lea · Brook Field — 16 May',
        'Heron Lea',
        'Urea (46%) · 180 kg/ha',
      ),
      change(
        'c2-3',
        'add',
        'Operation',
        'Westhill · Top Hill — 18 May',
        'Westhill',
        'NPK 20-10-10 · 240 kg/ha',
      ),
    ],
    sourceFiles: [
      file(
        'f2-1',
        'may-fertiliser-applications.xlsx',
        'excel-template',
        96_200,
        'sandy-template',
      ),
      file(
        'f2-2',
        'urea-delivery-receipts.pdf',
        'pdf',
        248_512,
        'pdf-extraction',
      ),
    ],
  },
  {
    id: 'upload-3',
    title: 'Soil sample results — spring round',
    summary: '46 lab results · 3 farms · awaiting pH re-check',
    committedBy: 'Toby Bates',
    committedAt: '2026-05-28T16:48:00Z',
    records: 46,
    files: 1,
    status: 'partial',
    changes: [
      change(
        'c3-1',
        'add',
        'Soil sample',
        'Heron Lea · Long Meadow',
        'Heron Lea',
        'pH 6.2 · P 18 · K 142',
      ),
      change(
        'c3-2',
        'add',
        'Soil sample',
        'Glenford · Far Riggs',
        'Glenford',
        'pH 5.4 · flagged for re-check',
      ),
      change(
        'c3-3',
        'edit',
        'Soil sample',
        'Westhill · Top Hill',
        'Westhill',
        'pH 7.1 (overwrote 2025 reading)',
      ),
    ],
    sourceFiles: [
      file(
        'f3-1',
        'NRM-soil-results-spring-2026.pdf',
        'pdf',
        1_280_400,
        'pdf-extraction',
      ),
    ],
  },
  {
    id: 'upload-4',
    title: 'Q1 fuel & energy ledger',
    summary: '184 records · red diesel, electricity, gas',
    committedBy: 'James Whitfield',
    committedAt: '2026-05-14T11:02:00Z',
    records: 184,
    files: 3,
    status: 'committed',
    changes: [
      change(
        'c4-1',
        'add',
        'Fuel entry',
        'Heron Lea — January',
        'Heron Lea',
        'Red diesel · 4,820 L',
      ),
      change(
        'c4-2',
        'add',
        'Energy entry',
        'Westhill — Q1',
        'Westhill',
        'Electricity · 18,400 kWh',
      ),
      change(
        'c4-3',
        'edit',
        'Fuel entry',
        'Glenford — March',
        'Glenford',
        'Volume corrected 1,200 → 1,260 L',
      ),
    ],
    sourceFiles: [
      file('f4-1', 'red-diesel-log-q1.csv', 'csv', 22_100, 'column-mapping'),
      file(
        'f4-2',
        'electricity-meter-readings.xlsx',
        'excel',
        58_900,
        'sheet-detection',
      ),
      file('f4-3', 'gas-bills-q1.pdf', 'pdf', 312_400, 'pdf-extraction'),
    ],
  },
  {
    id: 'upload-5',
    title: 'Heron Lea livestock movements',
    summary: '92 movements · cattle & sheep · reverted after audit',
    committedBy: 'Sarah Holt',
    committedAt: '2026-04-30T15:20:00Z',
    records: 92,
    files: 1,
    status: 'reverted',
    changes: [
      change(
        'c5-1',
        'delete',
        'Livestock movement',
        'Heron Lea — 12 Apr (cattle)',
        'Heron Lea',
        'Reverted: duplicate of CPH-2841',
      ),
      change(
        'c5-2',
        'delete',
        'Livestock movement',
        'Heron Lea — 18 Apr (sheep)',
        'Heron Lea',
        'Reverted: wrong CPH number',
      ),
    ],
    sourceFiles: [
      file(
        'f5-1',
        'heron-lea-livestock-april.xlsx',
        'excel',
        76_400,
        'sheet-detection',
      ),
    ],
  },
  {
    id: 'upload-6',
    title: 'March yield records',
    summary: '128 harvest entries · combined wheat & barley',
    committedBy: 'Toby Bates',
    committedAt: '2026-04-18T10:45:00Z',
    records: 128,
    files: 5,
    status: 'committed',
    changes: [
      change(
        'c6-1',
        'add',
        'Yield record',
        'Westhill · Five Acre',
        'Westhill',
        'Winter wheat · 8.4 t/ha',
      ),
      change(
        'c6-2',
        'add',
        'Yield record',
        'Heron Lea · Brook Field',
        'Heron Lea',
        'Spring barley · 6.1 t/ha',
      ),
      change(
        'c6-3',
        'edit',
        'Yield record',
        'Glenford · Far Riggs',
        'Glenford',
        'Moisture corrected 14.8 → 15.1%',
      ),
    ],
    sourceFiles: [
      file(
        'f6-1',
        'westhill-combine-export.csv',
        'csv',
        38_200,
        'column-mapping',
      ),
      file(
        'f6-2',
        'heron-lea-yield-monitor.csv',
        'csv',
        41_800,
        'column-mapping',
      ),
      file(
        'f6-3',
        'glenford-grain-weights.xlsx',
        'excel',
        62_500,
        'sheet-detection',
      ),
      file('f6-4', 'moisture-readings.pdf', 'pdf', 184_200, 'pdf-extraction'),
      file(
        'f6-5',
        'march-yield-summary.xlsx',
        'excel-template',
        88_700,
        'sandy-template',
      ),
    ],
  },
]

export const getUploadEntry = (id: string): UploadEntry | undefined =>
  UPLOAD_HISTORY.find((u) => u.id === id)
