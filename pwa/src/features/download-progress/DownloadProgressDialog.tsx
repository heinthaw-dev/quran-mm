// Ports: showDownloadDialog (MainActivity.kt:966)
import { useEffect, useRef } from 'react'
import type { DownloadProgress } from '../../data/audioDownload.ts'
import styles from './DownloadProgressDialog.module.css'

interface Props {
  progress: DownloadProgress | null
  paused: boolean
  onTogglePause: () => void
  onStop: () => void
}

function formatEta(seconds: number | null): string {
  if (seconds === null) return 'ETA: Calculating...'
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `ETA: ${mm}:${ss} mins remaining`
}

function pct(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export function DownloadProgressDialog({ progress, paused, onTogglePause, onStop }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const p = progress ?? {
    surahIndex: 0,
    surahTotal: 0,
    currentSurahId: 0,
    ayatDone: 0,
    ayatTotal: 0,
    etaSeconds: null,
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={(e) => e.preventDefault()} // non-dismissable while downloading (MainActivity.kt:968)
    >
      <p className={styles.title}>Downloading Audio</p>
      <p className={styles.body}>
        Downloading selected Surahs for offline listening. Please keep the app open.
      </p>

      <p className={styles.progressLabel}>{`Surah Progress: ${p.surahIndex} / ${p.surahTotal}`}</p>
      <p className={styles.progressLabel}>{`(Downloading Surah ${p.currentSurahId})`}</p>
      <div className={styles.track}>
        <div className={styles.bar} style={{ width: `${pct(p.surahIndex, p.surahTotal)}%` }} />
      </div>

      <p className={styles.progressLabel}>{`Ayat Progress: ${p.ayatDone} / ${p.ayatTotal}`}</p>
      <div className={styles.track}>
        <div className={styles.bar} style={{ width: `${pct(p.ayatDone, p.ayatTotal)}%` }} />
      </div>

      <p className={styles.progressLabel}>{formatEta(p.etaSeconds)}</p>

      <div className={styles.actions}>
        <button className={styles.pauseBtn} onClick={onTogglePause} type="button">
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className={styles.stopBtn} onClick={onStop} type="button">
          Stop
        </button>
      </div>
    </dialog>
  )
}
