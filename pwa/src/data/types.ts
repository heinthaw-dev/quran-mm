export type AppTheme = 'BLUE' | 'GREEN' | 'PINK' | 'BROWN'

export interface ThemeTokens {
  primary: string
  bg: string
  card: string
}

export const THEME_TOKENS: Record<AppTheme, ThemeTokens> = {
  BLUE: { primary: '#4B559C', bg: '#F0F4F8', card: '#D4E6FF' },
  GREEN: { primary: '#2E7D32', bg: '#E8F5E9', card: '#C8E6C9' },
  PINK: { primary: '#D81B60', bg: '#FCE4EC', card: '#F8BBD0' },
  BROWN: { primary: '#5D4037', bg: '#EFEBE9', card: '#D7CCC8' },
}

export interface SurahMeta {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  revelationType: string
  myanmarName: string
}

export interface AyatRow {
  ayatId: number
  mmTranslation: string
  multiAyats: string
}

export interface NoteRow {
  notesId: string
  explanation: string
}

export interface ArabicAyat {
  surahNo: number
  ayahNoSurah: number
  ayahAr: string
}

export type FontScale = 0.8 | 0.9 | 1.0 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5

export interface AppPrefs {
  theme: AppTheme
  lastSurah: number
  lastAyat: number
  rememberLastRead: boolean
  continuousSwiping: boolean
  arabicFontScale: FontScale
  myanmarFontScale: FontScale
  noteFontScale: FontScale
}

export const DEFAULT_PREFS: AppPrefs = {
  theme: 'BLUE',
  lastSurah: 1,
  lastAyat: 1,
  rememberLastRead: true,
  continuousSwiping: true,
  arabicFontScale: 1.0,
  myanmarFontScale: 1.0,
  noteFontScale: 1.0,
}
