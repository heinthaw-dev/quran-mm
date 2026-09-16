import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        // CSVs are large (~9.6 MB total) — precache only surah index files
        // per-surah CSVs load on demand via runtime caching
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.csv$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'csv-data',
              expiration: { maxEntries: 300 },
            },
          },
          {
            urlPattern: /\/data\/.*\.html$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'html-pages',
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
