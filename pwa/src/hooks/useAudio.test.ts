import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { getAudioObjectUrl } from '../data/audioCache.ts'
import { useAudio } from './useAudio.ts'

vi.mock('../data/audioCache.ts', () => ({
  getAudioObjectUrl: vi.fn(async () => 'blob:ayat'),
}))

const loaded = vi.mocked(getAudioObjectUrl)

// jsdom has no media stack: HTMLAudioElement.play() is unimplemented and
// 'ended' never fires, so the hook gets a stub whose onended we call by hand.
class FakeAudio {
  static last: FakeAudio | null = null
  src = ''
  paused = false
  currentTime = 0
  onended: (() => void) | null = null
  play = vi.fn(async () => {})
  pause = vi.fn()
  constructor() {
    FakeAudio.last = this
  }
}

beforeEach(() => {
  FakeAudio.last = null
  loaded.mockClear()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('URL', { ...URL, revokeObjectURL: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const setup = () =>
  renderHook(() =>
    useAudio({ surahId: 18, firstAyat: 1, totalAyats: 110, onAutoTrack: () => {} }),
  )

const BISMILLAH: [number, number] = [1, 0]

describe('useAudio loadedAyat', () => {
  it('is null until an ayat is played', () => {
    const { result } = setup()
    expect(result.current[0].loadedAyat).toBeNull()
  })

  it('arms the played ayat and clears it when that track ends', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    expect(result.current[0].loadedAyat).toBe(3)

    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())
    act(() => { FakeAudio.last?.onended?.() })

    expect(result.current[0].loadedAyat).toBeNull()
    expect(result.current[0].playing).toBe(false)
  })

  it('clears on "play surah from here", which also turns auto-tracking on', () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    act(() => { result.current[1].playSurahFrom(18, 3) })

    expect(result.current[0].loadedAyat).toBeNull()
    expect(result.current[0].autoTracking).toBe(true)
    expect(result.current[0].isSurahMode).toBe(true)
    expect(result.current[0].activeAyat).toBe(3)
  })

  it('keeps the ayat armed while the surah chain advances', async () => {
    const { result } = setup()

    act(() => { result.current[1].playSurahFrom(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())
    act(() => { FakeAudio.last?.onended?.() })

    expect(result.current[0].activeAyat).toBe(4)
    expect(result.current[0].playing).toBe(true)
  })
})

describe('useAudio playAyat as a play/pause toggle', () => {
  it('pauses in place instead of restarting, then resumes with a 1.5s rewind', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())
    loaded.mockClear()
    const el = FakeAudio.last!
    el.pause.mockClear() // startPlayback's own defensive el.pause() already ran once
    el.currentTime = 10

    // Tap while playing: pause only, no reload (MainActivity.kt:778-779).
    act(() => { result.current[1].playAyat(18, 3) })
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(result.current[0].playing).toBe(false)
    expect(result.current[0].loadedAyat).toBe(3)
    expect(loaded).not.toHaveBeenCalled()

    // Tap again while paused, same ayat still loaded: rewind 1.5s and resume
    // in place, no new fetch (MainActivity.kt:804-808).
    el.play.mockClear()
    act(() => { result.current[1].playAyat(18, 3) })
    expect(el.currentTime).toBe(8.5)
    expect(el.play).toHaveBeenCalledTimes(1)
    expect(result.current[0].playing).toBe(true)
    expect(loaded).not.toHaveBeenCalled()
  })

  it('floors the rewind at 0 instead of going negative', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())
    const el = FakeAudio.last!
    el.currentTime = 1

    act(() => { result.current[1].playAyat(18, 3) }) // pause
    act(() => { result.current[1].playAyat(18, 3) }) // resume

    expect(el.currentTime).toBe(0)
  })

  it('reloads from the start for a different ayat instead of toggling', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 3))

    act(() => { result.current[1].playAyat(18, 9) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 9))
    expect(result.current[0].playing).toBe(true)
    expect(result.current[0].loadedAyat).toBe(9)
  })

  it('reloads from the start once a paused ayat has actually ended', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 3))
    act(() => { FakeAudio.last?.onended?.() })
    expect(result.current[0].loadedAyat).toBeNull()

    loaded.mockClear()
    act(() => { result.current[1].playAyat(18, 3) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 3))
    expect(result.current[0].playing).toBe(true)
  })
})

