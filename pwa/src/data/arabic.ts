import { parseArabicAyats } from './csv.ts'
import type { ArabicAyat } from './types.ts'

let cache: ArabicAyat[] | null = null

export async function loadArabicAyats(): Promise<ArabicAyat[]> {
  if (cache) return cache
  const res = await fetch('/data/Quran_Dataset.csv')
  const text = await res.text()
  cache = parseArabicAyats(text)
  return cache
}

export function getArabicAyat(
  ayats: ArabicAyat[],
  surahNo: number,
  ayahNoSurah: number,
): string {
  return ayats.find((a) => a.surahNo === surahNo && a.ayahNoSurah === ayahNoSurah)?.ayahAr ?? ''
}
