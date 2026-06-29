import type { DraftStepId } from './IntroStep'

/* -------------------------------------------------------------------------- */
/* Draft sessions — persistent store backing the data-upload wizard           */
/*                                                                             */
/* Drafts live in localStorage so they survive page refreshes + reopens.      */
/* The store is tiny and self-contained: a JSON-encoded list of sessions, a   */
/* read helper, and a writer that upserts by id.                              */
/* -------------------------------------------------------------------------- */

export type DraftSession = {
  id: string
  /** Human label the user typed in the Save-and-quit modal. */
  title: string
  /** Wizard step the user was on when they saved. */
  resumeAt: DraftStepId
  /** Snapshot of the wizard state at save time — typed loosely on purpose;
   *  the caller knows what to do with it. */
  snapshot?: unknown
  /** ISO timestamp of the most recent save. */
  updatedAt: string
}

const STORAGE_KEY = 'willow.data-upload.drafts.v1'

const readAll = (): DraftSession[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DraftSession[]) : []
  } catch {
    return []
  }
}

const writeAll = (drafts: DraftSession[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
    // Notify same-tab listeners — the native `storage` event only fires
    // across tabs, but our IntroStep needs to re-read after a save in
    // this tab too.
    window.dispatchEvent(new Event('willow:drafts-changed'))
  } catch {
    /* swallow — quota errors etc. shouldn't crash the wizard. */
  }
}

export const listDrafts = (): DraftSession[] =>
  readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

export const getDraft = (id: string): DraftSession | null =>
  readAll().find((d) => d.id === id) ?? null

export const saveDraft = (
  draft: Omit<DraftSession, 'updatedAt'> & { updatedAt?: string },
) => {
  const all = readAll()
  const idx = all.findIndex((d) => d.id === draft.id)
  const next: DraftSession = {
    ...draft,
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  }
  if (idx >= 0) all[idx] = next
  else all.push(next)
  writeAll(all)
}

export const removeDraft = (id: string) => {
  writeAll(readAll().filter((d) => d.id !== id))
}

/**
 * Mint a session id. We don't use the title — two saves with the same
 * title still produce distinct drafts (the user can rename either later).
 */
export const newSessionId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/* -------------------------------------------------------------------------- */
/* React hook — re-renders when the draft list changes                         */
/* -------------------------------------------------------------------------- */

import { useEffect, useState } from 'react'

export const useDraftSessions = (): DraftSession[] => {
  const [drafts, setDrafts] = useState<DraftSession[]>(() => listDrafts())
  useEffect(() => {
    const refresh = () => setDrafts(listDrafts())
    window.addEventListener('willow:drafts-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('willow:drafts-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return drafts
}
