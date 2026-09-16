import { useState, useEffect, useCallback, useRef } from 'react'
import { loadSurahMeta, loadAyats, loadNotes } from '../data/surah.ts'
import { loadArabicAyats, getArabicAyat } from '../data/arabic.ts'
import { buildNotesIndex } from '../data/csv.ts'
import type { SurahMeta, AyatRow, NoteRow, ArabicAyat, FontScale, AppPrefs } from '../data/types.ts'

export interface JumpTarget {
  surahId: number
  pageIndex: number
}

export interface SurahState {
  surahs: SurahMeta[]
  ayats: AyatRow[]
  notes: NoteRow[]
  arabicAyats: ArabicAyat[]
  surahId: number
  pageIndex: number
  arabicFontScale: FontScale
  myanmarFontScale: FontScale
  noteFontScale: FontScale
  jumpHistory: JumpTarget[]
  loading: boolean
  error: Error | null
}

export interface SurahActions {
  goTo: (surahId: number, ayatId: number, pushHistory?: boolean) => void
  prevSurah: () => void
  nextSurah: () => void
  prevPage: () => void
  nextPage: () => void
  setArabicScale: (s: FontScale) => void
  setMyanmarScale: (s: FontScale) => void
  setNoteScale: (s: FontScale) => void
  handleHistoryClick: () => void
  scaleArabic: (delta: -1 | 1) => void
  scaleMyanmar: (delta: -1 | 1) => void
  scaleNote: (delta: -1 | 1) => void
  getCurrentRow: () => AyatRow | undefined
  getArabicText: () => string
  getNotesForPage: () => NoteRow[]
}

const SCALE_STEPS: FontScale[] = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5]

function clampScale(s: FontScale, delta: -1 | 1): FontScale {
  const idx = SCALE_STEPS.indexOf(s)
  const next = SCALE_STEPS[Math.max(0, Math.min(SCALE_STEPS.length - 1, idx + delta))]
  return next ?? s
}

// Regex from MainActivity.kt:1761 — footnote markers in translation text
// Preceded by whitespace; followed by whitespace, Myanmar full-stop ။, comma, or end of string
const FOOTNOTE_MARKER_RE = /(?<=\s)\d+[a-zA-Z]?(?=[\s။,]|$)/g

// Regex from MainActivity.kt:1767 — cross-reference links [2:255]
const CROSSREF_RE = /\[\d+:[\d,-]+\]/g

// Regex from MainActivity.kt:1778 — footnote labels at start of line in notes [1a]
const NOTE_LABEL_RE = /^\[\d+[a-zA-Z]?\]/gm

export { FOOTNOTE_MARKER_RE, CROSSREF_RE, NOTE_LABEL_RE }

function toEasternArabicNumeral(n: number): string {
  return String(n)
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) + 1584))
    .join('')
}

