// Single-source audio config — swap VITE_AUDIO_BASE_URL in .env.local to change host
export const AUDIO_BASE_URL: string = import.meta.env['VITE_AUDIO_BASE_URL'] ?? ''

// Cache key, host-independent by design: downloads must survive a change of
// AUDIO_BASE_URL, and an exact-URL cache lookup against the host can miss when
// the host varies on a request header (ngrok varies on ngrok-skip-browser-warning).
export function audioPath(surah: number, ayat: number): string {
  const s = String(surah).padStart(3, '0')
  const a = String(ayat).padStart(3, '0')
  return `/audio/${s}/${s}${a}.mp3`
}

export function audioUrl(surah: number, ayat: number): string {
  return `${AUDIO_BASE_URL}${audioPath(surah, ayat)}`
}

// ngrok's free tier answers any browser-User-Agent request with an HTML warning
// page (ERR_NGROK_6024) that carries no Access-Control-Allow-Origin and never
// reaches the origin, so the download's cors fetch() fails while <audio>
// playback keeps working (media elements are no-cors and skip the CORS check).
// This header opts out of that page. It is not CORS-safelisted, so it adds a
// preflight per file — only send it when the host is actually ngrok.
export const AUDIO_FETCH_HEADERS: HeadersInit | undefined = AUDIO_BASE_URL.includes('ngrok')
  ? { 'ngrok-skip-browser-warning': '1' }
  : undefined
