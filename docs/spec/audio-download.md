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

## Select layout (from 09.png — already-downloaded surahs excluded, so list starts at 2; footer "112 Surah selected. Download size: 547.0 MB")
- Title "Select Surahs to Download".
- "Uncheck All" / "Check All" toggle link (`#1976D2`).
- Checkbox rows: `Surah N: <MyanmarName> ကဏ္ဍ (N)`. Already-downloaded rows are disabled/checked-gray.
- Footer: "N Surah selected." + "Download size: X MB" (`totalAyats * 0.0894` MB per surah; all = 557.4 MB).
- Actions: "Close" (text) + "Download Selected" (filled primary pill).

## Progress layout (no screenshot)
- Dual progress bars: surah progress + ayat progress, plus ETA text, Pause/Resume/Stop buttons. Non-dismissable while active.

## Download mechanics
- URL `http://38.247.64.94/uploads/Quran_32kbps/<sss>/<sss><aaa>.mp3` → stored `filesDir/audio/Quran_32kbps/<sss>/<sss><aaa>.mp3`.
- Surah 1 includes ayat id 0 (Basmala).

## Open questions
- Q3: audio host/protocol — HTTPS mirror? bundle audio? drop audio for v1?
