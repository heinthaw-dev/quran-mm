<!--
Notes for humans. HTML comments are removed before Claude reads this file, so they cost no tokens.

Setup
1. Unzip into the project root (the folder with app/, assets/, res/). Start Claude Code there.
   The .claude folder is hidden in Finder: press Cmd+Shift+. to show it.

How to work (run /clear between steps)
  /discover-app  →  answer Claude's questions  →  /build-foundation  →  /port-screen <screen-id> (repeat)  →  /harden-app

Token notes
- This file loads every session, so keep it short. Topic rules in .claude/rules/ load only when Claude reads a matching file.
- Run /context to see what is loaded.
- android-explorer runs on Sonnet. Change its model to haiku in .claude/agents/android-explorer.md if its answers are good enough.
-->

# Project: Myanmar Quran translation app — Android (Kotlin) → React PWA

You are a senior software engineer with deep React, TypeScript, and Android experience. Follow YAGNI, DRY, and KISS. Prefer simple, proven solutions. When something is unclear or two sources disagree, ask before building, and batch questions into one numbered list.

## Goal

Rebuild the Android app as a PWA with the same UI (pixel-matched), features, and data, working fully offline.
Out of scope unless the user asks: backend, Play Store publishing (TWA), push notifications, analytics, SEO, new features.

## Sources of truth

- Look: `App Screenshots/`. Behavior and exact values: `app/` (Kotlin) and `res/`. Content: `assets/*.csv`.
- If a screenshot and the code disagree, ask.
- Android files are read-only. Only create or change files in `pwa/`, `docs/`, and the root `.gitignore`. Change `.claude/` or this file only when the user or a skill asks.
- Several folder names contain spaces. Quote paths in shell commands.

## Secrets

- Everything in a PWA bundle is public. Never put keys in client code.

## Where knowledge lives

- `.claude/rules/`: topic rules that load automatically when you read a file they cover: `tech_stack.md`, `architecture.md`, `ui_components.md`, `data_csv.md`, `visual_parity.md`, `pwa_offline.md`, `testing.md`.
- `docs/spec/_overview.md` (app map) and `docs/spec/<screen-id>.md` (one per screen).
- `docs/PARITY.md`: progress tracker, one row per screen, state, or feature.
- Android code: ask the `android-explorer` subagent a specific question. Don't read Kotlin in the main conversation.

## Context rules

- Load only what the current task needs. For a screen, that means its spec file, not the whole `docs/spec/` folder.
- Rules don't load when you create a new file. Before creating a file in `pwa/src/`, read one related existing file there first (for example `pwa/src/ui/index.ts` or `pwa/src/data/types.ts`). If none exists yet, read the rule file itself.
- Find things with Glob and Grep before opening files, and read line ranges of big files. Never read `MainActivity.kt` (~105 KB) or a CSV whole.
- Don't re-read a file that is already in context unless it changed.
- Work on one screen per session. When it's done, suggest that the user run `/clear`.

## Workflow

- `/discover-app`: Phase 0. Map the Android app into `docs/spec/` and `docs/PARITY.md`. No app code.
- `/build-foundation`: Phase 1. Scaffold `pwa/`, tokens, fonts, data layer, visual check, PWA setup.
- `/port-screen <screen-id>`: Phase 2. Build one screen until its visual check passes.
- `/harden-app`: Phase 3. Offline, iOS Safari, Lighthouse, final parity review.
- Git: one feature per commit (Conventional Commits), with `docs/PARITY.md` updated in the same commit. Ask before `git init`. Keep `node_modules/`, `dist/`, test output, and `appKey.txt` out of git.
- Before each commit: `npm run typecheck`, `npm run lint`, `npm test`, plus the visual check for UI changes.

## Commands (run in `pwa/`)

- `npm run dev` · `npm run build` · `npm run preview`
- `npm run typecheck` · `npm run lint` · `npm run format`
- `npm test` · `npm run test:e2e` · `npm run test:visual -- <screen-id>`
- `npm run sync-assets` · `npm run tokens`

## Lessons learned

Add one line per repeated mistake. Put topic-specific lessons in the matching rule file instead.
