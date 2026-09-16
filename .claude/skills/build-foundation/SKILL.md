---
name: build-foundation
description: Phase 1. Scaffold the React PWA in pwa/ and build the shared foundation - tooling, tokens, fonts, CSV data layer, visual check script, and PWA setup.
disable-model-invocation: true
---

# Phase 1: build the foundation

Read `docs/spec/_overview.md` first. Most files don't exist yet, so read the rule file named in each step before doing it. Commit after each step.

1. **Scaffold.** Read `.claude/rules/tech_stack.md`. Run `npm create vite@latest pwa -- --template react-ts`, remove the demo content, install the stack from the rule, and add the npm scripts listed in `CLAUDE.md`. Make sure `appKey.txt`, `node_modules/`, `dist/`, and test output are git-ignored.
2. **Structure.** Read `.claude/rules/architecture.md`. Create the folders it lists, including `src/ui/index.ts` and `src/data/types.ts`, so later sessions have files that load the rules.
3. **Theme.** Read `.claude/rules/ui_components.md`. Write `scripts/tokens.ts` (`npm run tokens`) to generate `src/theme/tokens.css`. Convert the fonts to WOFF2 and add the `@font-face` rules. Ask `android-explorer` for any value the overview lacks.
4. **Data.** Read `.claude/rules/data_csv.md` and `.claude/rules/testing.md`. Write `scripts/sync-assets.ts` (`npm run sync-assets`), the parsers and lookups in `src/data/`, and the shared hooks in `src/hooks/`, with unit tests on real rows.
5. **Visual check.** Read `.claude/rules/visual_parity.md`. Write `scripts/visual-check.ts` (`npm run test:visual -- <screen-id>`). Self-test it: identical images must print 0% and PASS, and an image shifted by a few pixels must FAIL.
6. **PWA.** Read `.claude/rules/pwa_offline.md`. Set up vite-plugin-pwa, the manifest, icons, precaching, and storage persistence.
7. **Shell.** Add the app shell and one placeholder route per screen listed in `docs/PARITY.md`.
8. **Finish.** Run typecheck, lint, tests, and build. Mark the foundation rows `done` in `docs/PARITY.md`. Report in a few lines, then suggest `/clear` before the first `/port-screen`.
