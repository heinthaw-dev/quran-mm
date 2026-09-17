// Single-source audio config — swap VITE_AUDIO_BASE_URL in .env.local to change host
export const AUDIO_BASE_URL: string = import.meta.env['VITE_AUDIO_BASE_URL'] ?? ''

export function audioUrl(surah: number, ayat: number): string {
  const s = String(surah).padStart(3, '0')
  const a = String(ayat).padStart(3, '0')
  return `${AUDIO_BASE_URL}/audio/${s}/${s}${a}.mp3`
}
