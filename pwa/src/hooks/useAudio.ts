// Ports: MediaPlayer + playAyat / playSurahFrom logic (MainActivity.kt:466-560)
import { useCallback, useEffect, useRef, useState } from 'react'

// Synchronous ref update pattern — avoids stale closure in onended handler
import { getAudioObjectUrl } from '../data/audioCache.ts'

interface UseAudioOptions {
  surahId: number
  /** First ayat id of the surah — 0 for surah 1, whose ayat 0 is the Bismillah */
  firstAyat: number
  totalAyats: number
  /** Surah name for the OS lock-screen media session */
  surahTitle?: string
  onAutoTrack: (surah: number, ayat: number) => void
}

// The surah playlist opens with the Bismillah, always folder 001 whatever the
// surah is playing (MainActivity.kt:828-839).
const BISMILLAH_SURAH = 1
const BISMILLAH_AYAT = 0

// Lock-screen / notification media session (no Android equivalent to port: the
// native app gets this from MediaPlayer's own session).
const SESSION_APP_NAME = 'Quran MM (KW)'
const SESSION_ARTWORK = '/icons/icon-512.png'

// Surah 1 already carries 001000.mp3 as its own ayat 0, and surah 9 has no
// Bismillah at all (MainActivity.kt:828).
function hasBismillah(surah: number): boolean {
  return surah !== 1 && surah !== 9
}

function trackKey(surah: number, ayat: number): string {
  return `${surah}:${ayat}`
}

function hasMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
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
  surahTitle,
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
  const playingRef = useRef(false)
  const firstAyatRef = useRef(firstAyat)
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
  // Next track's blob URL, fetched while the current one plays. Without it the
  // chain would await Cache Storage after 'ended', and that silent gap lets a
  // backgrounded page (screen off) be frozen mid-await, stalling playback until
  // the screen comes back on.
  const prefetchRef = useRef<{ key: string; url: string } | null>(null)
  const prefetchGenRef = useRef(0)

  playingRef.current = playing
  firstAyatRef.current = firstAyat
  totalAyatsRef.current = totalAyats
  onAutoTrackRef.current = onAutoTrack
  autoTrackingRef.current = autoTracking

  const discardPrefetch = useCallback(() => {
    prefetchGenRef.current++
    const entry = prefetchRef.current
    prefetchRef.current = null
    if (entry) URL.revokeObjectURL(entry.url)
  }, [])

  const prefetch = useCallback(async (surah: number, ayat: number) => {
    const key = trackKey(surah, ayat)
    if (prefetchRef.current?.key === key) return
    discardPrefetch()
    const gen = prefetchGenRef.current
    try {
      const url = await getAudioObjectUrl(surah, ayat)
      if (gen !== prefetchGenRef.current) {
        URL.revokeObjectURL(url)
        return
      }
      prefetchRef.current = { key, url }
    } catch {
      // Leave it unfetched; onended falls back to a live load.
    }
  }, [discardPrefetch])

  // Warm the track that follows whatever is playing now.
  const prefetchNext = useCallback(() => {
    if (!surahModeRef.current) return
    const surah = activeSurahRef.current
    const current = activeAyatRef.current
    if (surah === null || current === null) return
    // While the Bismillah head plays, activeAyat already points at the ayat
    // that follows it, so that ayat is the next track.
    const next = bismillahRef.current ? current : current + 1
    if (next > totalAyatsRef.current) return
    void prefetch(surah, next)
  }, [prefetch])

  // Hand the element an already-fetched blob URL, with no await between the
  // 'ended' event and play() — the whole swap runs in that one task.
  const playPrefetched = useCallback((
    el: HTMLAudioElement,
    surah: number,
    ayat: number,
  ): boolean => {
    const entry = prefetchRef.current
    if (!entry || entry.key !== trackKey(surah, ayat)) return false
    prefetchRef.current = null
    // Any load still in flight is stale now.
    loadGenRef.current++
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = entry.url
    el.src = entry.url
    void Promise.resolve(el.play()).catch(() => { setPlaying(false) })
    return true
  }, [])

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
      if (gen === loadGenRef.current) prefetchNext()
    } catch {
      if (gen === loadGenRef.current) setPlaying(false)
    }
  }, [prefetchNext])

  function getAudio() {
    if (!audioEl.current) {
      const el = new Audio()
      el.onended = () => {
        if (bismillahRef.current) {
          // Head done — fall through into the surah's own first ayat, already
          // held in activeAyatRef
          bismillahRef.current = false
          const surah = activeSurahRef.current!
          const ayat = activeAyatRef.current!
          if (playPrefetched(el, surah, ayat)) prefetchNext()
          else void loadAndPlay(el, surah, ayat)
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
        if (playPrefetched(el, s, nextAyat)) prefetchNext()
        else void loadAndPlay(el, s, nextAyat)
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
    discardPrefetch()

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
  }, [loadAndPlay, discardPrefetch]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Lock-screen next/prev. The surah playlist is the only queue the app has,
  // so outside surah mode there is nothing to skip to.
  const skipTrack = useCallback((delta: number) => {
    if (!surahModeRef.current) return
    const surah = activeSurahRef.current
    const current = activeAyatRef.current
    if (surah === null || current === null) return
    const target = current + delta
    if (target < firstAyatRef.current || target > totalAyatsRef.current) return
    startPlayback(surah, target, true)
    if (autoTrackingRef.current) onAutoTrackRef.current(surah, target)
  }, [startPlayback])

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

  const togglePlayRef = useRef(togglePlay)
  const skipTrackRef = useRef(skipTrack)
  togglePlayRef.current = togglePlay
  skipTrackRef.current = skipTrack

  // A live media session is what tells the OS this page is a media app: it puts
  // controls on the lock screen and keeps the page out of background freezing,
  // the way the native app's own MediaPlayer session does.
  useEffect(() => {
    if (!hasMediaSession()) return
    const ms = navigator.mediaSession
    const set = (action: MediaSessionAction, handler: (() => void) | null) => {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        // Browser doesn't know this action — skip it.
      }
    }
    set('play', () => { if (!playingRef.current) togglePlayRef.current() })
    set('pause', () => { if (playingRef.current) togglePlayRef.current() })
    set('nexttrack', () => { skipTrackRef.current(1) })
    set('previoustrack', () => { skipTrackRef.current(-1) })
    return () => {
      set('play', null)
      set('pause', null)
      set('nexttrack', null)
      set('previoustrack', null)
      ms.playbackState = 'none'
      ms.metadata = null
    }
  }, [])

  useEffect(() => {
    if (!hasMediaSession()) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  useEffect(() => {
    if (!hasMediaSession() || typeof MediaMetadata === 'undefined') return
    if (activeSurah === null || activeAyat === null) {
      navigator.mediaSession.metadata = null
      return
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surahTitle ?? `Surah ${activeSurah}`} · ${activeAyat}`,
      artist: SESSION_APP_NAME,
      artwork: [{ src: SESSION_ARTWORK, sizes: '512x512', type: 'image/png' }],
    })
  }, [activeSurah, activeAyat, surahTitle])

  // Backstop: a play() the browser refused while the page was hidden leaves the
  // element paused though the app still thinks it is playing. Resume on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const el = audioEl.current
      if (!playing || !el || !el.src || !el.paused) return
      void Promise.resolve(el.play()).catch(() => { setPlaying(false) })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { document.removeEventListener('visibilitychange', onVisible) }
  }, [playing])

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
      discardPrefetch()
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
  }, [surahId, discardPrefetch])

  // Cleanup on unmount
  useEffect(() => () => {
    audioEl.current?.pause()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const pending = prefetchRef.current
    if (pending) URL.revokeObjectURL(pending.url)
  }, [])

  const state: AudioState = { playing, activeSurah, activeAyat, isSurahMode, autoTracking, loadedAyat }
  const actions: AudioActions = { playAyat, playSurahFrom, togglePlay, toggleAutoTracking, disableAutoTracking, isPlayingAyat }
  return [state, actions]
}