describe('useAudio combined ayat range (small play button)', () => {
  it('plays every id of a multi_ayats row in sequence, then stops', async () => {
    const { result } = setup()

    // Row "3-5": the card passes the anchor id plus the rest of the range.
    act(() => { result.current[1].playAyat(18, 3, [4, 5]) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 3))
    expect(result.current[0].playing).toBe(true)
    expect(result.current[0].loadedAyat).toBe(3)

    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 4))
    // Anchor stays put — the button must read as playing for the whole range,
    // not flicker back to "play" between the range's own files.
    expect(result.current[0].playing).toBe(true)
    expect(result.current[0].loadedAyat).toBe(3)

    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 5))
    expect(result.current[0].playing).toBe(true)

    act(() => { FakeAudio.last?.onended?.() })
    expect(result.current[0].playing).toBe(false)
    expect(result.current[0].loadedAyat).toBeNull()
  })

  it('does not carry a leftover queue into the next single-ayat play', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3, [4, 5]) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())

    // User taps a different, single ayat mid-range instead of letting it finish.
    act(() => { result.current[1].playAyat(18, 9) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 9))
    act(() => { FakeAudio.last?.onended?.() })

    expect(loaded).not.toHaveBeenCalledWith(18, 4)
    expect(result.current[0].playing).toBe(false)
  })
})

describe('useAudio surah playlist head', () => {
  const renderFor = (surahId: number, firstAyat: number, totalAyats: number) =>
    renderHook(
      (props: { surahId: number; firstAyat: number }) =>
        useAudio({ ...props, totalAyats, onAutoTrack: () => {} }),
      { initialProps: { surahId, firstAyat } },
    )

  it('starts at the Bismillah, then the surah\'s first ayat — not the open page', async () => {
    const { result } = renderFor(18, 1, 110)

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))
    // The highlight already sits on ayat 1 while the Bismillah plays
    expect(result.current[0].activeSurah).toBe(18)
    expect(result.current[0].activeAyat).toBe(1)

    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 1))
    expect(result.current[0].activeAyat).toBe(1)
    expect(result.current[0].playing).toBe(true)
  })

  it('skips the Bismillah for surah 9', async () => {
    const { result } = renderFor(9, 1, 129)

    act(() => { result.current[1].togglePlay() })

    await waitFor(() => expect(loaded).toHaveBeenCalledWith(9, 1))
    expect(loaded).not.toHaveBeenCalledWith(...BISMILLAH)
  })

  it('skips the prepend for surah 1, whose own ayat 0 is that file', async () => {
    const { result } = renderFor(1, 0, 6)

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(1, 0))
    // No separate prepend: ayat 0 is loaded once, as the surah's own first track
    expect(loaded.mock.calls.filter(([s, a]) => s === 1 && a === 0)).toHaveLength(1)

    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(1, 1))
  })

  it('resumes the running playlist instead of restarting it', async () => {
    const { result } = renderFor(18, 1, 110)

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))
    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 2))
    const fetches = loaded.mock.calls.length

    act(() => { result.current[1].togglePlay() })
    expect(result.current[0].playing).toBe(false)
    act(() => { result.current[1].togglePlay() })

    expect(result.current[0].playing).toBe(true)
    // Resume plays the loaded element again; it re-fetches nothing
    expect(loaded.mock.calls).toHaveLength(fetches)
  })

  it('rebuilds from the Bismillah after the surah changes', async () => {
    const { result, rerender } = renderFor(18, 1, 110)

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))

    rerender({ surahId: 2, firstAyat: 1 })
    loaded.mockClear()

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))
    expect(result.current[0].activeSurah).toBe(2)

    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(2, 1))
  })

  it('rebuilds from the Bismillah after the playlist has run out', async () => {
    const { result } = renderFor(18, 1, 2)

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))
    act(() => { FakeAudio.last?.onended?.() }) // Bismillah -> ayat 1
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 1))
    act(() => { FakeAudio.last?.onended?.() }) // ayat 1 -> ayat 2
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 2))
    act(() => { FakeAudio.last?.onended?.() }) // past ayat 2 -> playlist ends
    expect(result.current[0].playing).toBe(false)

    loaded.mockClear()
    act(() => { result.current[1].togglePlay() })

    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))
  })

  it('plays the Bismillah when "play surah from here" starts at ayat 1', async () => {
    const { result } = renderFor(18, 1, 110)

    act(() => { result.current[1].playSurahFrom(18, 1) })

    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))
    expect(result.current[0].activeAyat).toBe(1)
  })
})

