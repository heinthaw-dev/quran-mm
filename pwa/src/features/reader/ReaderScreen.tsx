// Ports: QuranMMApp / Scaffold + HorizontalPager (MainActivity.kt:188)
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AppPrefs, AppTheme } from '../../data/types.ts'
import { useSurah, ayatLabel, ayatIdsOf } from '../../hooks/useSurah.ts'
import { useAudio } from '../../hooks/useAudio.ts'
import { useAudioDownload } from '../../hooks/useAudioDownload.ts'
import type { SurahDownloadJob } from '../../data/audioDownload.ts'
import { NavDrawer } from '../nav-drawer/NavDrawer.tsx'
import { SelectThemeDialog } from '../dialog-select-theme/SelectThemeDialog.tsx'
import { AboutDialog } from '../dialog-about/AboutDialog.tsx'
import { SelectSurahsToDownloadDialog } from '../audio-download/SelectSurahsToDownloadDialog.tsx'
import { DownloadProgressDialog } from '../download-progress/DownloadProgressDialog.tsx'
import { SelectAudioToDeleteDialog } from '../audio-delete/SelectAudioToDeleteDialog.tsx'
import { SelectSurahDialog } from '../dialog-select-surah/SelectSurahDialog.tsx'
import { JumpToAyatDialog } from '../dialog-jump-to-ayat/JumpToAyatDialog.tsx'
import { JumpHistoryDialog } from '../dialog-jump-history/JumpHistoryDialog.tsx'
import { TopBar } from './TopBar.tsx'
import { AyatPage } from './AyatPage.tsx'
import styles from './ReaderScreen.module.css'

