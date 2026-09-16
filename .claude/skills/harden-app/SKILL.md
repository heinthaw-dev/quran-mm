---
name: harden-app
description: Phase 3. Final checks before release - offline behavior, cache size, visual checks, Lighthouse, real-device checklist, and a full parity review.
disable-model-invocation: true
---

# Phase 3: harden the app

First read `pwa/vite.config.ts` and one existing test file. This loads the PWA and testing rules.

1. **Offline.** Add a Playwright e2e test: load the app, go offline, then open every screen and at least one note. Everything must render.
2. **Cache size.** Report the precache total and the largest file. Confirm the Workbox size limit skips nothing.
3. **Visual.** Re-run the visual check for every screen in `docs/PARITY.md` and list any that fail.
4. **Lighthouse.** Run Lighthouse (performance, accessibility, best practices) against the production build (`npm run build`, then `npm run preview`). Fix what doesn't change the look, and list the rest.
5. **Real devices.** Give the user a short checklist to run by hand:
   - Android Chrome: install, open while offline, back button, status bar color.
   - iPhone Safari: Add to Home Screen, fonts, safe areas, offline.
6. **Parity review.** Every PARITY row must be `done` or have a note the user approved.
7. **Report.** Results, remaining risks, and anything that needs a decision.
