---
name: discover-app
description: Phase 0. Map the Android app before any web code is written. Audits the CSVs, writes docs/spec/ and docs/PARITY.md, and ends with open questions.
disable-model-invocation: true
---

# Phase 0: map the Android app (no app code)

Capture everything later phases need, so nobody has to read the Kotlin again. Don't create `pwa/` yet; the Phase 1 scaffold needs that folder to be missing.

1. **Duplicates.** Find the copies of `MainActivity.kt` and `AndroidManifest.xml` inside `app/` and diff them against the root files. If they differ, ask which is current before going on.
2. **Data audit.** Read `.claude/rules/data_csv.md`. Run a one-off script (Node or Python, whichever is installed; don't save it) that checks every file in `assets/`: naming pattern, encoding, BOM, line endings, headers, ID format and gaps, and total size. Update `data_csv.md` if a fact is wrong for any file.
3. **Inventory.** List the folders in `res/`, the file types in `assets/`, and the images in `App Screenshots/` and `App Icons/` with their pixel sizes (`file <image>` prints them). Note whether the screenshots are raw device captures or store graphics.
4. **App map.** Ask `android-explorer` for: the screens, dialogs, and sheets; navigation; settings and saved preferences; the theme (colors, typography, fonts); and Android-only features such as ads, reviews, sharing, or notifications.
5. **Screen briefs.** For each screen, ask `android-explorer` for a screen brief, one screen per request. Save it as `docs/spec/<screen-id>.md` with a kebab-case id such as `surah-list`, and add two lines under the title: `Screenshots:` (matching files) and `Route:` (planned URL). Keep each file under about 60 lines.
6. **Overview.** Write `docs/spec/_overview.md` in under about 80 lines: screen ids and routes, navigation, global behavior, theme summary, resource inventory, data audit results, a Device section for the visual check, and Android-only features with proposed web equivalents.
7. **Tracker.** Write `docs/PARITY.md` as one table with the columns `Item | Type | Screenshot | Route | Status | Notes`. Add one row per screen, important state (empty, dark mode, dialog open), and feature. Status is `todo`, `in-progress`, `done`, or `blocked`.
8. **Questions.** Finish with one numbered list of open questions. Don't start Phase 1.
