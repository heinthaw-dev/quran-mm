export const AUDIO_CACHE_NAME = 'quran-audio'

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
