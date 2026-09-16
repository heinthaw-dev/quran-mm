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
