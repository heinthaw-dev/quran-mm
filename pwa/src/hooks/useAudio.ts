// Ports: MediaPlayer + playAyat / playSurahFrom logic (MainActivity.kt:466-560)
import { useCallback, useEffect, useRef, useState } from 'react'

// Synchronous ref update pattern — avoids stale closure in onended handler
import { getAudioObjectUrl } from '../data/audioCache.ts'

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
  /** Ayat whose single-ayat audio is loaded, i.e. Android's loadedAyatIndex
   *  (MainActivity.kt:784). Gates the card's "play surah from here" button. */
  loadedAyat: number | null
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
  const [loadedAyat, setLoadedAyat] = useState<number | null>(null)

  // Refs so onended closure always sees latest values without re-attaching.
  // Updated synchronously on every render (not via useEffect) to eliminate
  // the async gap where onended could read a stale value.
  const surahModeRef = useRef(false)
  const activeSurahRef = useRef<number | null>(null)
  const activeAyatRef = useRef<number | null>(null)
  const autoTrackingRef = useRef(false)
  const totalAyatsRef = useRef(totalAyats)
  const onAutoTrackRef = useRef(onAutoTrack)
  // The blob URL currently assigned to the element, revoked when replaced.
  const objectUrlRef = useRef<string | null>(null)
  // Bumped per load so a stale fetch can't overwrite a newer one's src.
  const loadGenRef = useRef(0)

  totalAyatsRef.current = totalAyats
  onAutoTrackRef.current = onAutoTrack
  autoTrackingRef.current = autoTracking

  // Fetch the ayat (cache first), swap the element's src to a blob URL, play.
  const loadAndPlay = useCallback(async (el: HTMLAudioElement, surah: number, ayat: number) => {
    const gen = ++loadGenRef.current
    try {
      const objectUrl = await getAudioObjectUrl(surah, ayat)
      if (gen !== loadGenRef.current) {
        URL.revokeObjectURL(objectUrl)
        return
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = objectUrl
      el.src = objectUrl
      await el.play()
    } catch {
      if (gen === loadGenRef.current) setPlaying(false)
    }
  }, [])

  function getAudio() {
    if (!audioEl.current) {
      const el = new Audio()
      el.onended = () => {
        if (!surahModeRef.current) {
          setPlaying(false)
          // Track finished: the card's "play surah from here" button greys out
          // again (MainActivity.kt:326-329)
          setLoadedAyat(null)
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
        void loadAndPlay(el, s, nextAyat)
      }
      audioEl.current = el
    }
    return audioEl.current
  }

  const startPlayback = useCallback((surah: number, ayat: number, surahMode: boolean) => {
    const el = getAudio()
    el.pause()

    activeSurahRef.current = surah
    activeAyatRef.current = ayat
    surahModeRef.current = surahMode

    setActiveSurah(surah)
    setActiveAyat(ayat)
    setIsSurahMode(surahMode)
    setPlaying(true)

    void loadAndPlay(el, surah, ayat)
  }, [loadAndPlay]) // eslint-disable-line react-hooks/exhaustive-deps

  const playAyat = useCallback((surah: number, ayat: number) => {
    startPlayback(surah, ayat, false)
    setAutoTracking(false)
    // Arms this ayat's "play surah from here" button (MainActivity.kt:784)
    setLoadedAyat(ayat)
  }, [startPlayback])

  // "Play from here" restarts at this ayat as a surah playlist and enables
  // auto-tracking; it also clears loadedAyatIndex (MainActivity.kt:1611-1614)
  const playSurahFrom = useCallback((surah: number, ayat: number) => {
    startPlayback(surah, ayat, true)
    setAutoTracking(true)
    setLoadedAyat(null)
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
      setLoadedAyat(null)
    }
    setAutoTracking(false)
  }, [surahId])

  // Cleanup on unmount
  useEffect(() => () => {
    audioEl.current?.pause()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const state: AudioState = { playing, activeSurah, activeAyat, isSurahMode, autoTracking, loadedAyat }
  const actions: AudioActions = { playAyat, playSurahFrom, togglePlay, toggleAutoTracking, disableAutoTracking, isPlayingAyat }
  return [state, actions]
}
