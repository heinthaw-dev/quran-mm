// Ports: QuranMMSplashWrapper
import { useEffect } from 'react'
import styles from './SplashScreen.module.css'

interface Props {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    let cancelled = false
    Promise.all([
      new Promise<void>(res => setTimeout(res, 2000)),
      document.fonts.ready,
    ]).then(() => { if (!cancelled) onDone() })
    return () => { cancelled = true }
  }, [onDone])

  return (
    <div className={styles.splash} aria-hidden="true">
      <img src="/kw_logo.png" alt="" className={styles.logo} />
    </div>
  )
}
