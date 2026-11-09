import { migrateState } from './migrate'
import type { AppState } from './types'

/** Unchanged key: v1 (MVP) data stored here is migrated forward on load, not discarded. */
export const STORAGE_KEY = 'lionco-crm-demo:v2'

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return migrateState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable (private mode / quota) — demo keeps working in memory */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
