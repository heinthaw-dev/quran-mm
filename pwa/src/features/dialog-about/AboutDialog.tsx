// Ports: AboutDialog (Compose AlertDialog in app/AboutDialog.kt:27)
import { useEffect, useRef } from 'react'
import styles from './AboutDialog.module.css'

interface Props {
  onClose: () => void
}

export function AboutDialog({ onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
    // showModal() would otherwise focus Close and paint a ring the native dialog has no equivalent for
    ref.current?.focus()
  }, [])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClick={handleBackdropClick}
      onClose={onClose}
      tabIndex={-1}
    >
      <p className={styles.title}>About App</p>
      {/* Column(verticalArrangement = spacedBy(8.dp)) — one divider only, after the version */}
      <div className={styles.content}>
        <p className={styles.version}>Version: V 1.0.0</p>
        <hr className={styles.divider} />
        <p className={styles.sectionHeader}>App &amp; Software Design:</p>
        <p className={styles.sectionText}>
          Copyright © 2026 noon Software Development Team. All rights reserved.
        </p>
        {/* Spacer(8.dp) between the two 8dp arrangement gaps = 24dp total */}
        <p className={`${styles.sectionHeader} ${styles.sectionGap}`}>Myanmar Translation &amp; Tafsir:</p>
        <p className={styles.sectionText}>Copyright © 2026 U Kyaw Win. All rights reserved.</p>
        {/* Spacer(12.dp) between the two 8dp arrangement gaps = 28dp total */}
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
