// Ports: QuranMMApp / Scaffold + HorizontalPager (MainActivity.kt:188)
import { useCallback, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AppPrefs } from '../../data/types.ts'
import { useSurah } from '../../hooks/useSurah.ts'
import { TopBar } from './TopBar.tsx'
import { AyatPage } from './AyatPage.tsx'
import styles from './ReaderScreen.module.css'

interface Props {
  prefs: AppPrefs
  onPrefsUpdate: (patch: Partial<AppPrefs>) => void
}

export function ReaderScreen({ prefs, onPrefsUpdate }: Props) {
  const params = useParams<{ surah?: string; ayat?: string }>()

  // Merge deep-link params into prefs for initial load
  const effectivePrefs: AppPrefs = {
    ...prefs,
    lastSurah: params.surah ? parseInt(params.surah, 10) : prefs.lastSurah,
    lastAyat: params.ayat ? parseInt(params.ayat, 10) : prefs.lastAyat,
  }

  const [state, actions] = useSurah(effectivePrefs, onPrefsUpdate)

  const {
    surahs,
    surahId,
    pageIndex,
    arabicFontScale,
    myanmarFontScale,
    noteFontScale,
    jumpHistory,
    loading,
  } = state

  const surah = surahs.find((s) => s.number === surahId)
  const totalAyats = surah?.numberOfAyahs ?? 1
  const totalPages = state.ayats.length
  const currentRow = actions.getCurrentRow()
  const currentAyatId = currentRow?.ayatId ?? 1
  const arabicText = actions.getArabicText()
  const notesForPage = actions.getNotesForPage()

  // Swipe detection for pager
  const touchStartX = useRef<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
    setIsSwiping(true)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const dx = (e.touches[0]?.clientX ?? 0) - touchStartX.current
      setSwipeOffset(dx)
    },
    [],
  )

  const handleTouchEnd = useCallback(() => {
    const threshold = 60
    if (swipeOffset < -threshold) {
      actions.nextPage()
    } else if (swipeOffset > threshold) {
      actions.prevPage()
    }
    touchStartX.current = null
    setSwipeOffset(0)
    setIsSwiping(false)
  }, [swipeOffset, actions])

  const handleJump = useCallback(
    (targetSurah: number, targetAyat: number) => {
      actions.goTo(targetSurah, targetAyat, true)
    },
    [actions],
  )

  // Stub handlers for audio (feature not yet implemented)
  const handleToggleAudio = useCallback(() => {}, [])
  const handleToggleAutoTracking = useCallback(() => {}, [])
  const handlePlayAyat = useCallback(() => {}, [])
  const handlePlaySurahFromHere = useCallback(() => {}, [])

  // Stub handlers for dialogs
  const handleMenuClick = useCallback(() => {}, [])
  const handleSurahChipClick = useCallback(() => {}, [])
  const handleAyatChipClick = useCallback(() => {}, [])

  return (
    <div
      className={styles.screen}
      data-screen="reader"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <TopBar
        surahId={surahId}
        pageIndex={pageIndex}
        totalPages={totalPages}
        currentAyatId={currentAyatId}
        totalAyats={totalAyats}
        surah={surah}
        jumpHistory={jumpHistory}
        audioPlaying={false}
        autoTracking={false}
        audioAvailable={false}
        onMenuClick={handleMenuClick}
        onPrevSurah={actions.prevSurah}
        onNextSurah={actions.nextSurah}
        onPrevPage={actions.prevPage}
        onNextPage={actions.nextPage}
        onSurahChipClick={handleSurahChipClick}
        onAyatChipClick={handleAyatChipClick}
        onHistoryClick={actions.handleHistoryClick}
        onToggleAudio={handleToggleAudio}
        onToggleAutoTracking={handleToggleAutoTracking}
      />

      <div
        className={styles.pager}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isSwiping ? `translateX(${swipeOffset}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s ease',
        }}
      >
        {loading ? (
          <div className={styles.loading} />
        ) : (
          <AyatPage
            surahId={surahId}
            surah={surah}
            row={currentRow}
            arabicText={arabicText}
            notesForPage={notesForPage}
            arabicFontScale={arabicFontScale}
            myanmarFontScale={myanmarFontScale}
            noteFontScale={noteFontScale}
            audioPlaying={false}
            audioLoaded={false}
            onPlayAyat={handlePlayAyat}
            onPlaySurahFromHere={handlePlaySurahFromHere}
            onScaleArabic={actions.scaleArabic}
            onScaleMyanmar={actions.scaleMyanmar}
            onScaleNote={actions.scaleNote}
            onJump={handleJump}
          />
        )}
      </div>
    </div>
  )
}
