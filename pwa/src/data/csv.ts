import Papa from 'papaparse'
import type { AyatRow, NoteRow, SurahMeta, ArabicAyat } from './types.ts'

export function parseAyats(csvText: string): AyatRow[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.map((row) => ({
    ayatId: parseInt(row['Ayat_id'] ?? '0', 10),
    mmTranslation: row['mm_Translation'] ?? '',
    multiAyats: row['multi_ayats'] ?? '',
  }))
}

export function parseNotes(csvText: string): NoteRow[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.map((row) => ({
    notesId: row['notes_id'] ?? '',
    explanation: row['explanation'] ?? '',
  }))
}

export function parseSurahsMeta(csvText: string): SurahMeta[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.map((row) => ({
    number: parseInt(row['number'] ?? '0', 10),
    name: row['name'] ?? '',
    englishName: row['englishName'] ?? '',
    englishNameTranslation: row['englishNameTranslation'] ?? '',
    numberOfAyahs: parseInt(row['numberOfAyahs'] ?? '0', 10),
    revelationType: row['revelationType'] ?? '',
    myanmarName: '',
  }))
}

export function parseMyanmarNames(csvText: string): Map<number, string> {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  const map = new Map<number, string>()
  for (const row of result.data) {
    const id = parseInt(row['surah_id'] ?? '0', 10)
    map.set(id, row['surah_myanmar_name'] ?? '')
  }
  return map
}

export function parseArabicAyats(csvText: string): ArabicAyat[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data.map((row) => ({
    surahNo: parseInt(row['surah_no'] ?? '0', 10),
    ayahNoSurah: parseInt(row['ayah_no_surah'] ?? '0', 10),
    ayahAr: row['ayah_ar'] ?? '',
  }))
}

export function buildNotesIndex(notes: NoteRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const n of notes) {
    map.set(n.notesId, n.explanation)
  }
  return map
}

// MainActivity.kt:683-690 — a blank multi_ayats cell falls back to the row's
// own Ayat_id, and the raw cell ("1-2") is what the UI shows as the ayat number.
export function ayatLabel(row: AyatRow | undefined): string {
  if (!row) return '1'
  return row.multiAyats || String(row.ayatId)
}

// MainActivity.kt:131-143 — expand "1-2" into [1, 2]; a plain "3" into [3].
export function parseAyatIds(multiStr: string): number[] {
  const cleaned = multiStr.replace(/[^\d-]/g, '')
  if (!cleaned) return []
  const parts = cleaned.split('-')
  if (parts.length === 2) {
    const start = parseInt(parts[0] ?? '', 10)
    const end = parseInt(parts[1] ?? '', 10)
    if (isNaN(start) || isNaN(end) || end < start) return []
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  const single = parseInt(cleaned, 10)
  return isNaN(single) ? [] : [single]
}

// Every ayat id a row covers, in CSV order.
export function ayatIdsOf(row: AyatRow): number[] {
  return parseAyatIds(ayatLabel(row))
}
