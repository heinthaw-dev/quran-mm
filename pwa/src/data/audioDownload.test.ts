import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadSurahsAudio, type DownloadProgress } from './audioDownload.ts'
import { audioPath, audioUrl } from './config.ts'

// Minimal in-memory Cache Storage stand-in (jsdom has no `caches`). Keys are
// absolutised like the real Cache API, so path keys and host keys are distinct.
const APP_ORIGIN = 'https://app.test'
const abs = (url: string) => new URL(url, APP_ORIGIN).href

function installFakeCaches(seed: string[] = []) {
  const store = new Map<string, Response>()
  for (const url of seed) store.set(abs(url), new Response('cached', { status: 200 }))
  const cache = {
    match: async (url: string) => store.get(abs(url)),
    put: async (url: string, res: Response) => void store.set(abs(url), res),
    keys: async () => [...store.keys()].map((url) => ({ url })),
  }
  ;(globalThis as unknown as { caches: unknown }).caches = { open: async () => cache }
  return store
}

const neverPaused = () => false

describe('downloadSurahsAudio', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(async (_url: string, opts?: { signal?: AbortSignal }) => {
      if (opts?.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      return new Response('audio', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as unknown as { caches?: unknown }).caches
  })

  it('downloads every missing ayat and reports a finishing frame', async () => {
    const store = installFakeCaches()
    const frames: DownloadProgress[] = []
    await downloadSurahsAudio(
      [{ number: 1, numberOfAyahs: 3 }],
      (p) => frames.push({ ...p }),
      new AbortController().signal,
      neverPaused,
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(store.size).toBe(3)
    const last = frames.at(-1)!
    expect(last).toMatchObject({ surahIndex: 1, surahTotal: 1, currentSurahId: 1, ayatDone: 3, ayatTotal: 3 })
  })

  it('skips already-cached ayats and resumes from the next missing one', async () => {
    installFakeCaches([audioPath(1, 1), audioPath(1, 2)])
    const frames: DownloadProgress[] = []
    await downloadSurahsAudio(
      [{ number: 1, numberOfAyahs: 3 }],
      (p) => frames.push({ ...p }),
      new AbortController().signal,
      neverPaused,
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(audioUrl(1, 3), expect.anything())
    // First frame is the surah-start snapshot: 2 already cached.
    expect(frames[0]!.ayatDone).toBe(2)
    expect(frames.at(-1)!.ayatDone).toBe(3)
  })

  it('numbers surahs by batch index but shows the real surah id', async () => {
    installFakeCaches()
    const frames: DownloadProgress[] = []
    await downloadSurahsAudio(
      [
        { number: 5, numberOfAyahs: 1 },
        { number: 9, numberOfAyahs: 1 },
      ],
      (p) => frames.push({ ...p }),
      new AbortController().signal,
      neverPaused,
    )

    const second = frames.filter((f) => f.currentSurahId === 9).at(-1)!
    expect(second.surahIndex).toBe(2)
    expect(second.surahTotal).toBe(2)
  })

  it('throws AbortError and downloads nothing when stopped before start', async () => {
    installFakeCaches()
    const controller = new AbortController()
    controller.abort()
    await expect(
      downloadSurahsAudio([{ number: 1, numberOfAyahs: 3 }], () => {}, controller.signal, neverPaused),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('breaks out of a paused wait when stopped', async () => {
    installFakeCaches()
    const controller = new AbortController()
    controller.abort()
    await expect(
      downloadSurahsAudio([{ number: 1, numberOfAyahs: 3 }], () => {}, controller.signal, () => true),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
