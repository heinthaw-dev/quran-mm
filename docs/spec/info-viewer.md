# Info viewer (WebView content pages)

Screenshots: 04.png Preface · 05.png Introduction · 06.png Biography · 07.png Developer
Route: `/info/:page` where page ∈ `preface | introduction | biography | developer`

## Purpose
Full-screen reader for the four bundled HTML content pages, opened from the drawer.

## Composable
`showInfoDialog` full-screen `Dialog` (`usePlatformDefaultWidth = false`), `Surface(fillMaxSize)`. Top bar (04–07.png): white, left **back arrow (←)** + page name in `theme.primary` bold, right **close (✕)**. Body = white rounded content card on `theme.bg`, scrollable, + `AndroidView(WebView)` (`app/MainActivity.kt:1235`).

## Content
Loads `file:///android_asset/<page>.html`. Top-bar title = "Preface" / "Introduction" / "Biography" / "Developer". In-page heading (centered, primary bold):
- Preface — `Preface (အမှာစာ)` — starts with basmala, ends with Arabic verse block.
- Introduction — `Introduction (နိဒါန်း)`.
- Biography — `Biography (ဘာသာပြန်သူ၏ အတ္ထုပ္ပတ္တိအကျဉ်း)`.
- Developer — `Developer's Intention` (Burmese + italic English paragraphs; ends with a boxed Feedback note).
- Files: `preface.html` (~18.7 KB), `introduction.html` (~13.2 KB), `biography.html` (~5.9 KB), `developer.html` (~7.9 KB). All UTF-8, CRLF, Burmese content.

## Behavior
- Back arrow / Close both dismiss.
- PWA: render the HTML inline (fetch from `/data/<page>.html`), styled to match; no WebView needed.

## Open questions
- Whether each HTML carries its own CSS or inherits app styles — check in port phase.
