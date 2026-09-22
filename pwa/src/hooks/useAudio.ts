// Ports: MediaPlayer + playAyat / playSurahFrom logic (MainActivity.kt:466-560)
import { useCallback, useEffect, useRef, useState } from 'react'

// Synchronous ref update pattern — avoids stale closure in onended handler
import { getAudioObjectUrl } from '../data/audioCache.ts'

interface UseAudioOptions {
  surahId: number
  /** First ayat id of the surah — 0 for surah 1, whose ayat 0 is the Bismillah */
  firstAyat: number
  totalAyats: number
  onAutoTrack: (surah: number, ayat: number) => void
}

// The surah playlist opens with the Bismillah, always folder 001 whatever the
// surah is playing (MainActivity.kt:828-839).
const BISMILLAH_SURAH = 1
const BISMILLAH_AYAT = 0

// Surah 1 already carries 001000.mp3 as its own ayat 0, and surah 9 has no
// Bismillah at all (MainActivity.kt:828).
function hasBismillah(surah: number): boolean {
  return surah !== 1 && surah !== 9
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
  firstAyat,
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
  // The Bismillah head of the playlist is loaded; activeAyat already points at
  // the ayat that follows it, so the highlight rests there while it plays
  // (MainActivity.kt:834 vs :842).
  const bismillahRef = useRef(false)
  // The playlist ran to its end. Android's finished player restarts at item 0,
  // i.e. the Bismillah (MainActivity.kt:864-866), so the next tap cold-starts.
  const queueEndedRef = useRef(false)
  // The blob URL currently assigned to the element, revoked when replaced.
  const objectUrlRef = useRef<string | null>(null)
  // Bumped per load so a stale fetch can't overwrite a newer one's src.
  const loadGenRef = useRef(0)

  totalAyatsRef.current = totalAyats
  onAutoTrackRef.current = onAutoTrack
  autoTrackingRef.current = autoTracking

  // Fetch the ayat (cache first), swap the element's src to a blob URL, play.
  const loadAndPlay = useCallback(async (
    el: HTMLAudioElement,
    surah: number,
    ayat: number,
    bismillah = false,
  ) => {
    const gen = ++loadGenRef.current
    try {
      const objectUrl = bismillah
        ? await getAudioObjectUrl(BISMILLAH_SURAH, BISMILLAH_AYAT)
        : await getAudioObjectUrl(surah, ayat)
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
        if (bismillahRef.current) {
          // Head done — fall through into the surah's own first ayat, already
          // held in activeAyatRef
          bismillahRef.current = false
          void loadAndPlay(el, activeSurahRef.current!, activeAyatRef.current!)
          return
        }
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
          queueEndedRef.current = true
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

  const startPlayback = useCallback((
    surah: number,
    ayat: number,
    surahMode: boolean,
    bismillah = false,
  ) => {
    const el = getAudio()
    el.pause()

    activeSurahRef.current = surah
    activeAyatRef.current = ayat
    surahModeRef.current = surahMode
    bismillahRef.current = bismillah
    queueEndedRef.current = false

    setActiveSurah(surah)
    setActiveAyat(ayat)
    setIsSurahMode(surahMode)
    setPlaying(true)

    void loadAndPlay(el, surah, ayat, bismillah)
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
    // Android seeks into the same full playlist, and the Bismillah shares ayat
    // 1's page, so starting from ayat 1 lands on the Bismillah, not the ayat
    // (MainActivity.kt:1663, 1700-1701)
    startPlayback(surah, ayat, true, hasBismillah(surah) && ayat === 1)
    setAutoTracking(true)
    setLoadedAyat(null)
  }, [startPlayback])

  const togglePlay = useCallback(() => {
    const el = audioEl.current
    if (playing && el) {
      el.pause()
      setPlaying(false)
      return
    }
    // Only a live playlist for this surah resumes. Anything else — a finished
    // playlist, a single-ayat track, another surah — rebuilds from the top,
    // which is what Android's empty/idle surahPlayer does (MainActivity.kt:820).
    const resumable =
      el !== null &&
      surahModeRef.current &&
      !queueEndedRef.current &&
      activeSurahRef.current === surahId
    if (resumable) {
      el.play().catch(() => {})
      setPlaying(true)
      return
    }
    // Cold start: Bismillah, then the surah from its first ayat — never from
    // the page the user is on (MainActivity.kt:828-855)
    startPlayback(surahId, firstAyat, true, hasBismillah(surahId))
  }, [playing, surahId, firstAyat, startPlayback])

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
      bismillahRef.current = false
      queueEndedRef.current = false
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
