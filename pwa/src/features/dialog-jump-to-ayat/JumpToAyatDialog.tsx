// Ports: showAyatKeypad (MainActivity.kt:1150)
import { useEffect, useRef, useState } from 'react'
import { firstAyatId } from '../../data/csv.ts'
import styles from './JumpToAyatDialog.module.css'

interface Props {
  surahId: number
  totalAyats: number
  surahName: string
  onGo: (ayatId: number) => void
  onClose: () => void
}

export function JumpToAyatDialog({ surahId, totalAyats, surahName, onGo, onClose }: Props) {
  // Android hardcodes the lower bound to 1 (MainActivity.kt:1177), which leaves
  // surah 1's basmala page (Ayat_id 0) unreachable from the keypad. Owner asked
  // for 0 to be accepted there — a deliberate deviation.
  const minAyat = firstAyatId(surahId)
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
    inputRef.current?.focus()
  }, [])

  // The on-screen keyboard shrinks the visual viewport but not the layout
  // viewport, so a fixed, centred dialog ends up behind the keypad. Mirror the
  // visual viewport into CSS vars and the dialog recentres above it.
  useEffect(() => {
    const vv = window.visualViewport
    const el = ref.current
    if (!vv || !el) return

    function apply() {
      if (!vv || !el) return
      el.style.setProperty('--vv-top', `${vv.offsetTop}px`)
      el.style.setProperty('--vv-height', `${vv.height}px`)
    }

    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
    }
  }, [])

  function handleGo() {
    const n = parseInt(value, 10)
    if (!Number.isInteger(n) || n < minAyat || n > totalAyats) {
      setInvalid(true)
      inputRef.current?.focus()
      return
    }
    onGo(n)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    setInvalid(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleGo()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick} onClose={onClose}>
      <p className={styles.title}>Jump to Ayat</p>
      <p className={styles.subtitle}>
        Total Ayats in Surah{surahName ? ` (${surahName})` : ''}: {totalAyats}
      </p>
      <div className={styles.inputWrap}>
        <input
          ref={inputRef}
          className={`${styles.input} ${invalid ? styles.inputInvalid : ''}`}
          type="number"
          inputMode="numeric"
          min={minAyat}
          max={totalAyats}
          placeholder="Enter Ayat Number"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose} type="button">
          Cancel
        </button>
        <button className={styles.goBtn} onClick={handleGo} type="button">
          Go
        </button>
      </div>
    </dialog>
  )
}
