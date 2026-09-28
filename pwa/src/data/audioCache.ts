import { audioPath } from './config.ts'
import { AUDIO_CACHE_NAME } from './cacheNames.ts'

// URL pattern: /audio/001/001001.mp3
const AUDIO_URL_RE = /\/audio\/(\d{3})\//
const AUDIO_FILE_RE = /\/audio\/(\d{3})\/\d{3}(\d{3})\.mp3$/

export interface CachedSurah {
  number: number
  sizeBytes: number
}

// Count of cached audio files per surah — used to tell a fully-downloaded
// surah (count === numberOfAyahs) from a partial one.
export async function getCachedAyatCounts(): Promise<Map<number, number>> {
  if (!('caches' in window)) return new Map()
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    const keys = await cache.keys()
    const counts = new Map<number, number>()
    for (const req of keys) {
      const match = new URL(req.url).pathname.match(AUDIO_URL_RE)
      if (!match || !match[1]) continue
      const surahNum = parseInt(match[1], 10)
      counts.set(surahNum, (counts.get(surahNum) ?? 0) + 1)
    }
    return counts
  } catch {
    return new Map()
  }
}

export async function getCachedSurahs(): Promise<CachedSurah[]> {
  if (!('caches' in window)) return []
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    const keys = await cache.keys()
    const sizeMap = new Map<number, number>()

    await Promise.all(
      keys.map(async (req) => {
        const match = new URL(req.url).pathname.match(AUDIO_URL_RE)
        if (!match || !match[1]) return
        const surahNum = parseInt(match[1], 10)
        const response = await cache.match(req)
        if (!response) return
        const cl = response.headers.get('Content-Length')
        const size = cl ? parseInt(cl, 10) : 0
        sizeMap.set(surahNum, (sizeMap.get(surahNum) ?? 0) + size)
      }),
    )

    return Array.from(sizeMap.entries())
      .map(([number, sizeBytes]) => ({ number, sizeBytes }))
      .sort((a, b) => a.number - b.number)
  } catch {
    return []
  }
}

export async function deleteAudioCache(surahNumbers: number[]): Promise<void> {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    const keys = await cache.keys()
    const targets = new Set(surahNumbers)

    await Promise.all(
      keys.map(async (req) => {
        const match = new URL(req.url).pathname.match(AUDIO_URL_RE)
        if (!match || !match[1]) return
        const surahNum = parseInt(match[1], 10)
        if (targets.has(surahNum)) await cache.delete(req)
      }),
    )
    invalidateDownloadedAyats()
  } catch {
    // Cache unavailable — nothing to delete
  }
}

// Ayats downloaded by an older build are keyed by the audio host of the day, so
// the path key no longer addresses them. Indexed once per session by path: the
// set cannot grow, because every new download is written under the path key.
let legacyKeysByPath: Promise<Map<string, Request>> | null = null

function indexLegacyKeys(cache: Cache): Promise<Map<string, Request>> {
  legacyKeysByPath ??= cache.keys().then((keys) => {
    const byPath = new Map<string, Request>()
    for (const req of keys) {
      const { pathname, href } = new URL(req.url)
      if (href !== new URL(pathname, location.origin).href) byPath.set(pathname, req)
    }
    return byPath
  })
  return legacyKeysByPath
}

// ignoreVary: the response was stored for a request carrying
// AUDIO_FETCH_HEADERS, so a host that varies on those headers would never match
// the header-less lookup.
async function matchCachedAudio(cache: Cache, path: string): Promise<Response | undefined> {
  const hit = await cache.match(path, { ignoreVary: true })
  if (hit) return hit
  const legacy = (await indexLegacyKeys(cache)).get(path)
  return legacy ? cache.match(legacy, { ignoreVary: true }) : undefined
}

/** A play of an ayat that was never downloaded. Not worth retrying: no amount
 *  of trying again puts the file in the cache. */
export class AudioNotDownloadedError extends Error {
  constructor(surah: number, ayat: number) {
    super(`Audio not downloaded (${surah}:${ayat})`)
    this.name = 'AudioNotDownloadedError'
  }
}

// Playback reads downloaded files only, like Android, whose players are only
// ever handed `Uri.fromFile(...)` and whose network code belongs to the
// downloader alone (MainActivity.kt:792, :833, :1656-1660). Streaming a missing
// ayat would spend the user's mobile data on every play — 39 MB for Al-Baqara,
// each time — so a missing file stops playback instead.
export async function getAudioBlob(surah: number, ayat: number): Promise<Blob> {
  if (!('caches' in window)) throw new AudioNotDownloadedError(surah, ayat)
  const cache = await caches.open(AUDIO_CACHE_NAME)
  const res = await matchCachedAudio(cache, audioPath(surah, ayat))
  if (!res?.ok) throw new AudioNotDownloadedError(surah, ayat)
  return res.blob()
}

// Which ayats are on the device, as `surah:ayat` keys. Android recomputes the
// same answer from the filesystem whenever a surah loads or a download or
// delete finishes (MainActivity.kt:705-738, :552, :582); here one pass over the
// cache keys serves every card on the screen, and download/delete invalidate it.
let downloadedAyats: Promise<Set<string>> | null = null

export function ayatKey(surah: number, ayat: number): string {
  return `${surah}:${ayat}`
}

export function listDownloadedAyats(): Promise<Set<string>> {
  downloadedAyats ??= (async () => {
    const keys = new Set<string>()
    if (!('caches' in window)) return keys
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME)
      for (const req of await cache.keys()) {
        const match = new URL(req.url).pathname.match(AUDIO_FILE_RE)
        if (!match?.[1] || !match[2]) continue
        keys.add(ayatKey(parseInt(match[1], 10), parseInt(match[2], 10)))
      }
    } catch {
      // Cache unavailable — nothing is downloaded as far as the UI knows.
    }
    return keys
  })()
  return downloadedAyats
}

const availabilityListeners = new Set<() => void>()

export function subscribeDownloadedAyats(fn: () => void): () => void {
  availabilityListeners.add(fn)
  return () => { availabilityListeners.delete(fn) }
}

/** Called by the downloader and the delete flow, so the play buttons follow the
 *  device without the screens having to remember to ask. */
export function invalidateDownloadedAyats(): void {
  downloadedAyats = null
  availabilityListeners.forEach((fn) => { fn() })
}

export async function getAudioObjectUrl(surah: number, ayat: number): Promise<string> {
  return URL.createObjectURL(await getAudioBlob(surah, ayat))
}
