import { useState, useEffect, useCallback, useRef } from 'react'
import { loadSurahMeta, loadAyats, loadNotes } from '../data/surah.ts'
import { loadArabicAyats, getArabicAyat } from '../data/arabic.ts'
import { buildNotesIndex, ayatIdsOf, ayatLabel } from '../data/csv.ts'
import type { SurahMeta, AyatRow, NoteRow, ArabicAyat, FontScale, AppPrefs } from '../data/types.ts'

// Ports: JumpStep (QuranModels.kt:15). Android also stores the card list's
// scroll index/offset to restore it on return; the PWA lands at the card top.
export interface JumpStep {
  surahId: number
  ayatId: number
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
  jumpHistory: JumpStep[]
  loading: boolean
  error: Error | null
}

export interface SurahActions {
  goTo: (surahId: number, ayatId: number) => void
  prevSurah: () => void
  nextSurah: () => void
  prevPage: () => void
  nextPage: () => void
  setArabicScale: (s: FontScale) => void
  setMyanmarScale: (s: FontScale) => void
  setNoteScale: (s: FontScale) => void
  jumpFromLink: (surahId: number, ayatId: number) => void
  goToHistoryStep: (index: number) => void
  clearHistory: () => void
  scaleArabic: (delta: -1 | 1) => void
  scaleMyanmar: (delta: -1 | 1) => void
  scaleNote: (delta: -1 | 1) => void
  getCurrentRow: () => AyatRow | undefined
  getArabicText: () => string
  getNotesForPage: () => NoteRow[]
  getArabicTextAt: (index: number) => string
  getNotesAt: (index: number) => NoteRow[]
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

// Re-exported so feature components get the ayat label without importing data/
export { ayatLabel }

function toEasternArabicNumeral(n: number): string {
  return String(n)
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) + 1584))
    .join('')
}

