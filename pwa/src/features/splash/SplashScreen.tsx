// Ports: QuranMMSplashWrapper
import { useEffect, useState } from 'react'
import {
  cacheOfflineData,
  type DataCacheProgress,
} from '../../data/dataCache.ts'
import styles from './SplashScreen.module.css'

interface Props {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  const [progress, setProgress] = useState<DataCacheProgress | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    Promise.all([
      new Promise<void>((res) => setTimeout(res, 2000)),
      document.fonts.ready,
      cacheOfflineData((p) => {
        if (!cancelled) setProgress(p)
      }, controller.signal),
    ]).finally(() => {
      // finally, not then: a rejection here would otherwise leave the splash
      // covering the app forever.
      if (!cancelled) onDone()
    })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [onDone])

  // Only the first run has files left to fetch; later runs skip the bar entirely.
  const pending = progress !== null && progress.done < progress.total

  return (
    <div className={styles.splash}>
      <img
        src="/kw_logo.png"
        alt=""
        className={styles.logo}
        aria-hidden="true"
      />
      {pending && (
        <div className={styles.progress}>
          <div className={styles.track}>
            <div
              className={styles.bar}
              style={{
                width: `${Math.round((progress.done / progress.total) * 100)}%`,
              }}
            />
          </div>
          <p className={styles.label}>
            {`Preparing offline data ${progress.done} / ${progress.total}`}
          </p>
        </div>
      )}
    </div>
  )
}
