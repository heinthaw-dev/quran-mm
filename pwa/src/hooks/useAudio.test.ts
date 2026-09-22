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
    expect(loaded).toHaveBeenCalledTimes(1)

    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledWith(1, 1))
  })

  it('resumes the running playlist instead of restarting it', async () => {
    const { result } = renderFor(18, 1, 110)

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledTimes(1))
    act(() => { FakeAudio.last?.onended?.() })
    await waitFor(() => expect(loaded).toHaveBeenCalledTimes(2))

    act(() => { result.current[1].togglePlay() })
    expect(result.current[0].playing).toBe(false)
    act(() => { result.current[1].togglePlay() })

    expect(result.current[0].playing).toBe(true)
    expect(loaded).toHaveBeenCalledTimes(2)
  })

  it('rebuilds from the Bismillah after the surah changes', async () => {
    const { result, rerender } = renderFor(18, 1, 110)

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(loaded).toHaveBeenCalledTimes(1))

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
