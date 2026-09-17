# Audio download (select + progress)

Screenshots: 09.png (select). Progress dialog: — (none)
Route: overlay

## Status
**Blocked** — audio source is cleartext HTTP (`http://38.247.64.94/...`), which a HTTPS PWA cannot fetch (mixed content). Needs a source decision before building (Q3).

## Purpose
Choose surahs to download for offline audio, then show download progress.

## Composables
- Scan spinner `isScanning` (`MainActivity.kt:875`): CircularProgressIndicator + "Scanning available files...".
- Select `showDownloadSelectionDialog` (`MainActivity.kt:890`).
- Progress `showDownloadDialog` (`MainActivity.kt:966`).

## Select layout (from 09.png — android-explorer verified 2026-09-17)
- Title "Select Surahs to Download".
- "Uncheck All" / "Check All" toggle link: hardcoded `#1976D2`, underlined, 14sp. Shows "Uncheck All" when all surahs selected; "Check All" otherwise. Unchecking all resets to only surah 1 selected (locked).
- Checkbox rows: `Surah N: MyanmarName` (no ကဏ္ဍ suffix, no Myanmar numerals). Surah 1 row always disabled (Color.Gray, checkbox unchecable); all others Color.Unspecified.
- Footer two separate lines:
  - Line 1: `"N Surah selected."` — 14sp, Color.Gray.
  - Line 2: `"Download size: X.X MB"` (%.1f, Locale.US) — 14sp, FontWeight.Bold, theme primary color.
- Actions: "Close" (text) + "Download Selected" (filled primary pill).
- Size formula: `selectedSurahs.sumOf { surahInfo.totalAyats * 0.0894 }` per surah.

## Progress layout — "Downloading Audio" (`showDownloadDialog`, MainActivity.kt:966; ref = user screenshot image #4, android-explorer verified 2026-09-17)
- Dialog bg = `theme.bg`; non-dismissable while `isDownloading` (back + tap-outside no-op; paused still counts as downloading).
- Title "Downloading Audio" — Bold, `theme.primary`.
- Body "Downloading selected Surahs for offline listening. Please keep the app open." — 14sp, Color.Gray.
- Line "Surah Progress: {batchIndex} / {totalSelected}" then "(Downloading Surah {quranSurahId})". `batchIndex` = 1-based index of current surah in the selected batch; `quranSurahId` = actual surah number. Both lines 14sp Bold `theme.primary`.
- Surah progress bar (fill = batchIndex / totalSelected), color `theme.primary`.
- Line "Ayat Progress: {pos} / {surahTotalAyats}" — per **current surah** only, resets each surah. `pos` = alreadyCached + missingIndex + 1 (so it starts at alreadyCached+1). 14sp Bold `theme.primary`.
- Ayat progress bar (fill = pos / surahTotalAyats).
- Line "ETA: {mm:ss} mins remaining", initial "ETA: Calculating...". Formula: `remaining / (downloaded / elapsedSec)` where remaining = globalMissing − downloaded; updates only after elapsed > 2s and downloaded > 0. Total-elapsed average, not rolling. 14sp Bold `theme.primary`.
- Buttons (right): "Pause" (bg `theme.primary`, label toggles "Resume") + "Stop" (bg `#D81B60`), white text, fully-rounded pill, not uppercase.
- Pause = true in-place suspend: loop polls `while(paused) delay(500ms)` before each surah and each ayat; same job resumes.
- Stop = cancel job + close dialog; keeps already-downloaded files; no confirmation.
- Completion = auto-close, no toast; resume across restarts is free (loop skips already-cached files).

## Download mechanics
- URL `http://38.247.64.94/uploads/Quran_32kbps/<sss>/<sss><aaa>.mp3` → stored `filesDir/audio/Quran_32kbps/<sss>/<sss><aaa>.mp3`.
- Surah 1 includes ayat id 0 (Basmala).

## Open questions
- Q3: audio host/protocol — HTTPS mirror? bundle audio? drop audio for v1?
