---
paths:
  - "pwa/package.json"
  - "pwa/vite.config.*"
  - "pwa/tsconfig*.json"
  - "pwa/.oxlintrc.json"
  - "pwa/.prettierrc*"
---

# Tech stack

- Node 24 LTS and npm.
- Vite 8 + React 19 + TypeScript, from the official `react-ts` template. Keep its defaults: TypeScript ~6.0 (don't upgrade to 7 unless the user asks) and oxlint. Prettier formats code.
- TypeScript: set `strict: true` explicitly and add `noUncheckedIndexedAccess`.
- Styling: CSS Modules + CSS custom properties. No UI kit or CSS framework; their built-in look fights pixel parity.
- Routing: React Router, client-side only, one route per Android screen.
- CSV parsing: PapaParse. PWA: vite-plugin-pwa (Workbox).
- Tests: Vitest + React Testing Library (jsdom), Playwright, pixelmatch + pngjs.
- Write code for the major versions installed in `pwa/package.json`, not older API patterns.
- Not used (YAGNI): backend, SSR/Next.js, global state library, data-fetching library, CSS-in-JS, i18n library (unless `res/` has more than one locale).
- Before adding a dependency, check whether the platform or an existing dependency already covers it. Give the reason in the commit message.
