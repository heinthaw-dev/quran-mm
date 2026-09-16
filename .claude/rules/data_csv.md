---
paths:
  - "pwa/src/data/**"
  - "pwa/scripts/sync-assets*"
  - "pwa/public/data/**"
  - "assets/**"
---

# CSV data (`assets/`)

These facts were checked in `001.csv` and `002_notes.csv`. Phase 0 confirms them for every file; update this file if any file differs.

## Format
- Likely naming: `NNN.csv` (surah translation) and `NNN_notes.csv` (notes).
- UTF-8, no BOM, CRLF line endings, and the file ends with a CRLF. Header and text fields are quoted; some fields contain commas.
- `NNN.csv` columns: `Ayat_id`, `mm_Translation`, `multi_ayats`. `Ayat_id` starts at 0. `multi_ayats` is empty or a range like `1-2` (one row covers several ayat).
- `NNN_notes.csv` columns: `notes_id`, `explanation`. IDs are strings: `002_notes.csv` skips `171` and has `217a` and `217b`.
- Note IDs look global: `001.csv` uses markers 1–13, and `002_notes.csv` holds 14–337.
- Translations embed footnote markers as plain ASCII numbers (`… 3 … 4`). Notes also contain numbers that are not markers.
- Text is Unicode Burmese (not Zawgyi), mixed with Arabic (including ﷺ) and curly quotes.

## Phase 0 audit (verified 2026-09-16)
- `assets/` holds 235 files: 114 `NNN.csv` (ids 1–114, no gaps, 3-digit zero-padded), 114 `NNN_notes.csv` (matching 1–114), 7 special files. Total ≈ 9.61 MB.
- All 235 files are valid UTF-8 with no BOM. Every `NNN.csv`/`NNN_notes.csv` uses CRLF and ends with a CRLF; headers are exactly `"Ayat_id","mm_Translation","multi_ayats"` and `"notes_id","explanation"`.
- `001.csv` `Ayat_id` starts at 0 (basmala row), but `002.csv` starts at 1 — do not assume every surah has an ayat 0. Surah 1 has ids 0–6 (matches the "Ayat 0 / 6" stepper).
- Note-ID facts confirmed: `001_notes.csv` = "1".."13"; `002_notes.csv` = "14".."337", skips "171", includes "217a"/"217b". Markers are global and sequential across surahs.

## Special files (not `NNN`-pattern)
- `Quran_Dataset.csv` (~1.4 MB, 6237 data rows): header `surah_no,ayah_no_surah,ayah_ar` — the Arabic ayah text source. Unquoted header, CRLF, ends with CRLF.
- `quran_surahs.csv` (114 rows): header `number,name,englishName,englishNameTranslation,numberOfAyahs,revelationType` — English/Arabic surah metadata. NOTE: LF-only line endings (no CRLF) and no trailing newline — parser must accept both.
- `surah_mm_name.csv` (114 rows): header `surah_id,surah_myanmar_name` — Myanmar surah names. CRLF, no trailing newline.
- `biography.html`, `developer.html`, `introduction.html`, `preface.html`: HTML content pages (CRLF, no trailing newline), likely rendered in a WebView/content viewer from the drawer.

## Rules
- Copy the Kotlin parsing behavior exactly: header handling, trimming, marker detection, sorting, lookups. If it looks buggy, report it instead of silently copying or fixing it.
- Look notes up by ID string, never by row index or as a number.
- `assets/` is the single source. `npm run sync-assets` copies the files to `pwa/public/data/`; never edit the copies.
- Parse with PapaParse. Load a surah's files only when needed, and cache the parsed result in memory.
- Never read a whole CSV into the conversation; rows are very long. Sample a few rows with a script.
