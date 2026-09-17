// Ports: QuranMMApp / Scaffold + HorizontalPager (MainActivity.kt:188)
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AppPrefs, AppTheme } from '../../data/types.ts'
import { useSurah } from '../../hooks/useSurah.ts'
import { NavDrawer } from '../nav-drawer/NavDrawer.tsx'
import { SelectThemeDialog } from '../dialog-select-theme/SelectThemeDialog.tsx'
import { AboutDialog } from '../dialog-about/AboutDialog.tsx'
import { SelectSurahsToDownloadDialog } from '../audio-download/SelectSurahsToDownloadDialog.tsx'
import { SelectAudioToDeleteDialog } from '../audio-delete/SelectAudioToDeleteDialog.tsx'
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

  // Sliding pager — 3 slides (prev, current, next) move together during drag.
  // Phase drives the track's translateX and transition presence.
  type SwipePhase = 'idle' | 'dragging' | 'snapping-next' | 'snapping-prev' | 'snapping-back'
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  // 'pending' until we know direction; then locked for the rest of the touch.
  const gestureDir = useRef<'pending' | 'horizontal' | 'vertical'>('pending')
  const slotWidth = useRef(typeof window !== 'undefined' ? window.innerWidth : 390)
  const pagerRef = useRef<HTMLDivElement>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [phase, setPhase] = useState<SwipePhase>('idle')

  // Non-passive native listener so preventDefault() works on iOS Safari.
  // Only blocks default scroll once we've confirmed horizontal intent.
  useEffect(() => {
    const el = pagerRef.current
    if (!el) return
    const syncWidth = () => { slotWidth.current = el.clientWidth }
    syncWidth()
    window.addEventListener('resize', syncWidth)
    const onMove = (e: TouchEvent) => {
      if (gestureDir.current === 'horizontal') e.preventDefault()
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => {
      window.removeEventListener('resize', syncWidth)
      el.removeEventListener('touchmove', onMove)
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    slotWidth.current = pagerRef.current?.clientWidth ?? window.innerWidth
    touchStartX.current = e.touches[0]?.clientX ?? null
    touchStartY.current = e.touches[0]?.clientY ?? null
    gestureDir.current = 'pending'
    // Don't set phase='dragging' yet — wait until direction is confirmed.
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const touch = e.touches[0]
    if (!touch) return
    const dx = touch.clientX - touchStartX.current
    const dy = touch.clientY - touchStartY.current
    if (gestureDir.current === 'pending') {
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (adx < 5 && ady < 5) return // not enough movement yet
      gestureDir.current = adx > ady ? 'horizontal' : 'vertical'
    }
    if (gestureDir.current === 'vertical') return // let the slide scroll normally
    setDragOffset(dx)
    setPhase('dragging')
  }, [])

  const handleTouchEnd = useCallback(
    (currentDragOffset: number) => {
      const threshold = 60
      touchStartX.current = null
      touchStartY.current = null
      const wasHorizontal = gestureDir.current === 'horizontal'
      gestureDir.current = 'pending'
      setDragOffset(0)
      if (!wasHorizontal) {
        setPhase('idle')
        return
      }
      if (currentDragOffset < -threshold) {
        setPhase('snapping-next')
      } else if (currentDragOffset > threshold) {
        setPhase('snapping-prev')
      } else {
        setPhase('snapping-back')
      }
    },
    [],
  )

  const handleTransitionEnd = useCallback(() => {
    if (phase === 'snapping-next') {
      setPhase('idle')
      actions.nextPage()
    } else if (phase === 'snapping-prev') {
      setPhase('idle')
      actions.prevPage()
    } else {
      setPhase('idle')
    }
  }, [phase, actions])

  const handleJump = useCallback(
    (targetSurah: number, targetAyat: number) => {
      actions.goTo(targetSurah, targetAyat, true)
    },
    [actions],
  )

  const [drawerOpen, setDrawerOpen] = useState(
    () => new URLSearchParams(window.location.search).has('drawer'),
  )
  const handleMenuClick = useCallback(() => setDrawerOpen(true), [])
  const handleDrawerClose = useCallback(() => setDrawerOpen(false), [])

  // Stub handlers for audio (feature not yet implemented)
  const handleToggleAudio = useCallback(() => {}, [])
  const handleToggleAutoTracking = useCallback(() => {}, [])
  const handlePlayAyat = useCallback(() => {}, [])
  const handlePlaySurahFromHere = useCallback(() => {}, [])

  // Stub handlers for unbuilt dialogs
  const handleSurahChipClick = useCallback(() => {}, [])
  const handleAyatChipClick = useCallback(() => {}, [])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(
    () => new URLSearchParams(window.location.search).get('dialog') === 'delete',
  )
  const handleDeleteDownloads = useCallback(() => {
    setDrawerOpen(false)
    setDeleteDialogOpen(true)
  }, [])
  const handleDeleteDialogClose = useCallback(() => setDeleteDialogOpen(false), [])

  const [downloadDialogOpen, setDownloadDialogOpen] = useState(
    () => new URLSearchParams(window.location.search).get('dialog') === 'download',
  )
  const handleDownloads = useCallback(() => {
    setDrawerOpen(false)
    setDownloadDialogOpen(true)
  }, [])
  const handleDownloadDialogClose = useCallback(() => setDownloadDialogOpen(false), [])
  const handleDownload = useCallback((_selected: Set<number>) => {
    // Audio download not yet implemented — pending HTTPS mirror URL
  }, [])

  const [aboutDialogOpen, setAboutDialogOpen] = useState(
    () => new URLSearchParams(window.location.search).get('dialog') === 'about',
  )
  const handleAbout = useCallback(() => {
    setDrawerOpen(false)
    setAboutDialogOpen(true)
  }, [])
  const handleAboutClose = useCallback(() => setAboutDialogOpen(false), [])

  const [themeDialogOpen, setThemeDialogOpen] = useState(
    () => new URLSearchParams(window.location.search).get('dialog') === 'theme',
  )
  const handleSelectTheme = useCallback(() => setThemeDialogOpen(true), [])
  const handleThemeSelect = useCallback(
    (theme: AppTheme) => onPrefsUpdate({ theme }),
    [onPrefsUpdate],
  )
  const handleThemeDialogClose = useCallback(() => setThemeDialogOpen(false), [])

  // Adjacent page data for the sliding pager
  const prevIndex = pageIndex - 1
  const nextIndex = pageIndex + 1
  const prevRow = state.ayats[prevIndex]
  const nextRow = state.ayats[nextIndex]
  const prevArabicText = prevRow ? actions.getArabicTextAt(prevIndex) : ''
  const nextArabicText = nextRow ? actions.getArabicTextAt(nextIndex) : ''
  const prevNotes = prevRow ? actions.getNotesAt(prevIndex) : []
  const nextNotes = nextRow ? actions.getNotesAt(nextIndex) : []

  // Track translate: center slot = -slotWidth. Dragging shifts by dragOffset.
  // Snapping-next targets -2*slotWidth, snapping-prev targets 0, back to -slotWidth.
  const w = slotWidth.current
  const trackX =
    phase === 'snapping-next'
      ? -w * 2
      : phase === 'snapping-prev'
        ? 0
        : -w + (phase === 'dragging' ? dragOffset : 0)
  const trackTransition =
    phase === 'snapping-next' || phase === 'snapping-prev' || phase === 'snapping-back'
      ? 'transform 0.28s ease'
      : 'none'

  return (
    <div
      className={styles.screen}
      data-screen="reader"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <NavDrawer
        open={drawerOpen}
        prefs={prefs}
        onClose={handleDrawerClose}
        onPrefsUpdate={onPrefsUpdate}
        onDownloads={handleDownloads}
        onDeleteDownloads={handleDeleteDownloads}
        onSelectTheme={handleSelectTheme}
        onAbout={handleAbout}
      />
      {themeDialogOpen && (
        <SelectThemeDialog onSelect={handleThemeSelect} onClose={handleThemeDialogClose} />
      )}
      {aboutDialogOpen && <AboutDialog onClose={handleAboutClose} />}
      {downloadDialogOpen && (
        <SelectSurahsToDownloadDialog onDownload={handleDownload} onClose={handleDownloadDialogClose} />
      )}
      {deleteDialogOpen && (
        <SelectAudioToDeleteDialog onClose={handleDeleteDialogClose} />
      )}
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
        ref={pagerRef}
        className={styles.pager}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => handleTouchEnd(dragOffset)}
      >
        <div
          className={styles.track}
          style={{ transform: `translateX(${trackX}px)`, transition: trackTransition }}
          onTransitionEnd={handleTransitionEnd}
        >
          {/* Prev slide */}
          <div className={styles.slide}>
            {prevRow && (
              <AyatPage
                surahId={surahId}
                surah={surah}
                row={prevRow}
                arabicText={prevArabicText}
                notesForPage={prevNotes}
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
          {/* Current slide */}
          <div className={styles.slide}>
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
          {/* Next slide */}
          <div className={styles.slide}>
            {nextRow && (
              <AyatPage
                surahId={surahId}
                surah={surah}
                row={nextRow}
                arabicText={nextArabicText}
                notesForPage={nextNotes}
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
      </div>
    </div>
  )
}
