# Reader (main screen)

Screenshots: 01.png (Blue theme, Al-Kahf 1/110), 12.png (Pink theme + empty-notes state)
Route: `/` ; deep link `/s/:surah/:ayat`

## Purpose
The core screen: read one ayat "page" at a time (Arabic + Myanmar translation + Tafsir notes), navigate surahs/ayats, scale fonts, play audio.

## Composable
`QuranMMApp` (`app/MainActivity.kt:188`). `ModalNavigationDrawer` → `Scaffold`. Body = `HorizontalPager`; each page = `LazyColumn` of three `BlueprintCard`s. Single-column only. **Swipe left/right between ayat pages is a required feature** (this is what 06.jpg's arrows illustrate).

## Top bar — Row 1 (`BlueprintTopBar`, `app/BlueprintTopBar.kt:39`)
- Hamburger (Menu, 32 dp) → open drawer.
- `< Surah N/114 >`: arrows step `selectedSurahId`; gray `LightGray` when at first/last. Chip (rounded 8 dp, shadow 4 dp) → Select Surah dialog.
- `< Ayat M/total >`: arrows step pager ±1 page; wraps across surahs when Continuous Swiping on. Chip → Jump to Ayat dialog.
- History icon (contentDescription "History"): tint `theme.primary` when jumps exist else `LightGray`. If `jumpHistory.size <= 2` jumps back to origin + clears; if `> 2` opens Jump History dialog.

## Top bar — Row 2 (sub-bar)
- English surah name (16 sp, bold, `theme.primary`), e.g. "Al-hamd".
- Whole-surah play/pause (32 dp) → `toggleSurahAudio`; tint primary, 0.3 alpha when audio unavailable.
- Auto-Focus GPS icon (22 dp): enabled only while surah playing. `GpsNotFixed`/`GpsFixed`, toggles `isAutoTracking`, Toast "Auto-Focus ON/OFF".
- Myanmar surah name (14 sp, bold, `theme.primary`, maxLines 2, lineHeight 20, right-aligned), e.g. `'အံ့မခန်းဖွယ် စီမံမှု' ကဏ္ဍ (၁)`.

## Cards (per ayat page)
Order: Arabic → Myanmar Translation → Explanation Notes (Tafsir). Each `BlueprintCard` (`app/BlueprintCard.kt`): themed header strip (`theme.card` bg) with title + right-side actions; white body.
1. **Arabic**: title `شُوْرَةُ الْحَمْدِ [1:0]` (surah Arabic name + `[surah:ayat]`). Actions: play (current ayat via `ayatPlayer`), PlaylistPlay (start surah from here; enabled when `loadedAyatIndex == page`), copy, A-, A+. Body: Arabic ayah text 28 sp × `arabicFontScale`, right-aligned, `#222`, ends each ayah with `۝` + Eastern-Arabic numeral. Font `muhammadi_quran` intended but **commented out** → system font currently.
2. **Myanmar Translation**: actions copy, A-, A+. Body 18 sp × `myanmarFontScale`, line 28. `mm_Translation` split on `@`: part0 = text (`#`→newline), part1 = inline "Translation Note" (12 sp label). Footnote number markers rendered pink superscript (12 sp, `#D81B60`), not tappable.
3. **Explanation Notes (Tafsir)**: actions copy, A-, A+. Body 18 sp × `noteFontScale`. Notes for markers found in the translation, looked up by `noteId` string in current surah `NNN_notes.csv`, joined `\n\n`. `[14]`-style ID labels pink bold; `[surah:ayat]` links `theme.primary` bold and tappable → `executeJump`. **Empty state** (12.png): two gray lines "No Explanation Notes (Tafsir) for this Ayat." + Burmese equivalent, 15 sp.

## Font scaling
Three independent `Float` scales (arabic/myanmar/note), default 1.0, range 0.8–1.5, step 0.1, via A-/A+. NOT persisted (reset on launch).

## Behavior / state
- `selectedSurahId` load: parses `NNN.csv`, `NNN_notes.csv`, scans `Quran_Dataset.csv` for Arabic (O(6237) each load).
- Last-read auto-save (500 ms debounce) when `remember_last_read` on.
- `executeJump` / `handleJumpClick` drive cross-reference navigation and history.

## Exact measurements (from android-explorer)
- TopBar outer: px-1 py-2 + statusBarsPadding. Row1: SpaceEvenly. Row2: SpaceBetween, px-3 py-1.
- Menu/History: 32dp icon, 4dp inner pad. Chevrons: 28dp, 2dp inner pad. GPS: 22dp icon.
- Chip: 8dp radius, 4dp shadow, px-2 (outer) + px-2 (inner), minW 60dp, 12sp/14sp.
- Card: 12dp corner, 2dp elevation. Outer: mx-1.5 my-1. Header: px-3 py-2. Body: p-3.
- Card icon row: 4dp gap. Play/PlaylistPlay: 26dp. Copy: 20dp. A-/A+: 15sp, px-1.
- Page: contentPadding top=6dp bottom=24dp. Cards separated by 4+4=8dp (from outer margin).
- Footnote markers: regex `(?<=\s)\d+[a-zA-Z]?(?=[\s။,]|$)`. Crossref: `\[\d+:[\d,-]+\]`.
- Arabic end mark: `۝` + Eastern-Arabic numerals (char.code + 1584). Appended by app.
- multi_ayats = one pager page per CSV row; Arabic texts for all IDs joined with space.