describe('useAudio gapless chain', () => {
  it('prefetches the next ayat while the current one plays', async () => {
    const { result } = setup()

    act(() => { result.current[1].playSurahFrom(18, 3) })

    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 4))
  })

  it('prefetches the surah\'s first ayat while the Bismillah head plays', async () => {
    const { result } = setup()

    act(() => { result.current[1].togglePlay() })

    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 1))
  })

  // The point of the prefetch: no await sits between 'ended' and play(), so a
  // backgrounded page cannot be frozen in a silent gap between two ayats.
  it('starts the next ayat in the same task as the ended event', async () => {
    const { result } = setup()

    act(() => { result.current[1].playSurahFrom(18, 3) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 4))

    const el = FakeAudio.last!
    const playsBefore = el.play.mock.calls.length
    loaded.mockClear()
    act(() => { el.onended?.() })

    expect(el.play.mock.calls.length).toBe(playsBefore + 1)
    expect(loaded).not.toHaveBeenCalledWith(18, 4)
    expect(result.current[0].activeAyat).toBe(4)
  })

  it('falls back to a live load when the next ayat was not prefetched', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())
    // Single-ayat playback prefetches nothing
    expect(loaded).not.toHaveBeenCalledWith(18, 4)

    act(() => { result.current[1].playSurahFrom(18, 3) })
    loaded.mockClear()
    act(() => { FakeAudio.last?.onended?.() })

    await waitFor(() => expect(loaded).toHaveBeenCalledWith(18, 4))
  })

  it('resumes on return to the foreground after a refused hidden play', async () => {
    const { result } = setup()

    act(() => { result.current[1].playAyat(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())

    const el = FakeAudio.last!
    el.paused = true
    const playsBefore = el.play.mock.calls.length
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })

    expect(el.play.mock.calls.length).toBe(playsBefore + 1)
  })
})

interface FakeSession {
  metadata: { title?: string; artist?: string } | null
  playbackState: string
  handlers: Map<string, (() => void) | null>
  setActionHandler: (action: string, handler: (() => void) | null) => void
}

describe('useAudio media session', () => {
  let session: FakeSession

  const withTitle = () =>
    renderHook(() =>
      useAudio({
        surahId: 18,
        firstAyat: 1,
        totalAyats: 110,
        surahTitle: 'Al-Kahf',
        onAutoTrack: () => {},
      }),
    )

  beforeEach(() => {
    session = {
      metadata: null,
      playbackState: 'none',
      handlers: new Map(),
      setActionHandler(action, handler) {
        this.handlers.set(action, handler)
      },
    }
    Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true })
    vi.stubGlobal('MediaMetadata', class {
      constructor(init: Record<string, unknown>) {
        Object.assign(this, init)
      }
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaSession')
  })

  it('publishes the playing ayat and state to the OS', async () => {
    const { result } = withTitle()

    act(() => { result.current[1].playSurahFrom(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())

    expect(session.playbackState).toBe('playing')
    expect(session.metadata?.title).toBe('Al-Kahf · 3')
  })

  it('pauses from the lock-screen control', async () => {
    const { result } = withTitle()

    act(() => { result.current[1].playSurahFrom(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())
    act(() => { session.handlers.get('pause')?.() })

    expect(result.current[0].playing).toBe(false)
    expect(session.playbackState).toBe('paused')
    expect(FakeAudio.last?.pause).toHaveBeenCalled()
  })

  it('steps the playlist from the lock-screen next/prev controls', async () => {
    const { result } = withTitle()

    act(() => { result.current[1].playSurahFrom(18, 3) })
    await waitFor(() => expect(FakeAudio.last?.play).toHaveBeenCalled())

    act(() => { session.handlers.get('nexttrack')?.() })
    expect(result.current[0].activeAyat).toBe(4)

    act(() => { session.handlers.get('previoustrack')?.() })
    expect(result.current[0].activeAyat).toBe(3)
  })

  it('ignores prev at the first ayat of the surah', async () => {
    const { result } = withTitle()

    act(() => { result.current[1].playSurahFrom(18, 1) })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(...BISMILLAH))

    act(() => { session.handlers.get('previoustrack')?.() })
    expect(result.current[0].activeAyat).toBe(1)
  })
})
