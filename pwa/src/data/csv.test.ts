import { describe, it, expect } from 'vitest'
import {
  parseAyats,
  parseNotes,
  parseSurahsMeta,
  parseMyanmarNames,
  buildNotesIndex,
} from './csv.ts'

// Fixture uses CRLF endings and trailing CRLF, matching real NNN.csv format
const AYATS_CSV =
  '"Ayat_id","mm_Translation","multi_ayats"\r\n' +
  '0,"ရဟ်မာန် နှင့် ရဟီးမ်",""\r\n' +
  '1,"ဖွံ့ဖြိုးစေသော 2 အလ္လာဟ်","1-2"\r\n' +
  '3,"ကာလ 4 ကို စိုးပိုင်",""\r\n'

const NOTES_CSV =
  '"notes_id","explanation"\r\n' +
  '1,"မှတ်ချက် တစ်ခု"\r\n' +
  '2,"မှတ်ချက်, ကော်မာပါ"\r\n' +
  '13,"နောက်ဆုံး ၁–၁ မှတ်ချက်"\r\n'

// 002_notes edge cases: missing 171, has 217a/217b
const NOTES_CSV_EDGE =
  '"notes_id","explanation"\r\n' +
  '170,"ပုံမှန်"\r\n' +
  '172,"ကျော်သွားသော 171"\r\n' +
  '217a,"a မျိုး"\r\n' +
  '217b,"b မျိုး"\r\n'

const SURAHS_CSV =
  'number,name,englishName,englishNameTranslation,numberOfAyahs,revelationType\n' +
  '1,سُوْرَةُ الْحَمْدِ,Al-hamd,The Opening,6,Meccan\n' +
  '2,سُورَةُ البَقَرَةِ,Al-Baqara,The Cow,286,Medinan\n'

const MM_NAMES_CSV =
  '"surah_id","surah_myanmar_name"\r\n' + '1,"အဖွင့်"\r\n' + '2,"နွားမ"\r\n'

describe('parseAyats', () => {
  it('parses rows correctly', () => {
    const rows = parseAyats(AYATS_CSV)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ ayatId: 0, mmTranslation: 'ရဟ်မာန် နှင့် ရဟီးမ်', multiAyats: '' })
    expect(rows[1]).toEqual({ ayatId: 1, mmTranslation: 'ဖွံ့ဖြိုးစေသော 2 အလ္လာဟ်', multiAyats: '1-2' })
  })

  it('first ayat_id is 0 for surah 1', () => {
    const rows = parseAyats(AYATS_CSV)
    expect(rows[0]?.ayatId).toBe(0)
  })
})

describe('parseNotes', () => {
  it('preserves note ID as string', () => {
    const rows = parseNotes(NOTES_CSV)
    expect(rows[0]?.notesId).toBe('1')
    expect(rows[2]?.notesId).toBe('13')
  })

  it('handles comma inside quoted field', () => {
    const rows = parseNotes(NOTES_CSV)
    expect(rows[1]?.explanation).toBe('မှတ်ချက်, ကော်မာပါ')
  })

  it('handles alpha note IDs (217a, 217b) and skipped IDs', () => {
    const rows = parseNotes(NOTES_CSV_EDGE)
    const ids = rows.map((r) => r.notesId)
    expect(ids).toContain('217a')
    expect(ids).toContain('217b')
    expect(ids).not.toContain('171')
  })
})

describe('parseSurahsMeta', () => {
  it('parses LF-only CSV', () => {
    const rows = parseSurahsMeta(SURAHS_CSV)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ number: 1, englishName: 'Al-hamd', numberOfAyahs: 6 })
    expect(rows[1]).toMatchObject({ number: 2, englishName: 'Al-Baqara', numberOfAyahs: 286 })
  })
})

describe('parseMyanmarNames', () => {
  it('returns map keyed by surah number', () => {
    const map = parseMyanmarNames(MM_NAMES_CSV)
    expect(map.get(1)).toBe('အဖွင့်')
    expect(map.get(2)).toBe('နွားမ')
  })
})

describe('buildNotesIndex', () => {
  it('looks up by string ID', () => {
    const rows = parseNotes(NOTES_CSV_EDGE)
    const idx = buildNotesIndex(rows)
    expect(idx.get('217a')).toBe('a မျိုး')
    expect(idx.get('217b')).toBe('b မျိုး')
    expect(idx.get('171')).toBeUndefined()
  })
})
