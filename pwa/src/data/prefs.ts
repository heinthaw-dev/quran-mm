import type { AppPrefs } from './types.ts'
import { DEFAULT_PREFS } from './types.ts'

const KEY = 'app_prefs'

export function loadPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AppPrefs>) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: AppPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
