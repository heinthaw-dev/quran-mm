// Ports: showDownloadSelectionDialog (MainActivity.kt:890)
import { useEffect, useRef, useState } from 'react'
import { useSurahMeta } from '../../hooks/useSurahMeta.ts'
import type { SurahDownloadJob } from '../../data/audioDownload.ts'
import styles from './SelectSurahsToDownloadDialog.module.css'

const TOGGLE_COLOR = '#1976D2'
// No per-file size manifest exists; approximate from ayat count (matches native).
const MB_PER_AYAT = 0.0894

interface Props {
  downloadedCounts: Map<number, number>
  onStart: (surahs: SurahDownloadJob[]) => void
  onClose: () => void
}

export function SelectSurahsToDownloadDialog({ downloadedCounts, onStart, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const { surahs } = useSurahMeta()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  // Fully-downloaded surahs drop off the list (screenshot starts at Surah 2).
  const available = surahs.filter((s) => (downloadedCounts.get(s.number) ?? 0) < s.numberOfAyahs)
  const allSelected = available.length > 0 && available.every((s) => selected.has(s.number))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(available.map((s) => s.number)))
  }

  function toggleOne(num: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const chosen = available.filter((s) => selected.has(s.number))
  const totalSizeMB = chosen.reduce((sum, s) => sum + s.numberOfAyahs * MB_PER_AYAT, 0)

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  function handleDownload() {
    onStart(chosen.map((s) => ({ number: s.number, numberOfAyahs: s.numberOfAyahs })))
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick} onClose={onClose}>
      <p className={styles.title}>Select Surahs to Download</p>
      <button
        className={styles.toggleAll}
        style={{ color: TOGGLE_COLOR }}
        onClick={toggleAll}
        type="button"
        disabled={available.length === 0}
      >
        {allSelected ? 'Uncheck All' : 'Check All'}
      </button>
      <div className={styles.list}>
        {available.length === 0 ? (
          <p className={styles.empty}>All surahs downloaded.</p>
        ) : (
          available.map((s) => (
            <label key={s.number} className={styles.row}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selected.has(s.number)}
                onChange={() => toggleOne(s.number)}
              />
              <span className={styles.rowLabel}>{`Surah ${s.number}: ${s.myanmarName}`}</span>
            </label>
          ))
        )}
      </div>
      <div className={styles.footer}>
        <p className={styles.countText}>{`${selected.size} Surah selected.`}</p>
        <p className={styles.sizeText}>
          {`Download size: ${totalSizeMB.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`}
        </p>
        <div className={styles.actions}>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            Close
          </button>
          <button
            className={styles.downloadBtn}
            onClick={handleDownload}
            type="button"
            disabled={selected.size === 0}
          >
            Download Selected
          </button>
        </div>
      </div>
    </dialog>
  )
}
