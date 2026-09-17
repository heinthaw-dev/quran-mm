// Fetches surah audio into the same Cache Storage bucket the reader plays from,
// so downloaded surahs replay offline. Ports the download loop behind
// showDownloadDialog (MainActivity.kt:966). Sequential per surah, one ayat at a
// time, to match the native progress + ETA semantics exactly.
import { audioUrl } from './config.ts'
import { AUDIO_CACHE_NAME } from './audioCache.ts'

export interface DownloadProgress {
  surahIndex: number // 1-based index of the current surah within the batch
  surahTotal: number // number of selected surahs
  currentSurahId: number // Quran surah number (1-114)
  ayatDone: number // 1-based position within the current surah (incl. already-cached)
  ayatTotal: number // total ayats of the current surah
  etaSeconds: number | null // null renders as "Calculating..."
}

export interface SurahDownloadJob {
  number: number
  numberOfAyahs: number
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Download cancelled', 'AbortError')
}

// Native polls isDownloadPaused before each surah and each ayat (MainActivity.kt:498,519).
async function waitWhilePaused(isPaused: () => boolean, signal: AbortSignal): Promise<void> {
  while (isPaused()) {
    throwIfAborted(signal)
    await delay(500)
  }
}

// ETA = remaining / overall-average-rate, total-elapsed based (MainActivity.kt:535).
// Uses processedCount (attempts) not just successful downloads so ETA shows even when some fetches fail.
function computeEta(totalMissing: number, processedCount: number, startTime: number): number | null {
  const elapsedSec = (Date.now() - startTime) / 1000
  if (elapsedSec > 2 && processedCount > 0) {
    const rate = processedCount / elapsedSec
    return Math.floor((totalMissing - processedCount) / rate)
  }
  return null
}

export async function downloadSurahsAudio(
  surahs: SurahDownloadJob[],
  onProgress: (p: DownloadProgress) => void,
  signal: AbortSignal,
  isPaused: () => boolean,
): Promise<void> {
  if (!('caches' in window)) throw new Error('Cache Storage unavailable')
  const cache = await caches.open(AUDIO_CACHE_NAME)

  // Precompute the missing ayats per surah (resume skips already-cached files),
  // plus the global missing count that the ETA denominator needs.
  const missingBySurah: number[][] = []
  let totalMissing = 0
  for (const s of surahs) {
    const missing: number[] = []
    for (let ayat = 1; ayat <= s.numberOfAyahs; ayat++) {
      if (!(await cache.match(audioUrl(s.number, ayat)))) missing.push(ayat)
    }
    missingBySurah.push(missing)
    totalMissing += missing.length
  }

  const startTime = Date.now()
  let processedCount = 0

  for (let i = 0; i < surahs.length; i++) {
    const s = surahs[i]!
    const missing = missingBySurah[i]!
    const alreadyDownloaded = s.numberOfAyahs - missing.length

    await waitWhilePaused(isPaused, signal)
    throwIfAborted(signal)

    // Surah-start frame so the bars advance even for a fully-cached surah.
    onProgress({
      surahIndex: i + 1,
      surahTotal: surahs.length,
      currentSurahId: s.number,
      ayatDone: alreadyDownloaded,
      ayatTotal: s.numberOfAyahs,
      etaSeconds: computeEta(totalMissing, processedCount, startTime),
    })

    for (let idx = 0; idx < missing.length; idx++) {
      await waitWhilePaused(isPaused, signal)
      throwIfAborted(signal)

      const url = audioUrl(s.number, missing[idx]!)
      try {
        const res = await fetch(url, { signal })
        if (res.ok) {
          await cache.put(url, res)
        }
      } catch (e) {
        // Abort (Stop) propagates; a single failed ayat is skipped, like native.
        if (e instanceof DOMException && e.name === 'AbortError') throw e
      }
      processedCount++

      onProgress({
        surahIndex: i + 1,
        surahTotal: surahs.length,
        currentSurahId: s.number,
        ayatDone: alreadyDownloaded + idx + 1,
        ayatTotal: s.numberOfAyahs,
        etaSeconds: computeEta(totalMissing, processedCount, startTime),
      })
    }
  }
}
