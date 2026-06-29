import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { ANOMALIES, type Anomaly } from './anomalies'

/* -------------------------------------------------------------------------- */
/* AnomalyState — editable working copy for anomaly rows                       */
/* -------------------------------------------------------------------------- */

/**
 * Anomaly rows are reviewed and edited inline (spot anomalies) or on a
 * scoped detail page (trend / regional). The state lives at the wizard root
 * — exactly like `FixStateProvider` — so both surfaces share the same
 * working copy, the sticky save bar reads the same `hasUnsavedChanges`
 * flag, and a discard reverts to the last saved baseline.
 */

export type AnomalyCellValue = string | number
export type AnomalyRowMap = Record<string, AnomalyCellValue>

type AnomalyTable = {
  /** Live working copy, keyed by row id. */
  rows: Record<string, AnomalyRowMap>
  /** Baseline snapshot — restored on discard. */
  baseline: Record<string, AnomalyRowMap>
  /** Row ids edited since the last save. */
  editedIds: Set<string>
  /** Row ids flagged for removal — kept in the grid with a strikethrough. */
  removedIds: Set<string>
}

type AnomalyTables = Record<string, AnomalyTable>

type AnomalyState = {
  /** Live row map for a single anomaly. */
  rowsFor: (anomalyId: string) => Record<string, AnomalyRowMap>
  editedIdsFor: (anomalyId: string) => Set<string>
  removedIdsFor: (anomalyId: string) => Set<string>
  /** Apply a patch to a set of rows on the given anomaly. */
  patchRows: (
    anomalyId: string,
    ids: Iterable<string>,
    patch: AnomalyRowMap,
  ) => void
  /** Flag rows for removal — re-flagging is a no-op. */
  removeRows: (anomalyId: string, ids: Iterable<string>) => void
  /** Commit the working copy as the new baseline. */
  saveChanges: () => void
  /** Throw away the working copy, restore the last saved baseline. */
  discardChanges: () => void
  /** True when any anomaly has at least one pending edit or removal. */
  hasUnsavedChanges: boolean
}

const AnomalyStateContext = createContext<AnomalyState | null>(null)

export const useAnomalyState = (): AnomalyState => {
  const ctx = useContext(AnomalyStateContext)
  if (!ctx) {
    throw new Error(
      'useAnomalyState must be used inside an AnomalyStateProvider',
    )
  }
  return ctx
}

/** Build the initial per-anomaly table from the fixture data. */
const seedTables = (anomalies: Anomaly[]): AnomalyTables => {
  const out: AnomalyTables = {}
  for (const anomaly of anomalies) {
    const rows: Record<string, AnomalyRowMap> = {}
    for (const row of anomaly.rows) {
      // Spot rows carry both `cells` and a suggestedValue — the suggested
      // value isn't auto-applied; the user edits it themselves.
      rows[row.id] = { ...row.cells }
    }
    out[anomaly.id] = {
      rows,
      baseline: rows,
      editedIds: new Set(),
      removedIds: new Set(),
    }
  }
  return out
}

const EMPTY_ROW_MAP: Record<string, AnomalyRowMap> = {}
const EMPTY_ID_SET: Set<string> = new Set()

export const AnomalyStateProvider = ({ children }: { children: ReactNode }) => {
  const [tables, setTables] = useState<AnomalyTables>(() =>
    seedTables(ANOMALIES),
  )

  const rowsFor = useCallback(
    (anomalyId: string) => tables[anomalyId]?.rows ?? EMPTY_ROW_MAP,
    [tables],
  )
  const editedIdsFor = useCallback(
    (anomalyId: string) => tables[anomalyId]?.editedIds ?? EMPTY_ID_SET,
    [tables],
  )
  const removedIdsFor = useCallback(
    (anomalyId: string) => tables[anomalyId]?.removedIds ?? EMPTY_ID_SET,
    [tables],
  )

  const patchRows = useCallback(
    (anomalyId: string, ids: Iterable<string>, patch: AnomalyRowMap) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      setTables((curr) => {
        const table = curr[anomalyId]
        if (!table) return curr
        const nextRows: Record<string, AnomalyRowMap> = { ...table.rows }
        for (const id of idSet) {
          const existing = nextRows[id]
          if (!existing) continue
          nextRows[id] = { ...existing, ...patch }
        }
        const nextEdited = new Set(table.editedIds)
        for (const id of idSet) nextEdited.add(id)
        return {
          ...curr,
          [anomalyId]: {
            ...table,
            rows: nextRows,
            editedIds: nextEdited,
          },
        }
      })
    },
    [],
  )

  const removeRows = useCallback((anomalyId: string, ids: Iterable<string>) => {
    setTables((curr) => {
      const table = curr[anomalyId]
      if (!table) return curr
      const nextRemoved = new Set(table.removedIds)
      for (const id of ids) nextRemoved.add(id)
      return {
        ...curr,
        [anomalyId]: { ...table, removedIds: nextRemoved },
      }
    })
  }, [])

  const saveChanges = useCallback(() => {
    setTables((curr) => {
      const out: AnomalyTables = {}
      for (const [id, table] of Object.entries(curr)) {
        // Drop removed rows from both the working copy and the baseline so a
        // future discard can't bring them back.
        const trimmed: Record<string, AnomalyRowMap> = {}
        for (const [rowId, row] of Object.entries(table.rows)) {
          if (table.removedIds.has(rowId)) continue
          trimmed[rowId] = row
        }
        out[id] = {
          rows: trimmed,
          baseline: trimmed,
          editedIds: new Set(),
          removedIds: new Set(),
        }
      }
      return out
    })
  }, [])

  const discardChanges = useCallback(() => {
    setTables((curr) => {
      const out: AnomalyTables = {}
      for (const [id, table] of Object.entries(curr)) {
        out[id] = {
          rows: table.baseline,
          baseline: table.baseline,
          editedIds: new Set(),
          removedIds: new Set(),
        }
      }
      return out
    })
  }, [])

  const hasUnsavedChanges = useMemo(
    () =>
      Object.values(tables).some(
        (t) => t.editedIds.size > 0 || t.removedIds.size > 0,
      ),
    [tables],
  )

  const value: AnomalyState = {
    rowsFor,
    editedIdsFor,
    removedIdsFor,
    patchRows,
    removeRows,
    saveChanges,
    discardChanges,
    hasUnsavedChanges,
  }

  return (
    <AnomalyStateContext.Provider value={value}>
      {children}
    </AnomalyStateContext.Provider>
  )
}
