import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  // preview serves the built app (with the service worker) — tunnel THIS for offline
  preview: {
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
        // Precache the whole dataset (~9.6 MB CSV) so every surah works offline
        // without being visited first, matching the native app's bundled assets.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,csv}'],
        runtimeCaching: [
          {
            // Serve <audio> playback from the 'quran-audio' cache that
            // data/audioDownload.ts populates; rangeRequests lets the
            // element's byte-range requests hit the cached file.
            // Match only media-element requests (destination 'audio') so the
            // download's own cors fetch() bypasses the SW and reaches the
            // network directly — otherwise CacheFirst hijacks it and the
            // cross-origin (tunnel) response fails CORS.
            urlPattern: ({ request, url }) =>
              request.destination === 'audio' && /\/audio\/.*\.mp3$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'quran-audio',
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'ကုရ်အာန် (KW)',
        short_name: 'KW',
        description: 'Myanmar Quran Translation',
        theme_color: '#4B559C',
        background_color: '#F0F4F8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
