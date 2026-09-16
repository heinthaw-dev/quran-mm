import { parseAyats, parseNotes, parseSurahsMeta, parseMyanmarNames } from './csv.ts'
import type { AyatRow, NoteRow, SurahMeta } from './types.ts'

const ayatCache = new Map<number, AyatRow[]>()
const notesCache = new Map<number, NoteRow[]>()
let surahMetaCache: SurahMeta[] | null = null

function padSurah(n: number): string {
  return String(n).padStart(3, '0')
}

export async function loadSurahMeta(): Promise<SurahMeta[]> {
  if (surahMetaCache) return surahMetaCache

  const [surahsRes, mmNamesRes] = await Promise.all([
    fetch('/data/quran_surahs.csv'),
    fetch('/data/surah_mm_name.csv'),
  ])
  const [surahsText, mmText] = await Promise.all([surahsRes.text(), mmNamesRes.text()])

  const surahs = parseSurahsMeta(surahsText)
  const mmNames = parseMyanmarNames(mmText)
  for (const s of surahs) {
    s.myanmarName = mmNames.get(s.number) ?? ''
  }
  surahMetaCache = surahs
  return surahs
}

export async function loadAyats(surahNumber: number): Promise<AyatRow[]> {
  const cached = ayatCache.get(surahNumber)
  if (cached) return cached

  const pad = padSurah(surahNumber)
  const res = await fetch(`/data/${pad}.csv`)
  const text = await res.text()
  const rows = parseAyats(text)
  ayatCache.set(surahNumber, rows)
  return rows
}

export async function loadNotes(surahNumber: number): Promise<NoteRow[]> {
  const cached = notesCache.get(surahNumber)
  if (cached) return cached

  const pad = padSurah(surahNumber)
  const res = await fetch(`/data/${pad}_notes.csv`)
  const text = await res.text()
  const rows = parseNotes(text)
  notesCache.set(surahNumber, rows)
  return rows
}
