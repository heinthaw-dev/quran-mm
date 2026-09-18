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
| Reader (single-column) | screen | 01.png (Blue) | `/` | done | HorizontalPager, 3 cards per ayat page; Chrome baseline 01-chrome.png. Owner polish 2026-09-18: Surah/Ayat chips use `--shadow-chip` (4-sided elevation, was bottom-only); Myanmar surah name uses `--lh-myanmar: 1.7` so stacked diacritics are not clipped — both intentional deviations from Android |
| Reader — Pink theme | state | 12.png | `/` | n/a | Descoped by owner 2026-09-17 |
| Reader — empty Tafsir notes | state | 12.png | `/` | n/a | Descoped by owner 2026-09-17 |
| Feature: Swipe paging (L/R between ayats) | feature | — | `/` | done | Touch-driven 3-slot pager in ReaderScreen; threshold 60px; snap animation 0.28s |
| Reader — history icon active | state | — | `/` | todo | History button tinted primary when jumps exist (needs capture) |
| Nav drawer | drawer | 02.png | overlay | done | 320 dp; Audio / App Settings / Translator's Info + Developer/About/Exit; switches toggle prefs; switch track = green (Material default); Chrome baseline 02-chrome.png; status bar in raw adb screenshots = 100px (38dp at 420dpi) |
| Info viewer — Preface | screen | 04.png | `/info/preface` | done | WebView → inline HTML; Chrome baseline 04-chrome.png; visual 0.00% PASS |
| Info viewer — Introduction | screen | 05.png | `/info/introduction` | done | Chrome baseline 05-chrome.png; visual 0.00% PASS |
| Info viewer — Biography | screen | 06.png | `/info/biography` | done | Chrome baseline 06-chrome.png; visual 0.00% PASS |
| Info viewer — Developer | screen | 07.png | `/info/developer` | done | Title "Developer" (was "Developer / About"); 3 title+background sections (Intention / Disclaimer of Liability / ရှင်းလင်းချက်) mirrored from developer.html's own CSS; Chrome baseline 07-chrome.png; visual 0.00% PASS |
| Dialog: Select Surah | dialog | — | overlay | done | Scrollable list, current surah highlighted + auto-scrolled; tap row → opens Jump to Ayat |
| Dialog: Jump to Ayat | dialog | — | overlay | done | Outlined input, validates 1..totalAyats, Go = filled primary pill; opened from Ayat chip or after surah select |
| Dialog: Select App Theme | dialog | 03.png | overlay | done | Blue / Green / Pink / Brown; Chrome baseline 13-chrome.png; visual check PASS 0.00% |
| Dialog: Select Surahs to Download | dialog | 09.png | overlay | done | Chrome baseline 09-chrome.png; visual 0.00% PASS; download mechanics live against the ngrok HTTPS host; fixed iOS Safari bug where surah list rendered 0-height (`.list { flex: 1 }` in an auto-height dialog collapses under WebKit; use `flex: 0 1 auto; min-height: 0`) |
| Dialog: Download progress | dialog | — | overlay | done | "Downloading Audio" modal: dual bars, ETA (mm:ss), Pause/Resume + Stop; sequential engine, resumable via cache-skip; built to spec + image #4; component test green. No adb capture → no pixel visual test (like other capture-less dialogs). Live download works over the ngrok HTTPS host; ngrok free returns its ERR_NGROK_6024 interstitial (no CORS headers) to cors fetch(), so `config.ts` adds `ngrok-skip-browser-warning` for ngrok hosts only. |
| Dialog: Select Audio to Delete | dialog | 10.png | overlay | done | Cache API entries, not device files; title/freed-size hardcoded #D81B60; Chrome baseline audio-delete-chrome.png; visual 0.00% PASS; same iOS Safari `flex: 1` list-collapse bug fixed (see Select Surahs to Download row) |
| Dialog: Delete progress | dialog | — | overlay | todo | Single progress bar (needs capture) |
| Dialog: Jump History | dialog | — | overlay | todo | Shown when >2 saved positions (needs capture) |
| Dialog: About App | dialog | 08.png | overlay | done | Rebuilt to the measured Android values: card 320dp/16dp radius, title 24sp, body 14sp/20sp on #49454F, disclaimer 12sp/16sp #888888, **one** divider (was four), 24dp + 28dp section gaps. Baseline renamed dialog-about-chrome.png (08-chrome.png is the stale pre-fix one); visual 0.00% PASS. Every band within 1dp of 08.png except the title (3.4dp high) — Roboto not self-hosted yet |
| Dialog: Update Available | dialog | — | overlay | n/a | DROPPED — Android APK updater, not for PWA |
| Feature: Theme system (4) | feature | 03.png | — | done | `app_theme` pref; SelectThemeDialog wired to onPrefsUpdate |
| Feature: Font scaling A-/A+ | feature | 01.png | — | done | 3 independent scales in AppPrefs; persisted to localStorage on each tap |
| Feature: Footnote markers + jump links | feature | 01.png | — | done | pink superscripts (`--color-accent`) + `[surah:ayat]` tappable links; `TranslationText` + `NotesText` in RichText.tsx |
| Feature: Last-read position | feature | — | — | done | `scheduleSave` called on all navigation (prevPage/nextPage/prevSurah/nextSurah/goTo); 500ms debounce; gated by `rememberLastRead` pref |
| Feature: Continuous swiping | feature | — | — | done | prevPage/nextPage wrap to prev/next surah at boundaries; NavDrawer switch wired |
| Feature: Audio playback | feature | — | — | done | `useAudio` hook; single-ayat + surah-sequential play; auto-track; `config.ts` single-source URL. Playback fetches the ayat and plays a blob URL instead of `el.src = <remote>` — a media element cannot send `ngrok-skip-browser-warning`, so ngrok's interstitial returned HTML it could not decode. Downloaded ayats come from Cache Storage; undownloaded ones stream and are not cached, so the Delete Audio list still means "downloaded", like native. |
| Feature: Update checker | feature | — | — | n/a | DROPPED — Android-only |
| State: Dark mode | state | — | — | n/a | App is light-only; no dark theme exists |
