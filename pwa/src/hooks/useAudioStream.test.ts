// The streamed path: one MediaSource for the whole run, because a backgrounded
// Chrome refuses the *second* file handed to the element (docs/PARITY.md).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { getAudioBlob } from '../data/audioCache.ts'
import { useAudio } from './useAudio.ts'

vi.mock('../data/audioCache.ts', () => ({
  getAudioObjectUrl: vi.fn(async (surah: number, ayat: number) => `blob:${surah}:${ayat}`),
  getAudioBlob: vi.fn(async () => ({
    arrayBuffer: async () => new Uint8Array([0xff, 0xfb, 0x90, 0x00]).buffer,
  }) as unknown as Blob),
}))

const fetched = vi.mocked(getAudioBlob)

/** Each appended ayat is pretended to be this long. */
const AYAT_SECONDS = 5

class Emitter {
  private listeners = new Map<string, Set<() => void>>()
  addEventListener(type: string, fn: () => void, opts?: { once?: boolean }) {
    const wrapped = opts?.once
      ? () => { this.removeEventListener(type, wrapped); fn() }
      : fn
    const set = this.listeners.get(type) ?? new Set()
    set.add(wrapped)
    this.listeners.set(type, set)
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners.get(type)?.delete(fn)
  }
  emit(type: string) {
    this.listeners.get(type)?.forEach((fn) => { fn() })
  }
}

class FakeSourceBuffer extends Emitter {
  mode = ''
  updating = false
  end = 0
  get buffered() {
    return {
      length: this.end > 0 ? 1 : 0,
      start: () => 0,
      end: () => this.end,
    } as unknown as TimeRanges
  }
  appendBuffer() {
    this.end += AYAT_SECONDS
    queueMicrotask(() => { this.emit('updateend') })
  }
  remove() {
    queueMicrotask(() => { this.emit('updateend') })
  }
}

class FakeMediaSource extends Emitter {
  static isTypeSupported = () => true
  static last: FakeMediaSource | null = null
  readyState = 'open'
  buffer = new FakeSourceBuffer()
  constructor() {
    super()
    FakeMediaSource.last = this
    // The element attaches on src assignment; nothing here waits on that.
    queueMicrotask(() => { this.emit('sourceopen') })
  }
  addSourceBuffer() {
    return this.buffer
  }
  endOfStream() {
    this.readyState = 'ended'
  }
}

class FakeAudio extends Emitter {
  static last: FakeAudio | null = null
  src = ''
  paused = false
  ended = false
  duration = NaN
  currentTime = 0
  srcAssignments = 0
  onended: (() => void) | null = null
  play = vi.fn(async () => {})
  pause = vi.fn()
  constructor() {
    super()
    FakeAudio.last = this
  }
}

// `src` is a plain field on the fake, so count the writes to prove the element
// is handed exactly one resource for the whole surah.
function countSrcWrites(el: FakeAudio) {
  let value = ''
  Object.defineProperty(el, 'src', {
    get: () => value,
    set: (next: string) => { value = next; el.srcAssignments++ },
  })
}

beforeEach(() => {
  FakeAudio.last = null
  FakeMediaSource.last = null
  fetched.mockClear()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('MediaSource', FakeMediaSource)
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:stream', revokeObjectURL: vi.fn() })
})

afterEach(() => { vi.unstubAllGlobals() })

const setup = (surahId = 18, firstAyat = 1, totalAyats = 4) =>
  renderHook(() =>
    useAudio({ surahId, firstAyat, totalAyats, onAutoTrack: () => {} }),
  )

describe('useAudio streamed surah', () => {
  it('opens the surah with the Bismillah and hands the element one resource', async () => {
    const { result } = setup()

    act(() => { result.current[1].togglePlay() })

    // Head first, always folder 001, then the surah's own ayats.
    await waitFor(() => expect(fetched).toHaveBeenCalledWith(1, 0))
    await waitFor(() => expect(fetched).toHaveBeenCalledWith(18, 4))
    expect(fetched.mock.calls.map((c) => c.join(':'))).toEqual([
      '1:0', '18:1', '18:2', '18:3', '18:4',
    ])
    expect(FakeAudio.last?.src).toBe('blob:stream')
    expect(result.current[0].playing).toBe(true)
  })

  it('skips the Bismillah for surah 9', async () => {
    const { result } = setup(9, 1, 3)

    act(() => { result.current[1].togglePlay() })

    await waitFor(() => expect(fetched).toHaveBeenCalledWith(9, 1))
    expect(fetched).not.toHaveBeenCalledWith(1, 0)
  })

  it('never swaps the src while the surah plays', async () => {
    const { result } = setup()
    act(() => { result.current[1].togglePlay() })
    const el = FakeAudio.last!
    countSrcWrites(el)

    await waitFor(() => expect(fetched).toHaveBeenCalledWith(18, 4))

    expect(el.srcAssignments).toBe(0)
  })

  it('moves the highlight from the playhead, not from a file ending', async () => {
    const { result } = setup()

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(fetched).toHaveBeenCalledWith(18, 4))

    const el = FakeAudio.last!
    // Spans are [head 0-5 → ayat 1], [1: 5-10], [2: 10-15], [3: 15-20], [4: …]
    await act(async () => {
      el.currentTime = 12
      el.emit('timeupdate')
    })

    expect(result.current[0].activeAyat).toBe(2)
  })

  it('ends the surah when the stream runs out', async () => {
    const { result } = setup()

    act(() => { result.current[1].togglePlay() })
    await waitFor(() => expect(fetched).toHaveBeenCalledWith(18, 4))

    act(() => { FakeAudio.last?.onended?.() })

    expect(result.current[0].playing).toBe(false)
    expect(result.current[0].isSurahMode).toBe(false)
  })
})
