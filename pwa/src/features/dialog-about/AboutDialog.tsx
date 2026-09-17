// Ports: AboutDialog (Compose AlertDialog in app/AboutDialog.kt)
import { useEffect, useRef } from 'react'
import styles from './AboutDialog.module.css'

interface Props {
  onClose: () => void
}

export function AboutDialog({ onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog ref={ref} className={styles.dialog} onClick={handleBackdropClick} onClose={onClose}>
      <p className={styles.title}>About App</p>
      <hr className={styles.divider} />
      <div className={styles.section}>
        <p className={styles.version}>Version: V 1.0.0</p>
      </div>
      <hr className={styles.divider} />
      <div className={styles.section}>
        <p className={styles.sectionHeader}>App &amp; Software Design:</p>
        <p className={styles.sectionText}>
          Copyright © 2026 noon Software Development Team. All rights reserved.
        </p>
      </div>
      <hr className={styles.divider} />
      <div className={styles.section}>
        <p className={styles.sectionHeader}>Myanmar Translation &amp; Tafsir:</p>
        <p className={styles.sectionText}>
          Copyright © 2026 U Kyaw Win. All rights reserved.
        </p>
      </div>
      <hr className={styles.divider} />
      <div className={styles.section}>
        <p className={styles.disclaimer}>
          No part of this software may be reproduced, distributed, or transmitted in any form
          without the prior written permission of the respective copyright holders.
        </p>
      </div>
      <div className={styles.footer}>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </dialog>
  )
}