function pageIndexForAyat(ayats: AyatRow[], ayatId: number): number {
  const idx = ayats.findIndex((row) => ayatIdsOf(row).includes(ayatId))
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
  const [arabicFontScale, setArabicFontScaleState] = useState<FontScale>(prefs.arabicFontScale)
  const [myanmarFontScale, setMyanmarFontScaleState] = useState<FontScale>(prefs.myanmarFontScale)
  const [noteFontScale, setNoteFontScaleState] = useState<FontScale>(prefs.noteFontScale)
  const [jumpHistory, setJumpHistory] = useState<JumpStep[]>([])
  // MainActivity.kt:247 — isHistoryActive. A flag, not a size check, is what
  // marks "inside a jump"; only a [surah:ayat] link sets it.
  const historyActive = useRef(false)
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
    (newSurahId: number, newAyatId: number) => {
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
    [surahId, scheduleSave],
  )

  // MainActivity.kt:400 — the ayat a page reports to history: the first id of a
  // combined row ("1-2" → 1), else the row's own id.
  const ayatIdAt = useCallback(
    (index: number): number | null => {
      const row = pageData.ayats[index]
      if (!row) return null
      return ayatIdsOf(row)[0] ?? row.ayatId
    },
    [pageData.ayats],
  )

  const prevSurah = useCallback(() => {
    if (surahId <= 1) return
    initialAyat.current = 1
    setSurahId((s) => s - 1)
    scheduleSave(surahId - 1, 1)
  }, [surahId, scheduleSave])

  const nextSurah = useCallback(() => {
    if (surahId >= 114) return
    initialAyat.current = 1
    setSurahId((s) => s + 1)
    scheduleSave(surahId + 1, 1)
  }, [surahId, scheduleSave])

  const prevPage = useCallback(() => {
    if (pageData.pageIndex > 0) {
      const newIndex = pageData.pageIndex - 1
      const newAyatId = pageData.ayats[newIndex]?.ayatId ?? 1
      setPageData((prev) => ({ ...prev, pageIndex: newIndex }))
      scheduleSave(surahId, newAyatId)
    } else if (prefs.continuousSwiping && surahId > 1) {
      prevSurah()
    }
  }, [pageData.pageIndex, pageData.ayats, prefs.continuousSwiping, surahId, prevSurah, scheduleSave])

  const nextPage = useCallback(() => {
    if (pageData.pageIndex < pageData.ayats.length - 1) {
      const newIndex = pageData.pageIndex + 1
      const newAyatId = pageData.ayats[newIndex]?.ayatId ?? 1
      setPageData((prev) => ({ ...prev, pageIndex: newIndex }))
      scheduleSave(surahId, newAyatId)
    } else if (prefs.continuousSwiping && surahId < 114) {
      nextSurah()
    }
  }, [pageData.pageIndex, pageData.ayats, prefs.continuousSwiping, surahId, nextSurah, scheduleSave])

  // MainActivity.kt:397-403 (activateHistoryIfNeeded) + :587-594. Only a
  // [surah:ayat] link starts a session; its first step is the pre-jump spot.
  const jumpFromLink = useCallback(
    (targetSurah: number, targetAyat: number) => {
      if (!historyActive.current) {
        historyActive.current = true
        setJumpHistory([{ surahId, ayatId: ayatIdAt(pageData.pageIndex) ?? 1 }])
      }
      goTo(targetSurah, targetAyat)
    },
    [surahId, pageData.pageIndex, ayatIdAt, goTo],
  )

  // MainActivity.kt:405-428 — while a session is active, every page the reader
  // settles on becomes a step (a repeat of an earlier step moves to the end);
  // settling back on the original spot ends the session and wipes the history.
  useEffect(() => {
    if (!historyActive.current || loading) return
    const ayatId = ayatIdAt(pageData.pageIndex)
    const first = jumpHistory[0]
    if (ayatId === null || !first) return
    const last = jumpHistory[jumpHistory.length - 1]
    const atOrigin = first.surahId === surahId && first.ayatId === ayatId
    const atLast = last !== undefined && last.surahId === surahId && last.ayatId === ayatId
    if (!atOrigin && atLast) return
    const timer = setTimeout(() => {
      if (atOrigin) {
        historyActive.current = false
        setJumpHistory([])
        return
      }
      const others = jumpHistory
        .slice(1)
        .filter((step) => !(step.surahId === surahId && step.ayatId === ayatId))
      setJumpHistory([first, ...others, { surahId, ayatId }])
    }, 500)
    return () => clearTimeout(timer)
  }, [surahId, pageData.pageIndex, ayatIdAt, jumpHistory, loading])

  // MainActivity.kt:1282-1292 (dialog row) and :1506-1516 (icon shortcut, which
  // is step 0). Step 0 ends the session; a later step truncates the stack to it.
  const goToHistoryStep = useCallback(
    (index: number) => {
      const step = jumpHistory[index]
      if (!step) return
      if (index === 0) {
        historyActive.current = false
        setJumpHistory([])
      } else {
        setJumpHistory((h) => h.slice(0, index + 1))
      }
      goTo(step.surahId, step.ayatId)
    },
    [jumpHistory, goTo],
  )

  // MainActivity.kt:1299 — "Clear History" ends the session without navigating.
  const clearHistory = useCallback(() => {
    historyActive.current = false
    setJumpHistory([])
  }, [])

  const getCurrentRow = useCallback(
    (): AyatRow | undefined => pageData.ayats[pageData.pageIndex],
    [pageData],
  )

  const getArabicText = useCallback((): string => {
    const row = pageData.ayats[pageData.pageIndex]
    if (!row) return ''
    return ayatIdsOf(row)
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

  const getArabicTextAt = useCallback(
    (index: number): string => {
      const row = pageData.ayats[index]
      if (!row) return ''
      return ayatIdsOf(row)
        .map((id) => {
          const ar = getArabicAyat(arabicAyats, surahId, id)
          if (!ar) return ''
          return `${ar} ۝${toEasternArabicNumeral(id)}`
        })
        .filter(Boolean)
        .join(' ')
    },
    [pageData.ayats, arabicAyats, surahId],
  )

  const getNotesAt = useCallback(
    (index: number): NoteRow[] => {
      const row = pageData.ayats[index]
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
    },
    [pageData.ayats, notesIndex],
  )

  const scaleArabic = useCallback(
    (delta: -1 | 1) => setArabicFontScaleState((s) => {
      const next = clampScale(s, delta)
      onPrefsUpdate({ arabicFontScale: next })
      return next
    }),
    [],
  )
  const scaleMyanmar = useCallback(
    (delta: -1 | 1) => setMyanmarFontScaleState((s) => {
      const next = clampScale(s, delta)
      onPrefsUpdate({ myanmarFontScale: next })
      return next
    }),
    [],
  )
  const scaleNote = useCallback(
    (delta: -1 | 1) => setNoteFontScaleState((s) => {
      const next = clampScale(s, delta)
      onPrefsUpdate({ noteFontScale: next })
      return next
    }),
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
    jumpFromLink,
    goToHistoryStep,
    clearHistory,
    scaleArabic,
    scaleMyanmar,
    scaleNote,
    getCurrentRow,
    getArabicText,
    getNotesForPage,
    getArabicTextAt,
    getNotesAt,
  }

  return [state, actions]
}
