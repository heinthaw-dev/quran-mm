// Ports: showHistoryDialog (MainActivity.kt:1264)
import { useEffect, useRef } from 'react'
import type { SurahMeta } from '../../data/types.ts'
import type { JumpStep } from '../../hooks/useSurah.ts'
import styles from './JumpHistoryDialog.module.css'

interface Props {
  history: JumpStep[]
  surahs: SurahMeta[]
  onSelect: (index: number) => void
  onClear: () => void
  onClose: () => void
}

// MainActivity.kt:1273-1277
function stepLabel(index: number, total: number): string {
  if (index === 0) return 'Original Reading Spot'
  if (index === total - 1) return 'Current Spot'
  return `Jump Step ${index}`
}

export function JumpHistoryDialog({ history, surahs, onSelect, onClear, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick} onClose={onClose}>
      <p className={styles.title}>Jump History</p>
      <div className={styles.list}>
        {history.map((step, index) => (
          <div key={`${index}-${step.surahId}-${step.ayatId}`}>
            <button className={styles.row} onClick={() => onSelect(index)} type="button">
              <span className={styles.stepLabel}>{stepLabel(index, history.length)}</span>
              <span className={styles.stepSpot}>
                {/* U+202A/U+202C keep the bracket text left-to-right, as Android does */}
                {`‪[Surah ${step.surahId} : Ayat ${step.ayatId}]‬ ${
                  surahs.find((s) => s.number === step.surahId)?.englishName ?? ''
                }`}
              </span>
            </button>
            <hr className={styles.divider} />
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <button className={styles.textBtn} onClick={onClear} type="button">
          Clear History
        </button>
        <button className={styles.textBtn} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </dialog>
  )
}
