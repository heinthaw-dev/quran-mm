// Ports: showSurahDialog (MainActivity.kt:1111)
import { useEffect, useRef, useState } from 'react'
import type { SurahMeta } from '../../data/types.ts'
import styles from './SelectSurahDialog.module.css'

interface Props {
  surahs: SurahMeta[]
  currentSurahId: number
  onSelect: (surahId: number) => void
  onClose: () => void
}

export function SelectSurahDialog({ surahs, currentSurahId, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [selectedId, setSelectedId] = useState(currentSurahId)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  // Scroll selected row into view on open
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-surah="${currentSurahId}"]`)
    el?.scrollIntoView({ block: 'center' })
  }, [currentSurahId])

  function handleRowClick(surahId: number) {
    setSelectedId(surahId)
    onSelect(surahId)
  }

  function handleSelectAyat() {
    onSelect(selectedId)
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick} onClose={onClose}>
      <p className={styles.title}>Select Surah</p>
      <div className={styles.list}>
        {surahs.map((surah, i) => (
          <div key={surah.number}>
            {i > 0 && <hr className={styles.divider} />}
            <button
              className={`${styles.row} ${selectedId === surah.number ? styles.rowSelected : ''}`}
              data-surah={surah.number}
              onClick={() => handleRowClick(surah.number)}
              type="button"
            >
              <span className={styles.englishName}>
                {surah.number}. {surah.englishName}
              </span>
              <span className={styles.arabicName} dir="rtl">
                {surah.name}
              </span>
            </button>
          </div>
        ))}
      </div>
      <hr className={styles.divider} />
      <div className={styles.footer}>
        <button className={styles.selectAyatBtn} onClick={handleSelectAyat} type="button">
          Select Ayat
        </button>
      </div>
    </dialog>
  )
}
