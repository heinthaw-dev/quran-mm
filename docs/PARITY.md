# Parity tracker

One row per screen, notable state, or feature. Status: `todo` · `in-progress` · `done` · `blocked`. Screenshots = raw `adb` PNGs in `App Screenshots/` (1080×2340).

## Foundation (Phase 1)

| Item | Status | Notes |
|---|---|---|
| Vite + React + TS scaffold | done | Node 24, React 19, TS 6, strict + noUncheckedIndexedAccess |
| Folder structure | done | app/ features/ ui/ hooks/ data/ theme/ |
| CSS tokens | done | `npm run tokens` → tokens.css; 4 themes, all sizes |
| Fonts (WOFF2) | done | Noto Naskh Arabic + Noto Sans Myanmar, offline-bundled |
| sync-assets script | done | Copies 235 CSVs + downloads fonts |
| CSV parsers + unit tests | done | 11 tests pass; handles 217a/217b, missing 171, CRLF, LF |
| Visual check script | done | pixelmatch, 1% limit; identical→PASS, shifted→FAIL verified |
| PWA setup | done | vite-plugin-pwa, manifest, icons, runtime CSV caching |
| App shell + routes | done | BrowserRouter; `/` reader, `/s/:surah/:ayat`, `/info/:page` |
| Storage persist | done | `navigator.storage.persist()` on startup |

| Item | Type | Screenshot | Route | Status | Notes |
|---|---|---|---|---|---|
| Splash | screen | 11.png | `/` | done | kw_logo centered, near-white bg, 2000 ms; visual test uses 11-chrome.png (Android ICC color diff) |
| Reader (single-column) | screen | 01.png (Blue) | `/` | done | HorizontalPager, 3 cards per ayat page; Chrome baseline 01-chrome.png |
| Reader — Pink theme | state | 12.png | `/` | todo | Same layout, Pink theme tokens |
| Reader — empty Tafsir notes | state | 12.png | `/` | todo | "No Explanation Notes (Tafsir) for this Ayat." placeholder |
| Feature: Swipe paging (L/R between ayats) | feature | — | `/` | todo | HorizontalPager; core reading nav |
| Reader — history icon active | state | — | `/` | todo | History button tinted primary when jumps exist (needs capture) |
| Nav drawer | drawer | 02.png | overlay | todo | 320 dp; Audio / App Settings / Translator's Info + Developer/About/Exit |
| Info viewer — Preface | screen | 04.png | `/info/preface` | todo | WebView → inline HTML |
| Info viewer — Introduction | screen | 05.png | `/info/introduction` | todo | |
| Info viewer — Biography | screen | 06.png | `/info/biography` | todo | |
| Info viewer — Developer | screen | 07.png | `/info/developer` | todo | |
| Dialog: Select Surah | dialog | — | overlay | todo | List all surahs → opens Jump to Ayat (needs capture) |
| Dialog: Jump to Ayat | dialog | — | overlay | todo | Number input, validates 1..total (needs capture) |
| Dialog: Select App Theme | dialog | 03.png | overlay | todo | Blue / Green / Pink / Brown |
| Dialog: Select Surahs to Download | dialog | 09.png | overlay | todo | Pending HTTPS mirror URL + MP3 archive |
| Dialog: Download progress | dialog | — | overlay | todo | Dual progress bars, ETA, pause/stop (needs capture) |
| Dialog: Select Audio to Delete | dialog | 10.png (Pink) | overlay | todo | Cache API entries, not device files |
| Dialog: Delete progress | dialog | — | overlay | todo | Single progress bar (needs capture) |
| Dialog: Jump History | dialog | — | overlay | todo | Shown when >2 saved positions (needs capture) |
| Dialog: About App | dialog | 08.png | overlay | todo | Version + copyright |
| Dialog: Update Available | dialog | — | overlay | n/a | DROPPED — Android APK updater, not for PWA |
| Feature: Theme system (4) | feature | 03.png | — | todo | `app_theme` pref |
| Feature: Font scaling A-/A+ | feature | 01.png | — | todo | 3 independent scales, not persisted |
| Feature: Footnote markers + jump links | feature | 01.png | — | todo | pink superscripts + `[surah:ayat]` links |
| Feature: Last-read position | feature | — | — | todo | `remember_last_read` pref |
| Feature: Continuous swiping | feature | — | — | todo | cross-surah wrap at boundaries |
| Feature: Audio playback | feature | — | — | todo | Pending HTTPS mirror URL + MP3 archive |
| Feature: Update checker | feature | — | — | n/a | DROPPED — Android-only |
| State: Dark mode | state | — | — | n/a | App is light-only; no dark theme exists |
