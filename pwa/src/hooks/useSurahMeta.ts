import { useState, useEffect } from 'react'
import { loadSurahMeta } from '../data/surah.ts'
import type { SurahMeta } from '../data/types.ts'

export function useSurahMeta(): { surahs: SurahMeta[]; loading: boolean; error: Error | null } {
  const [surahs, setSurahs] = useState<SurahMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadSurahMeta()
      .then(setSurahs)
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false))
  }, [])

  return { surahs, loading, error }
}
