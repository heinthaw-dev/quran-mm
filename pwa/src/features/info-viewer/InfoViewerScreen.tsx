// Ports: InfoViewerScreen composable (WebView → inline HTML)
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowBackIcon, CloseIcon } from '../../ui/Icons.tsx'
import styles from './InfoViewerScreen.module.css'

const PAGE_TITLES: Record<string, string> = {
  preface: 'Preface',
  introduction: 'Introduction',
  biography: 'Biography',
  developer: 'Developer / About',
}

export function InfoViewerScreen() {
  const { page = 'preface' } = useParams<{ page: string }>()
  const navigate = useNavigate()
  const title = PAGE_TITLES[page] ?? 'Info'
  const [bodyHtml, setBodyHtml] = useState<string>('')

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/data/${page}.html`, { signal: ctrl.signal })
      .then(r => r.text())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        setBodyHtml(doc.body.innerHTML)
      })
      .catch(e => {
        if ((e as Error).name !== 'AbortError') {
          setBodyHtml('<p>Content not available.</p>')
        }
      })
    return () => ctrl.abort()
  }, [page])

  return (
    <div className={styles.screen}>
      <header className={styles.topBar}>
        <div className={styles.topBarRow}>
          <button
            className={styles.iconBtn}
            onClick={() => navigate(-1)}
            aria-label="Back"
            type="button"
          >
            <ArrowBackIcon size={28} color="var(--color-primary)" />
          </button>
          <div className={styles.spacer} />
          <span className={styles.titleText}>{title}</span>
          <button
            className={styles.iconBtn}
            onClick={() => navigate(-1)}
            aria-label="Close"
            type="button"
          >
            <CloseIcon size={28} color="var(--color-primary)" />
          </button>
        </div>
        <div className={styles.divider} />
      </header>
      <div className={styles.contentOuter}>
        <div className={styles.card}>
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      </div>
    </div>
  )
}
