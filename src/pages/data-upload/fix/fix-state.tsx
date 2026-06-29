import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  CROPPING_RECORDS,
  type CroppingRecord,
  classifyCropping,
  classifyOperation,
  OPERATION_RECORDS,
  type OperationRecord,
} from './fix-records'

/* -------------------------------------------------------------------------- */
/* FixStateContext — shared editable record state across the Fix step        */
/* -------------------------------------------------------------------------- */

/**
 * The Fix step is split across three views (Issues, Data Table, Field) plus a
 * top-bar toolbar AND the wizard's Next button — all of which need to read
 * and/or mutate the same editable record set. We lift that state to a context
 * mounted at the wizard root so:
 *
 *  - the toolbar can show/hide Save & Discard buttons,
 *  - the wizard can gate Next on "all issues resolved",
 *  - any record-aware view can highlight edited / removed rows,
 *  - the source-of-truth fixtures stay untouched so a discard reverts cleanly.
 */

type FixState = {
  /** Working copy of cropping records — reflects pending edits + deletions. */
  croppingRecords: CroppingRecord[]
  /** Working copy of operation records — same semantics. */
  operationRecords: OperationRecord[]
  /** Row ids that have been edited since the last save. */
  editedCroppingIds: Set<string>
  editedOperationIds: Set<string>
  /** Row ids the user has flagged for deletion — kept in the list visually. */
  removedCroppingIds: Set<string>
  removedOperationIds: Set<string>
  /**
   * Apply a patch to a set of cropping ids. By default marks each row as
   * edited (so the user has to Save). Pass `{ autoSave: true }` for fixes
   * that should be applied immediately (e.g. Sandy suggestions).
   */
  patchCropping: (
    ids: Iterable<string>,
    patch: Partial<CroppingRecord>,
    options?: { autoSave?: boolean },
  ) => void
  patchOperations: (
    ids: Iterable<string>,
    patch: Partial<OperationRecord>,
    options?: { autoSave?: boolean },
  ) => void
  /** Flag rows for removal. Re-flagging an already-removed row is a no-op. */
  removeCropping: (ids: Iterable<string>) => void
  removeOperations: (ids: Iterable<string>) => void
  /** Commit the working copy as the new baseline (clears edited + removed sets). */
  saveChanges: () => void
  /** Throw away the working copy and restore the last saved baseline. */
  discardChanges: () => void
  /** True when there's at least one edit or removal pending save. */
  hasUnsavedChanges: boolean
  /**
   * Aggregate of unresolved issues across the working copy — operates on the
   * post-edit, post-delete state so the gate reflects what the user is about
   * to commit. Removed rows count as resolved (they're going away).
   */
  unresolvedIssueCount: number
}

const FixStateContext = createContext<FixState | null>(null)

export const useFixState = (): FixState => {
  const ctx = useContext(FixStateContext)
  if (!ctx) {
    throw new Error('useFixState must be used inside a FixStateProvider')
  }
  return ctx
}

/**
 * Optional variant — returns null outside the provider. Use sparingly; the
 * default `useFixState` is preferred so consumers fail loudly when wiring up
 * a new view.
 */
export const useFixStateOptional = (): FixState | null =>
  useContext(FixStateContext)

