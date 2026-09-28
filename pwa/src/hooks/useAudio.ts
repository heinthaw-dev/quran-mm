// Ports: MediaPlayer + playAyat / playSurahFrom logic (MainActivity.kt:466-560)
import { useCallback, useEffect, useRef, useState } from 'react'

// Synchronous ref update pattern — avoids stale closure in onended handler
import { getAudioObjectUrl, getSurahObjectUrl } from '../data/audioCache.ts'
import { audioLog, isAudioDebug, isSurahConcatTest } from '../data/audioLog.ts'

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

// Ayats are fetched one file at a time while the surah plays, and a phone with
// the screen off can stall or drop that request (Doze, battery saving, a dozing
// Wi-Fi link). One failure used to end the surah silently, so a load is retried
// before the chain gives up, and a give-up is remembered for the 'online' event.
const LOAD_ATTEMPTS = 5
const RETRY_DELAY_MS = 700

// Chrome on Android pauses the element by itself when the src is swapped for the
// next ayat while the phone's screen is off: an on-device log showed 'playing'
// and 'pause' in the same tenth of a second, with the file already in memory and
// no error at all. Nothing is broken at that point, so the chain takes the pause
// back. The cap stops a browser that keeps refusing from being asked forever.
const RESUME_ATTEMPTS = 6
const RESUME_BACKOFF_MS = 400
const MAX_RECOVERIES_PER_TRACK = 12

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

