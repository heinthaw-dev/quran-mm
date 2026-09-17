// Ports: showThemeDialog (MainActivity.kt:1200)
import { useEffect, useRef } from 'react'
import type { AppTheme } from '../../data/types.ts'
import { THEME_TOKENS } from '../../data/types.ts'
import styles from './SelectThemeDialog.module.css'

interface Props {
  onSelect: (theme: AppTheme) => void
  onClose: () => void
}

const THEME_ORDER: AppTheme[] = ['BLUE', 'GREEN', 'PINK', 'BROWN']
const THEME_LABEL: Record<AppTheme, string> = {
  BLUE: 'Blue',
  GREEN: 'Green',
  PINK: 'Pink',
  BROWN: 'Brown',
}

export function SelectThemeDialog({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  function handleSelect(theme: AppTheme) {
    onSelect(theme)
    onClose()
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick} onClose={onClose}>
      <p className={styles.title}>Select App Theme</p>
      {THEME_ORDER.map((theme, i) => (
        <div key={theme}>
          {i > 0 && <hr className={styles.divider} />}
          <button
            className={styles.item}
            style={{ color: THEME_TOKENS[theme].primary }}
            onClick={() => handleSelect(theme)}
            type="button"
          >
            {THEME_LABEL[theme]}
          </button>
        </div>
      ))}
      <hr className={styles.divider} />
      <div className={styles.footer}>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </dialog>
  )
}
