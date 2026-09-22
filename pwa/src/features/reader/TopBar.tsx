// Ports: BlueprintTopBar composable
import type { SurahMeta } from '../../data/types.ts'
import type { JumpStep } from '../../hooks/useSurah.ts'
import {
  MenuIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshIcon,
  PlayArrowIcon,
  PauseIcon,
  GpsNotFixedIcon,
  GpsFixedIcon,
} from '../../ui/Icons.tsx'
import styles from './TopBar.module.css'

interface Props {
  surahId: number
  pageIndex: number
  totalPages: number
  currentAyatLabel: string
  totalAyats: number
  surah: SurahMeta | undefined
  jumpHistory: JumpStep[]
  audioPlaying: boolean
  autoTracking: boolean
  audioAvailable: boolean
  onMenuClick: () => void
  onPrevSurah: () => void
  onNextSurah: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onSurahChipClick: () => void
  onAyatChipClick: () => void
  onHistoryClick: () => void
  onToggleAudio: () => void
  onToggleAutoTracking: () => void
}

export function TopBar({
  surahId,
  pageIndex,
  totalPages,
  currentAyatLabel,
  totalAyats,
  surah,
  jumpHistory,
  audioPlaying,
  autoTracking,
  audioAvailable,
  onMenuClick,
  onPrevSurah,
  onNextSurah,
  onPrevPage,
  onNextPage,
  onSurahChipClick,
  onAyatChipClick,
  onHistoryClick,
  onToggleAudio,
  onToggleAutoTracking,
}: Props) {
  const historyActive = jumpHistory.length > 0
  const atFirstSurah = surahId <= 1
  const atLastSurah = surahId >= 114
  const atFirstPage = pageIndex <= 0
  const atLastPage = pageIndex >= totalPages - 1

  return (
    <header className={styles.topBar}>
      {/* Row 1 */}
      <div className={styles.row1}>
        <button
          className={styles.iconBtn32}
          onClick={onMenuClick}
          aria-label="Menu"
          type="button"
        >
          <MenuIcon size={32} />
        </button>

        {/* Surah stepper */}
        <div className={styles.stepper}>
          <button
            className={styles.iconBtn28}
            onClick={onPrevSurah}
            disabled={atFirstSurah}
            aria-label="Previous surah"
            type="button"
          >
            <ChevronLeftIcon
              size={28}
              color={atFirstSurah ? '#BDBDBD' : 'currentColor'}
            />
          </button>
          <button
            className={styles.chip}
            onClick={onSurahChipClick}
            aria-label="Select surah"
            type="button"
          >
            <span>Surah</span>
            <span>{surahId}/114</span>
          </button>
          <button
            className={styles.iconBtn28}
            onClick={onNextSurah}
            disabled={atLastSurah}
            aria-label="Next surah"
            type="button"
          >
            <ChevronRightIcon
              size={28}
              color={atLastSurah ? '#BDBDBD' : 'currentColor'}
            />
          </button>
        </div>

        {/* Ayat stepper */}
        <div className={styles.stepper}>
          <button
            className={styles.iconBtn28}
            onClick={onPrevPage}
            disabled={atFirstPage}
            aria-label="Previous ayat"
            type="button"
          >
            <ChevronLeftIcon
              size={28}
              color={atFirstPage ? '#BDBDBD' : 'currentColor'}
            />
          </button>
          <button
            className={styles.chip}
            onClick={onAyatChipClick}
            aria-label="Jump to ayat"
            type="button"
          >
            <span>Ayat</span>
            <span>
              {currentAyatLabel} / {totalAyats}
            </span>
          </button>
          <button
            className={styles.iconBtn28}
            onClick={onNextPage}
            disabled={atLastPage}
            aria-label="Next ayat"
            type="button"
          >
            <ChevronRightIcon
              size={28}
              color={atLastPage ? '#BDBDBD' : 'currentColor'}
            />
          </button>
        </div>

        <button
          className={styles.iconBtn32}
          onClick={onHistoryClick}
          disabled={!historyActive}
          aria-label="History"
          type="button"
        >
          <RefreshIcon
            size={32}
            color={historyActive ? 'var(--color-primary)' : '#BDBDBD'}
          />
        </button>
      </div>

      <hr className={styles.divider} />

      {/* Row 2 */}
      <div className={styles.row2}>
        <div className={styles.row2Left}>
          <span className={styles.englishName}>{surah?.englishName ?? ''}</span>
          <div style={{ width: 6 }} />
          <button
            className={styles.iconBtn32}
            onClick={onToggleAudio}
            aria-label={audioPlaying ? 'Pause' : 'Play surah'}
            type="button"
            style={{ opacity: audioAvailable ? 1 : 0.3 }}
          >
            {audioPlaying ? (
              <PauseIcon size={32} color="var(--color-primary)" />
            ) : (
              <PlayArrowIcon size={32} color="var(--color-primary)" />
            )}
          </button>
          <div style={{ width: 6 }} />
          <button
            className={styles.iconBtn22}
            onClick={onToggleAutoTracking}
            aria-label={autoTracking ? 'Auto-Focus ON' : 'Auto-Focus OFF'}
            type="button"
            disabled={!audioPlaying}
            style={{ opacity: audioPlaying ? 1 : 0.3 }}
          >
            {autoTracking ? (
              <GpsFixedIcon size={22} color="var(--color-primary)" />
            ) : (
              <GpsNotFixedIcon size={22} color="var(--color-primary)" />
            )}
          </button>
        </div>
        <div style={{ width: 8 }} />
        <span className={styles.myanmarName} dir="auto">
          {surah?.myanmarName ?? ''}
        </span>
      </div>
    </header>
  )
}
