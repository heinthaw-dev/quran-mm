import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { audioPath, audioUrl } from './config.ts'

// Fresh module per test: audioCache indexes legacy cache keys once per session.
const loadGetAudioObjectUrl = async () =>
  (await import('./audioCache.ts')).getAudioObjectUrl

const APP_ORIGIN = 'https://app.test'
const abs = (url: string) => new URL(url, APP_ORIGIN).href

function installFakeCaches(seed: Record<string, string> = {}) {
  const store = new Map<string, Response>()
  for (const [url, body] of Object.entries(seed)) {
    store.set(abs(url), new Response(body, { status: 200 }))
  }
  const cache = {
    match: async (url: string | { url: string }) =>
      store.get(abs(typeof url === 'string' ? url : url.url)),
    put: async (url: string, res: Response) => void store.set(abs(url), res),
    keys: async () => [...store.keys()].map((url) => ({ url })),
  }
  ;(globalThis as unknown as { caches: unknown }).caches = { open: async () => cache }
}

describe('getAudioObjectUrl', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    fetchMock = vi.fn(async () => new Response('network', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = vi.fn(() => 'blob:fake')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as unknown as { caches?: unknown }).caches
  })

  it('plays a downloaded ayat from the cache without touching the network', async () => {
    installFakeCaches({ [audioPath(1, 1)]: 'mp3' })
    await expect((await loadGetAudioObjectUrl())(1, 1)).resolves.toBe('blob:fake')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // Downloads made by an earlier build are keyed by the audio host, which the
  // path lookup no longer addresses — they must still play offline.
  it('recovers an ayat cached under a previous audio host', async () => {
    installFakeCaches({ [`https://old-host.example${audioPath(1, 1)}`]: 'mp3' })
    await expect((await loadGetAudioObjectUrl())(1, 1)).resolves.toBe('blob:fake')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('streams from the host when the ayat was never downloaded', async () => {
    installFakeCaches()
    await expect((await loadGetAudioObjectUrl())(1, 1)).resolves.toBe('blob:fake')
    expect(fetchMock).toHaveBeenCalledWith(audioUrl(1, 1), expect.anything())
  })

  it('throws when the host refuses the file', async () => {
    installFakeCaches()
    fetchMock.mockResolvedValue(new Response('', { status: 404 }))
    await expect((await loadGetAudioObjectUrl())(1, 1)).rejects.toThrow('Audio unavailable (404)')
  })
})
