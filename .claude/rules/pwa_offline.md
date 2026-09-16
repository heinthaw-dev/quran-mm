---
paths:
  - "pwa/vite.config.*"
  - "pwa/index.html"
  - "pwa/public/**"
  - "pwa/src/main.tsx"
---

# PWA and offline

- Manifest from Android: `name` and `short_name` from `app_name`, `theme_color` from the status bar color, `background_color` from the window or splash background, `orientation` from `AndroidManifest.xml`, and `display: standalone`. Icons come from `App Icons/` (192, 512, maskable 512), plus an `apple-touch-icon`.
- Work offline like the Android app: precache the app shell, fonts, icons, and CSVs.
- Workbox skips files over 2 MiB unless `maximumFileSizeToCacheInBytes` is raised. If all CSVs together exceed ~15 MB, ask before precaching everything.
- Call `navigator.storage.persist()` so offline data is less likely to be evicted.
- Handle notches with `viewport-fit=cover` and `env(safe-area-inset-*)`.
- If the Android app links to `privacy_policy.html`, serve it from `pwa/public/`.