export const FixStateProvider = ({ children }: { children: ReactNode }) => {
  // Working copies — start from the fixture data. Saves snapshot to baseline;
  // discards rewind to baseline.
  const [croppingRecords, setCroppingRecords] =
    useState<CroppingRecord[]>(CROPPING_RECORDS)
  const [operationRecords, setOperationRecords] =
    useState<OperationRecord[]>(OPERATION_RECORDS)

  // Saved baseline — what we restore on discard. Re-snapshotted on save.
  const [croppingBaseline, setCroppingBaseline] =
    useState<CroppingRecord[]>(CROPPING_RECORDS)
  const [operationBaseline, setOperationBaseline] =
    useState<OperationRecord[]>(OPERATION_RECORDS)

  const [editedCroppingIds, setEditedCroppingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [editedOperationIds, setEditedOperationIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [removedCroppingIds, setRemovedCroppingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [removedOperationIds, setRemovedOperationIds] = useState<Set<string>>(
    () => new Set(),
  )

  const patchCropping = useCallback(
    (
      ids: Iterable<string>,
      patch: Partial<CroppingRecord>,
      options: { autoSave?: boolean } = {},
    ) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const apply = (rows: CroppingRecord[]) =>
        rows.map((r) => {
          if (!idSet.has(r.id)) return r
          const merged = { ...r, ...patch }
          // Re-derive issues from the patched values so cells that were
          // missing/invalid stop tinting the moment the suggestion lands.
          return { ...merged, issues: classifyCropping(merged) }
        })
      setCroppingRecords(apply)
      // Suggestion-driven fixes are auto-saved — mutate the baseline too so
      // discard/save don't see them as pending changes. Manual edits go
      // through the regular `edited` set + save-changes flow.
      if (options.autoSave) {
        setCroppingBaseline(apply)
        return
      }
      setEditedCroppingIds((curr) => {
        const next = new Set(curr)
        for (const id of idSet) next.add(id)
        return next
      })
    },
    [],
  )

  const patchOperations = useCallback(
    (
      ids: Iterable<string>,
      patch: Partial<OperationRecord>,
      options: { autoSave?: boolean } = {},
    ) => {
      const idSet = new Set(ids)
      if (idSet.size === 0) return
      const apply = (rows: OperationRecord[]) =>
        rows.map((r) => {
          if (!idSet.has(r.id)) return r
          const merged = { ...r, ...patch }
          return { ...merged, issues: classifyOperation(merged) }
        })
      setOperationRecords(apply)
      if (options.autoSave) {
        setOperationBaseline(apply)
        return
      }
      setEditedOperationIds((curr) => {
        const next = new Set(curr)
        for (const id of idSet) next.add(id)
        return next
      })
    },
    [],
  )

  const removeCropping = useCallback((ids: Iterable<string>) => {
    setRemovedCroppingIds((curr) => {
      const next = new Set(curr)
      for (const id of ids) next.add(id)
      return next
    })
  }, [])

  const removeOperations = useCallback((ids: Iterable<string>) => {
    setRemovedOperationIds((curr) => {
      const next = new Set(curr)
      for (const id of ids) next.add(id)
      return next
    })
  }, [])

  const saveChanges = useCallback(() => {
    // Drop removed rows from the working copy first so they don't survive a
    // save → discard cycle if the user changes their mind later.
    const trimmedCropping = croppingRecords.filter(
      (r) => !removedCroppingIds.has(r.id),
    )
    const trimmedOperations = operationRecords.filter(
      (r) => !removedOperationIds.has(r.id),
    )
    setCroppingRecords(trimmedCropping)
    setOperationRecords(trimmedOperations)
    setCroppingBaseline(trimmedCropping)
    setOperationBaseline(trimmedOperations)
    setEditedCroppingIds(new Set())
    setEditedOperationIds(new Set())
    setRemovedCroppingIds(new Set())
    setRemovedOperationIds(new Set())
  }, [
    croppingRecords,
    operationRecords,
    removedCroppingIds,
    removedOperationIds,
  ])

  const discardChanges = useCallback(() => {
    setCroppingRecords(croppingBaseline)
    setOperationRecords(operationBaseline)
    setEditedCroppingIds(new Set())
    setEditedOperationIds(new Set())
    setRemovedCroppingIds(new Set())
    setRemovedOperationIds(new Set())
  }, [croppingBaseline, operationBaseline])

  const hasUnsavedChanges =
    editedCroppingIds.size > 0 ||
    editedOperationIds.size > 0 ||
    removedCroppingIds.size > 0 ||
    removedOperationIds.size > 0

  // Removed rows are considered resolved — they're not part of the import.
  // Edited rows still count their remaining issues (the patch might fix some
  // but not all; the prototype fixtures don't re-classify, so the count is a
  // pessimistic but stable proxy).
  const unresolvedIssueCount = useMemo(() => {
    let total = 0
    for (const r of croppingRecords) {
      if (removedCroppingIds.has(r.id)) continue
      // Edited rows are assumed resolved for gating purposes — the user has
      // touched them, so they own the resulting state.
      if (editedCroppingIds.has(r.id)) continue
      total += r.issues.length
    }
    for (const r of operationRecords) {
      if (removedOperationIds.has(r.id)) continue
      if (editedOperationIds.has(r.id)) continue
      total += r.issues.length
    }
    return total
  }, [
    croppingRecords,
    operationRecords,
    removedCroppingIds,
    removedOperationIds,
    editedCroppingIds,
    editedOperationIds,
  ])

  const value: FixState = {
    croppingRecords,
    operationRecords,
    editedCroppingIds,
    editedOperationIds,
    removedCroppingIds,
    removedOperationIds,
    patchCropping,
    patchOperations,
    removeCropping,
    removeOperations,
    saveChanges,
    discardChanges,
    hasUnsavedChanges,
    unresolvedIssueCount,
  }

  return (
    <FixStateContext.Provider value={value}>
      {children}
    </FixStateContext.Provider>
  )
}
