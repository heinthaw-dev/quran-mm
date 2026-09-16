import { useState, useCallback } from 'react'
import { loadPrefs, savePrefs } from '../data/prefs.ts'
import type { AppPrefs } from '../data/types.ts'

export function usePrefs(): { prefs: AppPrefs; update: (patch: Partial<AppPrefs>) => void } {
  const [prefs, setPrefs] = useState<AppPrefs>(loadPrefs)

  const update = useCallback((patch: Partial<AppPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  return { prefs, update }
}
