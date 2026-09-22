import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudio } from './useAudio.ts'

vi.mock('../data/audioCache.ts', () => ({
  getAudioObjectUrl: vi.fn(async () => 'blob:ayat'),
}))

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
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('URL', { ...URL, revokeObjectURL: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const setup = () =>
  renderHook(() =>
    useAudio({ surahId: 18, currentAyatId: 1, totalAyats: 110, onAutoTrack: () => {} }),
  )

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
