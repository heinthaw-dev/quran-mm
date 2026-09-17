// Ports: showAyatKeypad (MainActivity.kt:1150)
import { useEffect, useRef, useState } from 'react'
import styles from './JumpToAyatDialog.module.css'

interface Props {
  surahId: number
  totalAyats: number
  surahName: string
  onGo: (ayatId: number) => void
  onClose: () => void
}

export function JumpToAyatDialog({ totalAyats, surahName, onGo, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
    inputRef.current?.focus()
  }, [])

  function handleGo() {
    const n = parseInt(value, 10)
    if (!Number.isInteger(n) || n < 1 || n > totalAyats) {
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
          min={1}
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
