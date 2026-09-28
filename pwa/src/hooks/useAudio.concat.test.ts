// The /?audioconcat=1 path: one joined resource for the whole surah, used to
// confirm that a backgrounded Chrome only refuses the *second* file.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { getSurahObjectUrl } from '../data/audioCache.ts'
import { useAudio } from './useAudio.ts'

vi.mock('../data/audioCache.ts', () => ({
  getAudioObjectUrl: vi.fn(async (surah: number, ayat: number) => `blob:${surah}:${ayat}`),
  getSurahObjectUrl: vi.fn(async (surah: number, first: number, last: number) =>
    `blob:${surah}:${first}-${last}`),
}))

vi.mock('../data/audioLog.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/audioLog.ts')>()),
  isSurahConcatTest: () => true,
}))

const joined = vi.mocked(getSurahObjectUrl)

class FakeAudio {
  static last: FakeAudio | null = null
  src = ''
  paused = false
  ended = false
  currentTime = 0
  onended: (() => void) | null = null
  play = vi.fn(async () => {})
  pause = vi.fn()
  addEventListener() {}
  removeEventListener() {}
  constructor() {
    FakeAudio.last = this
  }
}

beforeEach(() => {
  FakeAudio.last = null
  joined.mockClear()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('URL', { ...URL, revokeObjectURL: vi.fn() })
})

afterEach(() => { vi.unstubAllGlobals() })

const setup = () =>
  renderHook(() =>
    useAudio({ surahId: 1, firstAyat: 0, totalAyats: 6, onAutoTrack: () => {} }),
  )

describe('useAudio joined-surah test path', () => {
  it('plays the surah as a single resource', async () => {
    const { result } = setup()

    act(() => { result.current[1].togglePlay() })

    await waitFor(() => expect(joined).toHaveBeenCalledWith(1, 0, 6))
    await waitFor(() => expect(FakeAudio.last?.src).toBe('blob:1:0-6'))
    expect(result.current[0].playing).toBe(true)
  })

  it('treats the end of that resource as the end of the surah', async () => {
    const { result } = setup()

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(FakeAudio.last?.src).toBe('blob:1:0-6'))

    act(() => { FakeAudio.last?.onended?.() })

    expect(result.current[0].playing).toBe(false)
    expect(result.current[0].isSurahMode).toBe(false)
    expect(joined).toHaveBeenCalledTimes(1)
  })
})
