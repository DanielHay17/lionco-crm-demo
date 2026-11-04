import type { AppState } from './types'

export const STORAGE_KEY = 'lionco-crm-demo:v2'

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AppState
    if (
      s?.version !== 1 ||
      !Array.isArray(s.jobs) ||
      !s.jobs.every((j) => j.serviceType) ||
      !Array.isArray(s.expenses) ||
      !Array.isArray(s.catalogue) ||
      !Array.isArray(s.people) ||
      typeof s.checklists !== 'object' ||
      s.checklists === null
    )
      return null
    return s
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
