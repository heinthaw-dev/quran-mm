// Ports: ayatAudioAvailability / isWholeSurahAudioAvailable (MainActivity.kt:708-738)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ayatKey, listDownloadedAyats, subscribeDownloadedAyats } from '../data/audioCache.ts'
import { ayatIdsOf } from '../data/csv.ts'
import type { AyatRow } from '../data/types.ts'

// The surah playlist opens with 001/001000.mp3 whatever surah follows, so that
// file has to be on the device too — except for surah 1, whose own ayat 0 is
// that file, and surah 9, which has no Bismillah (MainActivity.kt:717-722).
const BISMILLAH_KEY = ayatKey(1, 0)

function needsBismillah(surah: number): boolean {
  return surah !== 1 && surah !== 9
}

export interface AudioAvailability {
  /** Every ayat of the surah, plus its Bismillah head, is downloaded. */
  surahAvailable: boolean
  /** Every file this row would play is downloaded. */
  isRowAvailable: (row: AyatRow) => boolean
}

export function useAudioAvailability(
  surahId: number,
  firstAyat: number,
  totalAyats: number,
): AudioAvailability {
  const [downloaded, setDownloaded] = useState<Set<string> | null>(null)

  const read = useCallback(() => {
    let live = true
    void listDownloadedAyats().then((keys) => { if (live) setDownloaded(keys) })
    return () => { live = false }
  }, [])

  useEffect(read, [read])
  // A download or a delete rebuilds the index, and the buttons follow it.
  useEffect(() => subscribeDownloadedAyats(() => { read() }), [read])

  const surahAvailable = useMemo(() => {
    if (!downloaded) return false
    if (needsBismillah(surahId) && !downloaded.has(BISMILLAH_KEY)) return false
    for (let ayat = firstAyat; ayat <= totalAyats; ayat++) {
      if (!downloaded.has(ayatKey(surahId, ayat))) return false
    }
    return true
  }, [downloaded, surahId, firstAyat, totalAyats])

  const isRowAvailable = useCallback(
    (row: AyatRow) =>
      downloaded !== null && ayatIdsOf(row).every((id) => downloaded.has(ayatKey(surahId, id))),
    [downloaded, surahId],
  )

  return { surahAvailable, isRowAvailable }
}