function parseAyatIds(multiStr: string): number[] {
  if (!multiStr) return []
  const parts = multiStr.split('-')
  if (parts.length === 2) {
    const start = parseInt(parts[0] ?? '0', 10)
    const end = parseInt(parts[1] ?? '0', 10)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  return [parseInt(multiStr, 10)]
}

function pageIndexForAyat(ayats: AyatRow[], ayatId: number): number {
  const idx = ayats.findIndex((row) => {
    if (row.ayatId === ayatId) return true
    if (!row.multiAyats) return false
    const ids = parseAyatIds(row.multiAyats)
    return ids.includes(ayatId)
  })
  return idx >= 0 ? idx : 0
}

interface PageData {
  ayats: AyatRow[]
  notes: NoteRow[]
  pageIndex: number
  loadedSurahId: number | null
}

export function useSurah(
  prefs: AppPrefs,
  onPrefsUpdate: (patch: Partial<AppPrefs>) => void,
): [SurahState, SurahActions] {
  const [surahs, setSurahs] = useState<SurahMeta[]>([])
  const [arabicAyats, setArabicAyats] = useState<ArabicAyat[]>([])
  const [surahId, setSurahId] = useState(prefs.lastSurah)
  const [pageData, setPageData] = useState<PageData>({
    ayats: [],
    notes: [],
    pageIndex: 0,
    loadedSurahId: null,
  })
  const [arabicFontScale, setArabicFontScaleState] = useState<FontScale>(1.0)
  const [myanmarFontScale, setMyanmarFontScaleState] = useState<FontScale>(1.0)
  const [noteFontScale, setNoteFontScaleState] = useState<FontScale>(1.0)
  const [jumpHistory, setJumpHistory] = useState<JumpTarget[]>([])
  const [error, setError] = useState<Error | null>(null)

  // loading is derived — true whenever surahId doesn't match what's loaded
  const loading = pageData.loadedSurahId !== surahId

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialAyat = useRef(prefs.lastAyat)

  // Load surah meta + arabic dataset once
  useEffect(() => {
    Promise.all([loadSurahMeta(), loadArabicAyats()])
      .then(([meta, arabic]) => {
        setSurahs(meta)
        setArabicAyats(arabic)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))))
  }, [])

  // Load surah CSV data when surahId changes; single setState keeps renders batched
  useEffect(() => {
    Promise.all([loadAyats(surahId), loadNotes(surahId)])
      .then(([a, n]) => {
        const targetAyat = initialAyat.current
        initialAyat.current = 0
        const newPageIndex = targetAyat > 0 ? pageIndexForAyat(a, targetAyat) : 0
        setPageData({ ayats: a, notes: n, pageIndex: newPageIndex, loadedSurahId: surahId })
      })
      .catch((err: unknown) => setError(err instanceof Error ? err : new Error(String(err))))
  }, [surahId])

  const scheduleSave = useCallback(
    (sid: number, ayatId: number) => {
      if (!prefs.rememberLastRead) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => onPrefsUpdate({ lastSurah: sid, lastAyat: ayatId }), 500)
    },
    [prefs.rememberLastRead, onPrefsUpdate],
  )

  const goTo = useCallback(
    (newSurahId: number, newAyatId: number, pushHistory = false) => {
      if (pushHistory) {
        setJumpHistory((h) => [...h, { surahId, pageIndex: pageData.pageIndex }])
      }
      if (newSurahId !== surahId) {
        initialAyat.current = newAyatId
        setSurahId(newSurahId)
      } else {
        setPageData((prev) => ({
          ...prev,
          pageIndex: pageIndexForAyat(prev.ayats, newAyatId),
        }))
      }
      scheduleSave(newSurahId, newAyatId)
    },
    [surahId, pageData.pageIndex, scheduleSave],
  )

  const prevSurah = useCallback(() => {
    if (surahId <= 1) return
    initialAyat.current = 1
    setSurahId((s) => s - 1)
  }, [surahId])

  const nextSurah = useCallback(() => {
    if (surahId >= 114) return
    initialAyat.current = 1
    setSurahId((s) => s + 1)
  }, [surahId])

  const prevPage = useCallback(() => {
    if (pageData.pageIndex > 0) {
      setPageData((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))
    } else if (prefs.continuousSwiping && surahId > 1) {
      prevSurah()
    }
  }, [pageData.pageIndex, prefs.continuousSwiping, surahId, prevSurah])

  const nextPage = useCallback(() => {
    if (pageData.pageIndex < pageData.ayats.length - 1) {
      setPageData((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))
    } else if (prefs.continuousSwiping && surahId < 114) {
      nextSurah()
    }
  }, [pageData.pageIndex, pageData.ayats.length, prefs.continuousSwiping, surahId, nextSurah])

  const handleHistoryClick = useCallback(() => {
    if (jumpHistory.length === 0) return
    if (jumpHistory.length <= 2) {
      const origin = jumpHistory[0]
      if (origin) {
        if (origin.surahId !== surahId) {
          initialAyat.current = pageData.ayats[origin.pageIndex]?.ayatId ?? 1
          setSurahId(origin.surahId)
        } else {
          setPageData((prev) => ({ ...prev, pageIndex: origin.pageIndex }))
        }
        setJumpHistory([])
      }
    }
    // >2: caller should open Jump History dialog
  }, [jumpHistory, surahId, pageData.ayats])

  const getCurrentRow = useCallback(
    (): AyatRow | undefined => pageData.ayats[pageData.pageIndex],
    [pageData],
  )

  const getArabicText = useCallback((): string => {
    const row = pageData.ayats[pageData.pageIndex]
    if (!row) return ''
    const ids = row.multiAyats ? parseAyatIds(row.multiAyats) : [row.ayatId]
    return ids
      .map((id) => {
        const ar = getArabicAyat(arabicAyats, surahId, id)
        if (!ar) return ''
        return `${ar} ۝${toEasternArabicNumeral(id)}`
      })
      .filter(Boolean)
      .join(' ')
  }, [pageData, arabicAyats, surahId])

  const notesIndex = buildNotesIndex(pageData.notes)

  const getNotesForPage = useCallback((): NoteRow[] => {
    const row = pageData.ayats[pageData.pageIndex]
    if (!row) return []
    const translationText = (row.mmTranslation.split('@')[0] ?? '').replace(/#/g, '\n')
    const markers = [...translationText.matchAll(new RegExp(FOOTNOTE_MARKER_RE.source, 'g'))].map(
      (m) => m[0]!,
    )
    const unique = [...new Set(markers)]
    return unique
      .map((m) => {
        const explanation = notesIndex.get(m)
        return explanation !== undefined ? { notesId: m, explanation } : null
      })
      .filter((n): n is NoteRow => n !== null)
  }, [pageData, notesIndex])

  const scaleArabic = useCallback(
    (delta: -1 | 1) => setArabicFontScaleState((s) => clampScale(s, delta)),
    [],
  )
  const scaleMyanmar = useCallback(
    (delta: -1 | 1) => setMyanmarFontScaleState((s) => clampScale(s, delta)),
    [],
  )
  const scaleNote = useCallback(
    (delta: -1 | 1) => setNoteFontScaleState((s) => clampScale(s, delta)),
    [],
  )

  const state: SurahState = {
    surahs,
    ayats: pageData.ayats,
    notes: pageData.notes,
    arabicAyats,
    surahId,
    pageIndex: pageData.pageIndex,
    arabicFontScale,
    myanmarFontScale,
    noteFontScale,
    jumpHistory,
    loading,
    error,
  }

  const actions: SurahActions = {
    goTo,
    prevSurah,
    nextSurah,
    prevPage,
    nextPage,
    setArabicScale: setArabicFontScaleState,
    setMyanmarScale: setMyanmarFontScaleState,
    setNoteScale: setNoteFontScaleState,
    handleHistoryClick,
    scaleArabic,
    scaleMyanmar,
    scaleNote,
    getCurrentRow,
    getArabicText,
    getNotesForPage,
  }

  return [state, actions]
}
