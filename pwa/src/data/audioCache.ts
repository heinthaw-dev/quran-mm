import { audioPath, audioUrl, AUDIO_FETCH_HEADERS } from './config.ts'
import { AUDIO_CACHE_NAME } from './cacheNames.ts'

// URL pattern: /audio/001/001001.mp3
const AUDIO_URL_RE = /\/audio\/(\d{3})\//

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

// Playback goes through fetch(), never `el.src = <remote url>`: a media element
// cannot carry AUDIO_FETCH_HEADERS, so a host that screens browser requests
// answers it with HTML the element cannot decode. Downloaded ayats come from
// Cache Storage (offline); anything else streams from the host and is NOT
// cached, so the Delete Audio list keeps meaning "downloaded", like native.
export async function getAudioObjectUrl(surah: number, ayat: number): Promise<string> {
  let res: Response | undefined
  if ('caches' in window) {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    res = await matchCachedAudio(cache, audioPath(surah, ayat))
  }
  if (!res) res = await fetch(audioUrl(surah, ayat), { headers: AUDIO_FETCH_HEADERS })
  if (!res.ok) throw new Error(`Audio unavailable (${res.status})`)
  return URL.createObjectURL(await res.blob())
}
