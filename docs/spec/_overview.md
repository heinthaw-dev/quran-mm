# App overview — Myanmar Quran translation (KW)

Single-Activity Jetpack Compose app. One reader screen, a nav drawer, several dialogs, and a full-screen WebView content viewer. No Jetpack Navigation library — all "navigation" is Compose state. App name: `ကုရ်အာန် (KW)`. Package `com.quranmm.app`, version V 1.0.0. Light theme only (no dark mode).

## Source of truth
Current source is the modular `app/` set (`MainActivity.kt` + siblings) — **confirmed by owner**. The root `/MainActivity.kt` is an older monolithic snapshot — ignore it.

## Screens / surfaces & routes (planned PWA URLs)
| id | Type | Route |
|---|---|---|
| `splash` | overlay on load (2000 ms) | `/` |
| `reader` | main screen (HorizontalPager of 3 cards) | `/` , deep link `/s/:surah/:ayat` |
| `nav-drawer` | left modal drawer (320 dp) | overlay |
| `info-viewer` | full-screen WebView (4 HTML pages) | `/info/:page` |
| `dialog-select-surah` | dialog | overlay |
| `dialog-jump-to-ayat` | dialog | overlay |
| `dialog-select-theme` | dialog | overlay |
| `audio-download` | select + progress dialogs | overlay |
| `audio-delete` | select + progress dialogs | overlay |
| `dialog-jump-history` | dialog | overlay |
| `dialog-about` | dialog | overlay |
| `dialog-update` | dialog (auto on launch) | overlay |

## Navigation / global behavior
- Top bar Row 1: hamburger (open drawer) · `< Surah N/114 >` stepper (chip opens Select Surah) · `< Ayat M/total >` stepper (chip opens Jump to Ayat) · History icon (returns to origin position / opens history).
- Top bar Row 2: English surah name · whole-surah play/pause · Auto-Focus (GPS) toggle · Myanmar surah name.
- Steppers change `selectedSurahId` and pager page. Continuous-swipe pref wraps across surahs at boundaries.
- Three cards per ayat page: Arabic, Myanmar Translation, Explanation Notes (Tafsir). Each has independent A-/A+ font scaling.
- Footnote markers (pink superscripts) and `[surah:ayat]` jump links inside translation/notes.

## Theme
4 themes (`app_theme` pref, default BLUE). Each defines primary / bg / card:
- BLUE `#4B559C` / `#F0F4F8` / `#D4E6FF`  · GREEN `#2E7D32` / `#E8F5E9` / `#C8E6C9`
- PINK `#D81B60` / `#FCE4EC` / `#F8BBD0`  · BROWN `#5D4037` / `#EFEBE9` / `#D7CCC8`
- Accent pink `#D81B60` (footnotes, note IDs, delete). Card body white; top bar white + 4 dp shadow. Arabic text `#222`, body text `#333`.
- Fonts: `muhammadi_quran.ttf` (Arabic — `fontFamily` commented out, so Arabic renders in system font; `me_quran.ttf` unused). UI = system default.
- **PWA font decision (owner-approved):** default webfonts **Noto Naskh Arabic** (Arabic) + **Noto Sans Myanmar** (UI/Burmese), bundled for offline. Define fonts in **ONE global place** (single font tokens file / CSS var) so swapping later touches one file only. Verify glyphs vs 01/02/12.png in port; device Myanmar font unknown (parity risk).
- Sizes (sp): Arabic 28 · Myanmar/notes 18 (line 28) · Arabic surah title 22 · top-bar English 16 / Myanmar 14 / chip 12. A-/A+ scale 0.8–1.5, step 0.1, NOT persisted.

## Resource inventory
- `assets/`: 235 files — 114 `NNN.csv`, 114 `NNN_notes.csv`, `Quran_Dataset.csv` (Arabic), `quran_surahs.csv` (English meta, LF-only), `surah_mm_name.csv`, 4 HTML pages.
- `res/font/`: `me_quran.ttf`, `muhammadi_quran.ttf`. `res/values/`: 7 colors, `Theme.Material.Light.NoActionBar`.
- Icons: mipmap launcher set + `res/drawable/kw_logo.png` (576×504, splash logo). `App Icons/Feature Graphic.psd` (1024×500).

## Data audit
All CSVs valid UTF-8, no BOM. `NNN` files CRLF + trailing CRLF; `quran_surahs.csv` is LF-only. Ids 1–114 no gaps. `001.csv` starts at Ayat_id 0 (basmala); `002.csv` at 1. Note IDs global/sequential (`001_notes` 1–13, `002_notes` 14–337, skips 171, has 217a/217b). See `.claude/rules/data_csv.md`.

## Audio (feature, kept)
Per-ayah MP3, original source `http://38.247.64.94/uploads/Quran_32kbps/<sss>/<sss><aaa>.mp3` (cleartext HTTP). ~557 MB for all 114. Two ExoPlayers (surah playlist + single ayat). Bismillah prepended for surahs ≠ 1, 9. **Decision:** owner will host the MP3 set on an **HTTPS mirror**; PWA fetches per-ayah on demand (Cache API for offline). Base URL TBD; keep the same `<sss>/<sss><aaa>.mp3` path shape so only the host swaps.

## Android-only features → web equivalents
- Update checker (`http://.../APK/update.json`, opens APK URL) → **dropped** (owner decision). PWA self-updates via service worker.
- Exit App (`finishAndRemoveTask` + `exitProcess`) → **dropped** (no web equivalent).
- Cleartext HTTP + INTERNET permission → PWA over HTTPS cannot do mixed content.
- File download to internal storage → Cache API / OPFS for offline audio.
- No ads, sharing, reviews, or notifications.

## Device (for visual check)
`App Screenshots/01.png`–`12.png` are **raw `adb` captures, 1080×2340 px** (no frame/captions). Device: **`wm size` = 1080×2340, `wm density` = 420 dpi** → scale = 420/160 = **2.625**.
- Playwright: **viewport 411×891** (1080/2.625, 2340/2.625, rounded), **`deviceScaleFactor` = 2.625**.
- Crop the top status bar + bottom gesture bar; compare app content only (record bar heights when first measured).
- Missing raw captures: Select Surah, Jump to Ayat, Jump History dialogs, download/delete progress.

### Screenshot map
01 reader (Blue, Al-Kahf) · 02 drawer · 03 theme dialog · 04 Preface · 05 Introduction · 06 Biography · 07 Developer · 08 About · 09 download-select · 10 delete-select (Pink) · 11 splash · 12 reader (Pink, empty notes).
