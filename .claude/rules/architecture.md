---
paths:
  - "pwa/src/**"
---

# Architecture

## Folders in `pwa/src/`
- `app/`: shell, routes, providers.
- `features/<screen-id>/`: one folder per screen (components, CSS Modules, screen-only hooks).
- `ui/`: shared components that mirror shared Android components. Export them from `ui/index.ts`.
- `hooks/`: shared React hooks that give components data from `data/` (for example `useSurah`).
- `data/`: CSV loading, parsing, lookups, and caching. Domain types live in `data/types.ts`. Pure TypeScript, no React.
- `theme/`: generated tokens, `@font-face` rules, global CSS.

## Allowed imports
- `app` → `features`, `ui`, `theme`.
- `features` → `ui`, `hooks`, `theme`, and types from `data`.
- `hooks` → `data`. `ui` → `theme`. `data` imports nothing from the app.
- A feature never imports from another feature. Move shared code to `ui/`, `hooks/`, or `data/`.

## Code rules
- One-way flow: `data` → `hooks` → components. Components never parse or fetch.
- No `any`, and no non-null assertions to silence errors. Validate CSV rows where they enter `data/`.
- Keep functions and components small and single-purpose. Name components after the Android screen or composable they port, with a one-line `// Ports: <Kotlin name>` comment.
- Share code only when a second real use appears, or when the Android code already shares it.
- No dead code, no commented-out code, and no TODO without a `docs/PARITY.md` row.
- Comments explain why, not what.
