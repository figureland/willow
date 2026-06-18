import { useCallback, useEffect, useState } from 'react'

const isBrowser = typeof window !== 'undefined'

/**
 * Drop-in replacement for `useState` that mirrors its value to
 * `localStorage` under the given key. The state survives full navigations
 * and page refreshes, and any number of consumers reading the same key in
 * the same tab stay in sync via the `storage` event.
 *
 * `value` is JSON-encoded, so it must be JSON-serialisable. Decoding errors
 * fall back to `initial`.
 */
export const useLocalStorageState = <T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] => {
  const read = useCallback((): T => {
    if (!isBrowser) return initial
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  }, [key, initial])

  const [value, setValue] = useState<T>(read)

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        if (isBrowser) {
          try {
            window.localStorage.setItem(key, JSON.stringify(resolved))
          } catch {
            // Ignore quota / private-mode errors — the in-memory value still
            // updates so the UI stays responsive.
          }
        }
        return resolved
      })
    },
    [key],
  )

  // Keep this hook in sync with writes from other consumers (e.g. a second
  // tab or another component reading the same key).
  useEffect(() => {
    if (!isBrowser) return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return
      try {
        setValue(JSON.parse(e.newValue) as T)
      } catch {
        // ignore
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  return [value, update]
}
