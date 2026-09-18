// Cache Storage bucket names, shared by the app and by the service-worker
// runtime route in vite.config.ts. Kept DOM-free so the Node tsconfig that
// covers vite.config.ts can import it.
export const AUDIO_CACHE_NAME = 'quran-audio'

// Bump the suffix when the CSV content changes: these entries carry no Workbox
// revision, so a rename is what retires the stale ones.
export const DATA_CACHE_NAME = 'quran-data-v1'