// Slower than the 0.28s snap that finishes a hand swipe: nobody's finger is on
// the screen, so the turn has to read as a turn on its own.
const AUTO_SWIPE_MS = 500

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
  // A combined row shows its raw multi_ayats range in the chip (MainActivity.kt:1492)
  const currentAyatLabel = ayatLabel(currentRow)
  const arabicText = actions.getArabicText()
  const notesForPage = actions.getNotesForPage()

  // Sliding pager — 3 slides (prev, current, next) move together during drag.
  // Phase drives the track's translateX and transition presence.
  // 'auto-next' is the same forward snap, driven by audio auto-tracking.
  type SwipePhase =
    | 'idle'
    | 'dragging'
    | 'snapping-next'
    | 'snapping-prev'
    | 'snapping-back'
    | 'auto-next'
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  // 'pending' until we know direction; then locked for the rest of the touch.
  const gestureDir = useRef<'pending' | 'horizontal' | 'vertical'>('pending')
  const slotWidth = useRef(typeof window !== 'undefined' ? window.innerWidth : 390)
  const pagerRef = useRef<HTMLDivElement>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [phase, setPhase] = useState<SwipePhase>('idle')

  // Current slide's scroll offset, remembered per page so a jump-history
  // return can land back where the [number] link was tapped, not the top.
  const currentSlideRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef<Map<string, number>>(new Map())
  // Only a jump-history return restores scroll; every other nav (swipe,
  // Surah/Ayat arrows, keypad Go, auto-track) lands at the top.
  const restoreScrollRef = useRef(false)
  const handleSlideScroll = useCallback(() => {
    const slide = currentSlideRef.current
    if (!slide) return
    scrollPositions.current.set(`${surahId}:${pageIndex}`, slide.scrollTop)
  }, [surahId, pageIndex])

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
      // A manual swipe cancels audio auto-tracking (MainActivity.kt:383)
      audioActionsRef.current.disableAutoTracking()
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

  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.target !== e.currentTarget) return // ignore transitions bubbling up from a card
    if (phase === 'snapping-next' || phase === 'auto-next') {
      setPhase('idle')
      actions.nextPage()
    } else if (phase === 'snapping-prev') {
      setPhase('idle')
      actions.prevPage()
    } else {
      setPhase('idle')
    }
  }, [phase, actions])

  // A [surah:ayat] link is the only jump that starts a history session
  // (MainActivity.kt:587-594)
  const handleJump = useCallback(
    (targetSurah: number, targetAyat: number) => {
      actions.jumpFromLink(targetSurah, targetAyat)
    },
    [actions],
  )

  const [drawerOpen, setDrawerOpen] = useState(
    () => new URLSearchParams(window.location.search).has('drawer'),
  )
  const handleMenuClick = useCallback(() => setDrawerOpen(true), [])
  const handleDrawerClose = useCallback(() => setDrawerOpen(false), [])

  // Auto-tracking walks the surah one ayat at a time, so most of its moves land
  // on the very next page. Glide there like a hand swipe instead of cutting —
  // a jump-cut leaves no sign the page turned. Anything else still jumps.
  const handleAutoTrack = useCallback(
    (surah: number, ayat: number) => {
      const rowAfter = state.ayats[pageIndex + 1]
      if (
        phase === 'idle' &&
        surah === surahId &&
        rowAfter !== undefined &&
        ayatIdsOf(rowAfter).includes(ayat)
      ) {
        setPhase('auto-next')
        return
      }
      if (phase !== 'idle') setPhase('idle')
      actions.goTo(surah, ayat)
    },
    [phase, surahId, pageIndex, state.ayats, actions],
  )

  // Commit the auto swipe even if transitionend never arrives (hidden tab,
  // interrupted transition), so playback can't outrun the page.
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  useEffect(() => {
    if (phase !== 'auto-next') return
    const timer = setTimeout(() => {
      setPhase('idle')
      actionsRef.current.nextPage()
    }, AUTO_SWIPE_MS + 120)
    return () => clearTimeout(timer)
  }, [phase])

  // Runs after the current slide's content has settled on the new page.
  // A jump-history return restores the spot it left off; anything else
  // (swipe, arrows, keypad, auto-track) lands at the top.
  useEffect(() => {
    if (loading) return
    const slide = currentSlideRef.current
    if (!slide) return
    if (restoreScrollRef.current) {
      restoreScrollRef.current = false
      slide.scrollTop = scrollPositions.current.get(`${surahId}:${pageIndex}`) ?? 0
    } else {
      slide.scrollTop = 0
    }
  }, [surahId, pageIndex, loading])

  const [audioState, audioActions] = useAudio({
    surahId,
    firstAyat: state.ayats[0]?.ayatId ?? 1,
    totalAyats,
    surahTitle: surah?.myanmarName || surah?.englishName,
    onAutoTrack: handleAutoTrack,
  })

  // handleTouchEnd is defined above audioActions; reach it through a ref.
  const audioActionsRef = useRef(audioActions)
  audioActionsRef.current = audioActions

  const handleToggleAudio = useCallback(() => { audioActions.togglePlay() }, [audioActions])
  const handleToggleAutoTracking = useCallback(() => { audioActions.toggleAutoTracking() }, [audioActions])
  const handlePlayAyat = useCallback(
    () => { audioActions.playAyat(surahId, currentAyatId) },
    [audioActions, surahId, currentAyatId],
  )
  const handlePlaySurahFromHere = useCallback(
    () => { audioActions.playSurahFrom(surahId, currentAyatId) },
    [audioActions, surahId, currentAyatId],
  )

  // History icon: 1-2 steps jump straight back to the original spot, 3+ open the
  // Jump History dialog (MainActivity.kt:1506-1516)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const handleHistoryClick = useCallback(() => {
    if (jumpHistory.length === 0) return
    audioActions.disableAutoTracking()
    if (jumpHistory.length > 2) {
      setHistoryDialogOpen(true)
      return
    }
    restoreScrollRef.current = true
    actions.goToHistoryStep(0)
  }, [jumpHistory.length, audioActions, actions])

  const handleHistoryStepSelect = useCallback(
    (index: number) => {
      audioActions.disableAutoTracking()
      setHistoryDialogOpen(false)
      restoreScrollRef.current = true
      actions.goToHistoryStep(index)
    },
    [audioActions, actions],
  )

  const handleHistoryClear = useCallback(() => {
    actions.clearHistory()
    setHistoryDialogOpen(false)
  }, [actions])

  const handleHistoryDialogClose = useCallback(() => setHistoryDialogOpen(false), [])

  const [selectSurahOpen, setSelectSurahOpen] = useState(false)
  const handleSurahChipClick = useCallback(() => setSelectSurahOpen(true), [])
  const handleSelectSurahClose = useCallback(() => setSelectSurahOpen(false), [])

  // null = use current surahId; set to a specific id when coming from SelectSurahDialog
  const [jumpToAyatSurahId, setJumpToAyatSurahId] = useState<number | null>(null)
  const [jumpToAyatOpen, setJumpToAyatOpen] = useState(false)

  const handleAyatChipClick = useCallback(() => {
    setJumpToAyatSurahId(null)
    setJumpToAyatOpen(true)
  }, [])

  const handleSurahSelected = useCallback((selectedSurahId: number) => {
    setSelectSurahOpen(false)
    setJumpToAyatSurahId(selectedSurahId)
    setJumpToAyatOpen(true)
  }, [])

  const handleJumpToAyatGo = useCallback(
    (ayatId: number) => {
      const targetSurah = jumpToAyatSurahId ?? surahId
      // The keypad Go never starts a session (MainActivity.kt:1181)
      actions.goTo(targetSurah, ayatId)
      setJumpToAyatOpen(false)
      setJumpToAyatSurahId(null)
    },
    [jumpToAyatSurahId, surahId, actions],
  )

  const handleJumpToAyatClose = useCallback(() => {
    setJumpToAyatOpen(false)
    setJumpToAyatSurahId(null)
  }, [])

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

  // Tapping "Download Selected" dismisses the picker and opens the progress modal,
  // which shares one download session with the picker (MainActivity.kt:966).
  const download = useAudioDownload()
  const [progressOpen, setProgressOpen] = useState(false)
  const handleStartDownload = useCallback(
    async (jobs: SurahDownloadJob[]) => {
      setDownloadDialogOpen(false)
      setProgressOpen(true)
      await download.start(jobs)
      setProgressOpen(false)
    },
    [download],
  )

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
    phase === 'snapping-next' || phase === 'auto-next'
      ? -w * 2
      : phase === 'snapping-prev'
        ? 0
        : -w + (phase === 'dragging' ? dragOffset : 0)
  const trackTransition =
    phase === 'auto-next'
      ? `transform ${AUTO_SWIPE_MS}ms ease-in-out`
      : phase === 'snapping-next' || phase === 'snapping-prev' || phase === 'snapping-back'
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
        <SelectSurahsToDownloadDialog
          downloadedCounts={download.downloadedCounts}
          onStart={handleStartDownload}
          onClose={handleDownloadDialogClose}
        />
      )}
      {progressOpen && (
        <DownloadProgressDialog
          progress={download.progress}
          paused={download.paused}
          onTogglePause={download.togglePause}
          onStop={download.stop}
        />
      )}
      {deleteDialogOpen && (
        <SelectAudioToDeleteDialog onClose={handleDeleteDialogClose} />
      )}
      {selectSurahOpen && (
        <SelectSurahDialog
          surahs={state.surahs}
          currentSurahId={surahId}
          onSelect={handleSurahSelected}
          onClose={handleSelectSurahClose}
        />
      )}
      {jumpToAyatOpen && (() => {
        const targetId = jumpToAyatSurahId ?? surahId
        const targetSurah = state.surahs.find((s) => s.number === targetId)
        return (
          <JumpToAyatDialog
            surahId={targetId}
            totalAyats={targetSurah?.numberOfAyahs ?? totalAyats}
            surahName={targetSurah?.englishName ?? ''}
            onGo={handleJumpToAyatGo}
            onClose={handleJumpToAyatClose}
          />
        )
      })()}
      {historyDialogOpen && (
        <JumpHistoryDialog
          history={jumpHistory}
          surahs={state.surahs}
          onSelect={handleHistoryStepSelect}
          onClear={handleHistoryClear}
          onClose={handleHistoryDialogClose}
        />
      )}
      <TopBar
        surahId={surahId}
        pageIndex={pageIndex}
        totalPages={totalPages}
        currentAyatLabel={currentAyatLabel}
        totalAyats={totalAyats}
        surah={surah}
        jumpHistory={jumpHistory}
        audioPlaying={audioState.playing}
        autoTracking={audioState.autoTracking}
        audioAvailable={true}
        onMenuClick={handleMenuClick}
        onPrevSurah={actions.prevSurah}
        onNextSurah={actions.nextSurah}
        onPrevPage={actions.prevPage}
        onNextPage={actions.nextPage}
        onSurahChipClick={handleSurahChipClick}
        onAyatChipClick={handleAyatChipClick}
        onHistoryClick={handleHistoryClick}
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
                audioPlaying={audioActions.isPlayingAyat(surahId, prevRow.ayatId)}
                audioLoaded={audioState.loadedAyat === prevRow.ayatId}
                onPlayAyat={() => audioActions.playAyat(surahId, prevRow.ayatId)}
                onPlaySurahFromHere={() => audioActions.playSurahFrom(surahId, prevRow.ayatId)}
                onScaleArabic={actions.scaleArabic}
                onScaleMyanmar={actions.scaleMyanmar}
                onScaleNote={actions.scaleNote}
                onJump={handleJump}
              />
            )}
          </div>
          {/* Current slide */}
          <div className={styles.slide} ref={currentSlideRef} onScroll={handleSlideScroll}>
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
                audioPlaying={audioActions.isPlayingAyat(surahId, currentAyatId)}
                audioLoaded={audioState.loadedAyat === currentAyatId}
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
                audioPlaying={audioActions.isPlayingAyat(surahId, nextRow.ayatId)}
                audioLoaded={audioState.loadedAyat === nextRow.ayatId}
                onPlayAyat={() => audioActions.playAyat(surahId, nextRow.ayatId)}
                onPlaySurahFromHere={() => audioActions.playSurahFrom(surahId, nextRow.ayatId)}
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
