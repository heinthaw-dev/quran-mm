// Reads back what useAudio recorded while the phone's screen was off. No
// Android counterpart: it exists only to debug background playback, and renders
// nothing unless /?audiodebug=1 has been opened once (see data/audioLog.ts).
import { useCallback, useEffect, useState } from 'react'
import {
  clearAudioLog,
  formatAudioLog,
  getAudioLog,
  isAudioDebug,
  subscribeAudioLog,
} from '../data/audioLog.ts'
import { canStreamAudio } from '../data/audioStream.ts'
import styles from './AudioDebugOverlay.module.css'

export function AudioDebugOverlay() {
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => subscribeAudioLog(() => { setVersion((n) => n + 1) }), [])

  const handleCopy = useCallback(() => {
    void navigator.clipboard?.writeText(formatAudioLog(getAudioLog()))
  }, [])

  if (!isAudioDebug()) return null

  const entries = getAudioLog()
  // `version` only exists to re-render on every new entry.
  void version
  // Which playback path is armed, so a test is never read against the wrong one.
  const mode = canStreamAudio() ? 'stream' : 'per ayat'

  if (!open) {
    return (
      <button type="button" className={styles.pill} onClick={() => { setOpen(true) }}>
        audio log {entries.length} · {mode}
      </button>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.bar}>
        <span className={styles.count}>{entries.length} entries · {mode}</span>
        <button type="button" onClick={handleCopy}>Copy</button>
        <button type="button" onClick={clearAudioLog}>Clear</button>
        <button type="button" onClick={() => { setOpen(false) }}>Hide</button>
      </div>
      <ol className={styles.list}>
        {entries.map((e, i) => (
          <li key={i} className={e.vis === 'h' ? styles.hidden : undefined}>
            {e.t.toFixed(1)}s {e.vis} {e.event}{e.detail ? ` ${e.detail}` : ''}
          </li>
        ))}
      </ol>
    </div>
  )
}
