// Ports: MediaPlayer + playAyat / playSurahFrom logic (MainActivity.kt:466-560)
import { useCallback, useEffect, useRef, useState } from 'react'

// Synchronous ref update pattern — avoids stale closure in onended handler
import { audioUrl } from '../data/config.ts'

interface UseAudioOptions {
  surahId: number
  currentAyatId: number
  totalAyats: number
  onAutoTrack: (surah: number, ayat: number) => void
}

export interface AudioState {
  playing: boolean
  activeSurah: number | null
  activeAyat: number | null
  isSurahMode: boolean
  autoTracking: boolean
}

export interface AudioActions {
  playAyat: (surah: number, ayat: number) => void
  playSurahFrom: (surah: number, ayat: number) => void
  togglePlay: () => void
  toggleAutoTracking: () => void
  disableAutoTracking: () => void
  isPlayingAyat: (surah: number, ayat: number) => boolean
}

export function useAudio({
  surahId,
  currentAyatId,
  totalAyats,
  onAutoTrack,
}: UseAudioOptions): [AudioState, AudioActions] {
  const audioEl = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [activeSurah, setActiveSurah] = useState<number | null>(null)
  const [activeAyat, setActiveAyat] = useState<number | null>(null)
  const [isSurahMode, setIsSurahMode] = useState(false)
  const [autoTracking, setAutoTracking] = useState(false)

  // Refs so onended closure always sees latest values without re-attaching.
  // Updated synchronously on every render (not via useEffect) to eliminate
  // the async gap where onended could read a stale value.
  const surahModeRef = useRef(false)
  const activeSurahRef = useRef<number | null>(null)
  const activeAyatRef = useRef<number | null>(null)
  const autoTrackingRef = useRef(false)
  const totalAyatsRef = useRef(totalAyats)
  const onAutoTrackRef = useRef(onAutoTrack)

  totalAyatsRef.current = totalAyats
  onAutoTrackRef.current = onAutoTrack
  autoTrackingRef.current = autoTracking

  function getAudio() {
    if (!audioEl.current) {
      const el = new Audio()
      el.onended = () => {
        if (!surahModeRef.current) {
          setPlaying(false)
          return
        }
        const nextAyat = (activeAyatRef.current ?? 0) + 1
        if (nextAyat > totalAyatsRef.current) {
          setPlaying(false)
          surahModeRef.current = false
          setIsSurahMode(false)
          return
        }
        const s = activeSurahRef.current!
        activeAyatRef.current = nextAyat
        setActiveAyat(nextAyat)
        if (autoTrackingRef.current) {
          onAutoTrackRef.current(s, nextAyat)
        }
        el.src = audioUrl(s, nextAyat)
        el.play().catch(() => { setPlaying(false) })
      }
      audioEl.current = el
    }
    return audioEl.current
  }

  const startPlayback = useCallback((surah: number, ayat: number, surahMode: boolean) => {
    const el = getAudio()
    el.pause()
    el.src = audioUrl(surah, ayat)

    activeSurahRef.current = surah
    activeAyatRef.current = ayat
    surahModeRef.current = surahMode

    setActiveSurah(surah)
    setActiveAyat(ayat)
    setIsSurahMode(surahMode)
    setPlaying(true)

    el.play().catch(() => { setPlaying(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const playAyat = useCallback((surah: number, ayat: number) => {
    startPlayback(surah, ayat, false)
    setAutoTracking(false)
  }, [startPlayback])

  // "Play from here" enables auto-tracking (MainActivity.kt:1636)
  const playSurahFrom = useCallback((surah: number, ayat: number) => {
    startPlayback(surah, ayat, true)
    setAutoTracking(true)
  }, [startPlayback])

  const togglePlay = useCallback(() => {
    const el = audioEl.current
    if (playing && el) {
      el.pause()
      setPlaying(false)
    } else if (!playing && el && activeSurahRef.current !== null) {
      el.play().catch(() => {})
      setPlaying(true)
    } else {
      // No prior audio — start surah from current page ayat
      startPlayback(surahId, currentAyatId, true)
    }
  }, [playing, surahId, currentAyatId, startPlayback])

  const toggleAutoTracking = useCallback(() => {
    setAutoTracking((prev) => !prev)
  }, [])

  // User dragging the pager kills auto-tracking (MainActivity.kt:383)
  const disableAutoTracking = useCallback(() => {
    setAutoTracking(false)
  }, [])

  const isPlayingAyat = useCallback(
    (surah: number, ayat: number) =>
      playing && activeSurah === surah && activeAyat === ayat,
    [playing, activeSurah, activeAyat],
  )

  // Snap to the playing ayat's page the moment tracking turns on, matching
  // Android's effect keyed on isAutoTracking (MainActivity.kt:388). Per-track
  // scroll during playback is handled inside the onended handler.
  useEffect(() => {
    if (autoTracking && playing && activeSurahRef.current !== null && activeAyatRef.current !== null) {
      onAutoTrackRef.current(activeSurahRef.current, activeAyatRef.current)
    }
  }, [autoTracking, playing])

  // Pause when surah changes (user navigated away); reset tracking (MainActivity.kt:674)
  useEffect(() => {
    if (activeSurahRef.current !== null && activeSurahRef.current !== surahId) {
      audioEl.current?.pause()
      setPlaying(false)
      setActiveSurah(null)
      setActiveAyat(null)
      activeSurahRef.current = null
      surahModeRef.current = false
    }
    setAutoTracking(false)
  }, [surahId])

  // Cleanup on unmount
  useEffect(() => () => { audioEl.current?.pause() }, [])

  const state: AudioState = { playing, activeSurah, activeAyat, isSurahMode, autoTracking }
  const actions: AudioActions = { playAyat, playSurahFrom, togglePlay, toggleAutoTracking, disableAutoTracking, isPlayingAyat }
  return [state, actions]
}
