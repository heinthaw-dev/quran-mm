import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cacheOfflineData,
  dataFileUrls,
  type DataCacheProgress,
} from './dataCache.ts'

// Minimal in-memory Cache Storage stand-in (jsdom has no `caches`).
function installFakeCaches(seed: string[] = []) {
  const store = new Map<string, Response>()
  for (const url of seed)
    store.set(url, new Response('cached', { status: 200 }))
  const cache = {
    keys: async () =>
      Array.from(store.keys()).map((url) => ({
        url: new URL(url, 'http://localhost').href,
      })),
    put: async (url: string, res: Response) => void store.set(url, res),
  }
  ;(globalThis as unknown as { caches: unknown }).caches = {
    open: async () => cache,
  }
  return store
}

describe('cacheOfflineData', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('csv', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as unknown as { caches?: unknown }).caches
  })

  it('lists the three shared files plus both CSVs of all 114 surahs', () => {
    const urls = dataFileUrls()
    expect(urls).toHaveLength(231)
    expect(urls).toContain('/data/quran_surahs.csv')
    expect(urls).toContain('/data/001.csv')
    expect(urls).toContain('/data/114_notes.csv')
  })

  it('caches every file and ends on a full progress frame', async () => {
    const store = installFakeCaches()
    const frames: DataCacheProgress[] = []
    await cacheOfflineData((p) => frames.push({ ...p }))

    expect(store.size).toBe(231)
    expect(fetchMock).toHaveBeenCalledTimes(231)
    expect(frames.at(-1)).toEqual({ done: 231, total: 231 })
  })

  it('skips files already cached so a resumed run only fetches the rest', async () => {
    installFakeCaches(['/data/001.csv', '/data/002.csv'])
    const frames: DataCacheProgress[] = []
    await cacheOfflineData((p) => frames.push({ ...p }))

    expect(fetchMock).toHaveBeenCalledTimes(229)
    expect(frames[0]).toEqual({ done: 2, total: 231 })
    expect(frames.at(-1)).toEqual({ done: 231, total: 231 })
  })

  it('does not reject when a file fails, so the splash still opens', async () => {
    installFakeCaches()
    fetchMock.mockRejectedValue(new TypeError('offline'))
    const frames: DataCacheProgress[] = []

    await expect(
      cacheOfflineData((p) => frames.push({ ...p })),
    ).resolves.toBeUndefined()
    expect(frames.at(-1)).toEqual({ done: 231, total: 231 })
  })
})
