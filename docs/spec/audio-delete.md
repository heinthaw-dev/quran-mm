# Audio delete (select + progress)

Screenshots: 10.png (select — Pink theme)
Route: overlay

## Status
**Blocked** — depends on the audio storage decision (Q3). Only relevant if downloaded audio exists.

## Purpose
Free space by deleting downloaded surah audio.

## Composables
- Scan spinner `isScanning` (`MainActivity.kt:875`).
- Select `showDeleteSelectionDialog` (`MainActivity.kt:1009`).
- Progress `showDeleteDialog` (`MainActivity.kt:1092`), non-dismissable during deletion.

## Select layout (from 10.png)
- Title "Select Audio to Delete" in accent pink `#D81B60`.
- "Check All" link (blue).
- Checkbox rows = downloaded surahs only, e.g. `Surah 1: '…' ကဏ္ဏ (၁)`, `Surah 18: '…' ကဏ္ဏ (၁၈)` (unchecked by default).
- Surah 1 row: checkbox always `disabled` (Color.Gray), can't be tapped individually. "Check All" still sweeps it into the selection (checked, gray, counted toward size, deletable); "Uncheck All" clears it back out along with the rest (user-verified 2026-09-26).
- Footer: "N Surah selected." + "Freed up size: X MB" in pink (e.g. "0 Surah selected. / Freed up size: 0.0 MB").
- Actions: "Close" (primary text) + "Delete Selected" (pink pill, disabled when 0 selected).

## Progress layout
- Single progress bar.

## Behavior
- Deletes matching files under `filesDir/audio/Quran_32kbps/`.
- PWA equivalent: clear entries from Cache API / OPFS.

## Open questions
- Exact copy/labels — no screenshot; capture in port phase if built.
