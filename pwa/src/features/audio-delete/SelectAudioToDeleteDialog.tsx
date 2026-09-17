// Ports: showAudioDeleteDialog (MainActivity.kt:994)
import { useEffect, useRef, useState } from 'react'
import { useSurahMeta } from '../../hooks/useSurahMeta.ts'
import { getCachedSurahs, deleteAudioCache } from '../../data/audioCache.ts'
import type { CachedSurah } from '../../data/audioCache.ts'
import styles from './SelectAudioToDeleteDialog.module.css'

const TOGGLE_COLOR = '#1976D2'

interface Props {
  onClose: () => void
}

export function SelectAudioToDeleteDialog({ onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const { surahs } = useSurahMeta()

  const [cached, setCached] = useState<CachedSurah[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    ref.current?.showModal()
    getCachedSurahs().then(setCached)
  }, [])

  const deletable = cached.filter((c) => c.number !== 1)
  const allSelected = deletable.length > 0 && deletable.every((c) => selected.has(c.number))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(deletable.map((c) => c.number)))
    }
  }

  function toggleOne(num: number) {
    if (num === 1) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const freedMB = cached
    .filter((c) => selected.has(c.number))
    .reduce((sum, c) => sum + c.sizeBytes, 0) / (1024 * 1024)

  function getMyanmarName(num: number) {
    return surahs.find((s) => s.number === num)?.myanmarName ?? ''
  }

  async function handleDelete() {
    await deleteAudioCache(Array.from(selected))
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick} onClose={onClose}>
      <p className={styles.title}>Select Audio to Delete</p>
      <button
        className={styles.toggleAll}
        style={{ color: TOGGLE_COLOR }}
        onClick={toggleAll}
        type="button"
      >
        {allSelected ? 'Uncheck All' : 'Check All'}
      </button>
      <div className={styles.list}>
        {cached.map((c) => {
          const locked = c.number === 1
          return (
            <label
              key={c.number}
              className={styles.row}
              style={locked ? { color: '#9E9E9E' } : undefined}
            >
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={selected.has(c.number)}
                disabled={locked}
                onChange={() => toggleOne(c.number)}
              />
              <span className={styles.rowLabel}>
                {`Surah ${c.number}: ${getMyanmarName(c.number)}`}
              </span>
            </label>
          )
        })}
      </div>
      <div className={styles.footer}>
        <p className={styles.countText}>{selected.size} Surah selected.</p>
        <p className={styles.sizeText}>
          {`Freed up size: ${freedMB.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`}
        </p>
        <div className={styles.actions}>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            Close
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => void handleDelete()}
            type="button"
            disabled={selected.size === 0}
          >
            Delete Selected
          </button>
        </div>
      </div>
    </dialog>
  )
}
