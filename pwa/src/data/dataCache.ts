// The ~10 MB CSV set is too slow to hide behind a silent service-worker install,
// so it is cached here with visible progress instead of being precached. The
// service worker serves DATA_CACHE_NAME at runtime, so a file this warm-up
// missed still resolves online and lands in the same cache.
import { DATA_CACHE_NAME } from './cacheNames.ts'

const SHARED_FILES = [
  '/data/Quran_Dataset.csv',
  '/data/quran_surahs.csv',
  '/data/surah_mm_name.csv',
]
const SURAH_COUNT = 114
const CONCURRENCY = 6

export interface DataCacheProgress {
  done: number
  total: number
}

export function dataFileUrls(): string[] {
  const urls = [...SHARED_FILES]
  for (let n = 1; n <= SURAH_COUNT; n++) {
    const pad = String(n).padStart(3, '0')
    urls.push(`/data/${pad}.csv`, `/data/${pad}_notes.csv`)
  }
  return urls
}

// Resolves once every file is cached or has been attempted. A failed file is
// skipped, never thrown: a dead network must not hold the splash open.
export async function cacheOfflineData(
  onProgress: (p: DataCacheProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const urls = dataFileUrls()
  const total = urls.length

  if (!('caches' in window)) {
    onProgress({ done: total, total })
    return
  }

  const cache = await caches.open(DATA_CACHE_NAME)
  const cached = new Set(
    (await cache.keys()).map((req) => new URL(req.url).pathname),
  )
  const missing = urls.filter((url) => !cached.has(url))

  let done = total - missing.length
  onProgress({ done, total })
  if (missing.length === 0) return

  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, missing.length) }, async () => {
      while (next < missing.length) {
        if (signal?.aborted) return
        const url = missing[next++]!
        try {
          const res = await fetch(url, { signal })
          if (res.ok) await cache.put(url, res)
        } catch {
          // Offline or a bad file — the runtime route retries it on first read.
        }
        done++
        onProgress({ done, total })
      }
    }),
  )
}
