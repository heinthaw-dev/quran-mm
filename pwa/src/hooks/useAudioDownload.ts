import { useCallback, useEffect, useRef, useState } from 'react'
import { downloadSurahsAudio, type DownloadProgress, type SurahDownloadJob } from '../data/audioDownload.ts'
import { getCachedAyatCounts } from '../data/audioCache.ts'

export interface UseAudioDownload {
  downloadedCounts: Map<number, number>
  progress: DownloadProgress | null
  downloading: boolean
  paused: boolean
  error: Error | null
  start: (surahs: SurahDownloadJob[]) => Promise<void>
  togglePause: () => void
  stop: () => void
}

export function useAudioDownload(): UseAudioDownload {
  const [downloadedCounts, setDownloadedCounts] = useState<Map<number, number>>(new Map())
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pausedRef = useRef(false)

  const refresh = useCallback(async () => {
    setDownloadedCounts(await getCachedAyatCounts())
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const start = useCallback(
    async (surahs: SurahDownloadJob[]) => {
      const controller = new AbortController()
      abortRef.current = controller
      pausedRef.current = false
      setPaused(false)
      setDownloading(true)
      setError(null)
      setProgress({
        surahIndex: 0,
        surahTotal: surahs.length,
        currentSurahId: 0,
        ayatDone: 0,
        ayatTotal: 0,
        etaSeconds: null,
      })
      try {
        await downloadSurahsAudio(surahs, setProgress, controller.signal, () => pausedRef.current)
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setError(e instanceof Error ? e : new Error(String(e)))
        }
      } finally {
        await refresh()
        setDownloading(false)
        setPaused(false)
        pausedRef.current = false
        abortRef.current = null
      }
    },
    [refresh],
  )

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
  }, [])

  const stop = useCallback(() => {
    pausedRef.current = false
    abortRef.current?.abort()
  }, [])

  return { downloadedCounts, progress, downloading, paused, error, start, togglePause, stop }
}
