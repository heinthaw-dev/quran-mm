import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { DATA_CACHE_NAME } from './src/data/cacheNames.ts'

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
        // Shell only. The ~10 MB CSV set is cached by cacheOfflineData() behind
        // the splash progress bar, so the user sees it happen instead of waiting
        // on a silent install (see src/data/dataCache.ts).
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/data/') && url.pathname.endsWith('.csv'),
            handler: 'CacheFirst',
            options: {
              cacheName: DATA_CACHE_NAME,
              cacheableResponse: { statuses: [0, 200] },
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