function errorText(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err)
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
  /** `restIds`: further ayat ids to auto-advance through after `ayat`, for a
   *  combined multi_ayats row (MainActivity.kt:788-796 queues every id in the
   *  range on the same player before a single play()). */
  playAyat: (surah: number, ayat: number, restIds?: number[]) => void
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
  const loadedAyatRef = useRef<number | null>(null)
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
  // Remaining ids of a combined multi_ayats row's single-ayat playback (the
  // small play button), queued after the one currently loaded. Public
  // activeAyat stays pinned to the row's own anchor id throughout — the icon
  // must read as playing for the whole range, not just its first file
  // (MainActivity.kt:1712, isAyatPlaying stays true across ExoPlayer's own
  // playlist transitions).
  const ayatQueueRef = useRef<number[]>([])
  // Where the chain died when every load attempt failed, so a network that comes
  // back can pick it up instead of leaving the user with silence.
  const resumeRef = useRef<{ surah: number; ayat: number; surahMode: boolean } | null>(null)
  // A pause this hook asked for (user tap, surah change, a new track), which the
  // 'pause' watchdog must let through instead of undoing.
  const intentionalPauseRef = useRef(false)
  const recoveriesRef = useRef(0)
  // The surah is loaded as one joined file (the /?audioconcat=1 test), so there
  // is no per-ayat chain to advance when it ends.
  const concatRef = useRef(false)

  playingRef.current = playing
  loadedAyatRef.current = loadedAyat
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
    audioLog('prefetch', key)
    try {
      const url = await getAudioObjectUrl(surah, ayat)
      if (gen !== prefetchGenRef.current) {
        URL.revokeObjectURL(url)
        return
      }
      prefetchRef.current = { key, url }
      audioLog('prefetch ok', key)
    } catch (err) {
      // Leave it unfetched; onended falls back to a live load.
      audioLog('prefetch fail', `${key} ${errorText(err)}`)
    }
  }, [discardPrefetch])

  // Warm the track that follows whatever is playing now.
  const prefetchNext = useCallback(() => {
    const surah = activeSurahRef.current
    const current = activeAyatRef.current
    if (surah === null || current === null) return
    // Outside surah mode the only follow-on is a combined row's next queued id.
    if (!surahModeRef.current) {
      const queued = ayatQueueRef.current[0]
      if (queued !== undefined) void prefetch(surah, queued)
      return
    }
    // While the Bismillah head plays, activeAyat already points at the ayat
    // that follows it, so that ayat is the next track.
    const next = bismillahRef.current ? current : current + 1
    if (next > totalAyatsRef.current) return
    void prefetch(surah, next)
  }, [prefetch])

  // The /?audioconcat=1 test: the whole surah as one resource, so a hidden page
  // never has to start a second file. No per-ayat chain, so no prefetch either.
  const loadConcatAndPlay = useCallback(async (
    el: HTMLAudioElement,
    surah: number,
    firstAyat: number,
    lastAyat: number,
  ) => {
    const gen = ++loadGenRef.current
    const span = `${surah}:${firstAyat}-${lastAyat}`
    audioLog('concat load', span)
    try {
      const objectUrl = await getSurahObjectUrl(surah, firstAyat, lastAyat)
      if (gen !== loadGenRef.current) {
        URL.revokeObjectURL(objectUrl)
        return
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = objectUrl
      el.src = objectUrl
      intentionalPauseRef.current = false
      recoveriesRef.current = 0
      await el.play()
      audioLog('concat playing', span)
    } catch (err) {
      audioLog('concat fail', `${span} ${errorText(err)}`)
      if (gen === loadGenRef.current) setPlaying(false)
    }
  }, [])

  // Take back a pause the app never asked for (see RESUME_ATTEMPTS).
  const recoverFromPause = useCallback(async (el: HTMLAudioElement) => {
    recoveriesRef.current++
    if (recoveriesRef.current > MAX_RECOVERIES_PER_TRACK) {
      // A screen that is off refuses every attempt (device log: twelve pauses
      // inside 1.3 s), so hold the spot for the screen coming back on.
      const surah = activeSurahRef.current
      const ayat = activeAyatRef.current
      if (surah !== null && ayat !== null) {
        resumeRef.current = { surah, ayat, surahMode: surahModeRef.current }
      }
      audioLog('resume gave up', 'too many pauses on one track')
      setPlaying(false)
      return
    }
    for (let attempt = 1; attempt <= RESUME_ATTEMPTS; attempt++) {
      if (!playingRef.current) return
      try {
        await el.play()
        audioLog('resumed', `try ${attempt}`)
        return
      } catch (err) {
        audioLog('resume rejected', `try ${attempt} ${errorText(err)}`)
        await delay(RESUME_BACKOFF_MS * attempt)
      }
    }
    if (playingRef.current) setPlaying(false)
  }, [])

  // Hand the element an already-fetched blob URL, with no await between the
  // 'ended' event and play() — the whole swap runs in that one task.
  const playPrefetched = useCallback((
    el: HTMLAudioElement,
    surah: number,
    ayat: number,
  ): boolean => {
    const entry = prefetchRef.current
    const key = trackKey(surah, ayat)
    if (!entry || entry.key !== key) {
      audioLog('swap miss', key)
      return false
    }
    prefetchRef.current = null
    // Any load still in flight is stale now.
    loadGenRef.current++
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = entry.url
    el.src = entry.url
    intentionalPauseRef.current = false
    recoveriesRef.current = 0
    audioLog('swap hit', key)
    void Promise.resolve(el.play()).catch((err: unknown) => {
      audioLog('play rejected', `${key} ${errorText(err)}`)
      setPlaying(false)
    })
    return true
  }, [])

  // Fetch the ayat (cache first), swap the element's src to a blob URL, play.
  // A failure here is usually a stalled request from a backgrounded page, not a
  // missing file, so it is worth retrying before the surah falls silent.
  const loadAndPlay = useCallback(async (
    el: HTMLAudioElement,
    surah: number,
    ayat: number,
    bismillah = false,
  ) => {
    const gen = ++loadGenRef.current
    const [fetchSurah, fetchAyat] = bismillah
      ? [BISMILLAH_SURAH, BISMILLAH_AYAT]
      : [surah, ayat]
    const key = trackKey(fetchSurah, fetchAyat)
    for (let attempt = 1; attempt <= LOAD_ATTEMPTS; attempt++) {
      audioLog('load', `${key} try ${attempt}`)
      try {
        const objectUrl = await getAudioObjectUrl(fetchSurah, fetchAyat)
        if (gen !== loadGenRef.current) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = objectUrl
        el.src = objectUrl
        intentionalPauseRef.current = false
        recoveriesRef.current = 0
        await el.play()
        audioLog('load ok', key)
        if (gen === loadGenRef.current) prefetchNext()
        return
      } catch (err) {
        if (gen !== loadGenRef.current) return
        audioLog('load fail', `${key} try ${attempt} ${errorText(err)}`)
        if (attempt === LOAD_ATTEMPTS) break
        await delay(RETRY_DELAY_MS)
        if (gen !== loadGenRef.current) return
      }
    }
    // Out of attempts: hold the spot for the 'online' handler and stop.
    resumeRef.current = { surah, ayat, surahMode: surahModeRef.current }
    audioLog('gave up', key)
    setPlaying(false)
  }, [prefetchNext])

  function getAudio() {
    if (!audioEl.current) {
      const el = new Audio()
      if (isAudioDebug()) {
        for (const type of ['error', 'stalled', 'waiting', 'playing'] as const) {
          el.addEventListener(type, () => {
            audioLog(type, type === 'error' ? `code ${el.error?.code ?? '?'}` : '')
          })
        }
      }
      el.addEventListener('pause', () => {
        audioLog('pause', `t=${el.currentTime.toFixed(1)}`)
        // Ours, or the natural pause at the end of a track — leave both alone.
        if (intentionalPauseRef.current) {
          intentionalPauseRef.current = false
          return
        }
        // Chrome fires 'pause' just before 'ended', and a play() there would
        // replay the ayat that has only just finished.
        const nearEnd = Number.isFinite(el.duration) && el.duration - el.currentTime < 0.3
        if (!playingRef.current || el.ended || nearEnd) return
        audioLog('pause not ours', `${activeSurahRef.current}:${activeAyatRef.current}`)
        void recoverFromPause(el)
      })
      el.onended = () => {
        audioLog('ended', `${activeSurahRef.current}:${activeAyatRef.current}`)
        if (concatRef.current) {
          // One resource held the whole surah, so its end is the surah's end.
          concatRef.current = false
          surahModeRef.current = false
          setIsSurahMode(false)
          queueEndedRef.current = true
          setPlaying(false)
          return
        }
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
          const queue = ayatQueueRef.current
          if (queue.length > 0) {
            const [next, ...rest] = queue
            ayatQueueRef.current = rest
            const surah = activeSurahRef.current!
            if (playPrefetched(el, surah, next!)) prefetchNext()
            else void loadAndPlay(el, surah, next!)
            return
          }
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
          // A throw here would skip the play() below and playback would simply
          // stop, so the page turn can never take the audio chain with it.
          try {
            onAutoTrackRef.current(s, nextAyat)
          } catch {
            // Page stays where it is; the chain goes on.
          }
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
    /** Further ids of a combined multi_ayats row, set before the first load so
     *  its prefetch warms the second file of the range. */
    queue: number[] = [],
  ) => {
    const el = getAudio()
    intentionalPauseRef.current = true
    el.pause()
    recoveriesRef.current = 0
    discardPrefetch()
    ayatQueueRef.current = queue
    resumeRef.current = null
    audioLog('start', `${surah}:${ayat} ${surahMode ? 'surah' : 'ayat'}${bismillah ? ' +bismillah' : ''}`)

    const concat = surahMode && isSurahConcatTest()
    concatRef.current = concat

    activeSurahRef.current = surah
    activeAyatRef.current = ayat
    surahModeRef.current = surahMode
    bismillahRef.current = bismillah && !concat
    queueEndedRef.current = false

    setActiveSurah(surah)
    setActiveAyat(ayat)
    setIsSurahMode(surahMode)
    setPlaying(true)

    if (concat) void loadConcatAndPlay(el, surah, ayat, totalAyatsRef.current)
    else void loadAndPlay(el, surah, ayat, bismillah)
  }, [loadAndPlay, loadConcatAndPlay, discardPrefetch]) // eslint-disable-line react-hooks/exhaustive-deps

  const playAyat = useCallback((surah: number, ayat: number, restIds: number[] = []) => {
    // Same ayat (or its range) still loaded from before: act as a real
    // play/pause toggle instead of reloading (MainActivity.kt:776-813).
    const el = audioEl.current
    const sameTrack =
      el !== null &&
      !surahModeRef.current &&
      activeSurahRef.current === surah &&
      activeAyatRef.current === ayat &&
      loadedAyatRef.current === ayat

    if (sameTrack && el) {
      if (playingRef.current) {
        intentionalPauseRef.current = true
        el.pause()
        setPlaying(false)
        return
      }
      // Paused mid-track (not ended — ending clears loadedAyat, see onended):
      // resume with Android's 1.5s rewind, not the exact pause point
      // (MainActivity.kt:804-808).
      el.currentTime = Math.max(0, el.currentTime - 1.5)
      void Promise.resolve(el.play()).catch(() => { setPlaying(false) })
      setPlaying(true)
      return
    }

    startPlayback(surah, ayat, false, false, restIds)
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
      intentionalPauseRef.current = true
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
  const startPlaybackRef = useRef(startPlayback)
  togglePlayRef.current = togglePlay
  skipTrackRef.current = skipTrack
  startPlaybackRef.current = startPlayback

  // The surah died on a load that never came back — most likely the phone cut
  // the network with the screen off. Pick it up where it stopped once the
  // network returns, instead of leaving the user with silence.
  useEffect(() => {
    const onOnline = () => {
      const spot = resumeRef.current
      if (!spot || playingRef.current) return
      resumeRef.current = null
      audioLog('online resume', `${spot.surah}:${spot.ayat}`)
      startPlaybackRef.current(spot.surah, spot.ayat, spot.surahMode)
    }
    window.addEventListener('online', onOnline)
    return () => { window.removeEventListener('online', onOnline) }
  }, [])

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
      audioLog('visibility', document.visibilityState)
      if (document.visibilityState !== 'visible') return
      // The ayat the screen-off refused to start: pick it up now that the screen
      // is back, rather than making the user find their place again.
      const spot = resumeRef.current
      if (spot && !playing) {
        resumeRef.current = null
        audioLog('screen-on resume', `${spot.surah}:${spot.ayat}`)
        startPlaybackRef.current(spot.surah, spot.ayat, spot.surahMode)
        return
      }
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
      intentionalPauseRef.current = true
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
    intentionalPauseRef.current = true
    audioEl.current?.pause()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const pending = prefetchRef.current
    if (pending) URL.revokeObjectURL(pending.url)
  }, [])

  const state: AudioState = { playing, activeSurah, activeAyat, isSurahMode, autoTracking, loadedAyat }
  const actions: AudioActions = { playAyat, playSurahFrom, togglePlay, toggleAutoTracking, disableAutoTracking, isPlayingAyat }
  return [state, actions]
}
