// Field diagnostics for background playback. When the chain breaks the phone's
// screen is off, so the failing step can only be seen if it was recorded at the
// time and read back afterwards. Off until /?audiodebug=1 is opened once; the
// flag then survives in localStorage, because an installed PWA relaunches from
// start_url with no query string. /?audiodebug=0 turns it off and wipes the log.
const FLAG_KEY = 'quran.audioDebug'
const LOG_KEY = 'quran.audioLog'
const MAX_ENTRIES = 400

export interface AudioLogEntry {
  /** Seconds since the first entry, i.e. roughly since playback started. */
  t: number
  /** 'v' while the page is visible, 'h' once it is backgrounded. */
  vis: 'v' | 'h'
  event: string
  detail: string
}

let enabled: boolean | null = null
let entries: AudioLogEntry[] | null = null
let started = 0
const listeners = new Set<() => void>()

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or a full quota — the in-memory log still works this session.
  }
}

export function isAudioDebug(): boolean {
  if (enabled !== null) return enabled
  if (typeof window === 'undefined') return false
  const param = new URLSearchParams(window.location.search).get('audiodebug')
  if (param === '1') write(FLAG_KEY, true)
  if (param === '0') {
    write(FLAG_KEY, false)
    write(LOG_KEY, [])
    entries = []
  }
  enabled = read<boolean>(FLAG_KEY, false)
  return enabled
}

export function getAudioLog(): AudioLogEntry[] {
  entries ??= read<AudioLogEntry[]>(LOG_KEY, [])
  return entries
}

export function clearAudioLog(): void {
  entries = []
  started = 0
  write(LOG_KEY, entries)
  listeners.forEach((fn) => { fn() })
}

export function subscribeAudioLog(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function audioLog(event: string, detail: unknown = ''): void {
  if (!isAudioDebug()) return
  const now = Date.now()
  const list = getAudioLog()
  if (list.length === 0 || started === 0) started = now
  list.push({
    t: Math.round((now - started) / 100) / 10,
    vis: typeof document !== 'undefined' && document.visibilityState === 'visible' ? 'v' : 'h',
    event,
    detail: String(detail),
  })
  if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES)
  write(LOG_KEY, list)
  listeners.forEach((fn) => { fn() })
}

export function formatAudioLog(list: AudioLogEntry[]): string {
  return list
    .map((e) => `${e.t.toFixed(1)}s ${e.vis} ${e.event}${e.detail ? ' ' + e.detail : ''}`)
    .join('\n')
}
