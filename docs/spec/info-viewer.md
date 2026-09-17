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
- Developer — top-bar title is just **"Developer"**. Three sections, each a title + a background-filled body box: (1) `Developer's Intention` (h2 primary, centered) with a `.content-box` + a `.contact-info` Feedback box (email link); (2) `Disclaimer of Liability` (h3 red `#c62828`, centered) + `.disclaimer-box` (#F0F4F8); (3) `ရှင်းလင်းချက် (Disclaimer)` (h3 red, centered) + `.disclaimer-box`.
- Files: `preface.html` (~18.7 KB), `introduction.html` (~13.2 KB), `biography.html` (~5.9 KB), `developer.html` (~7.9 KB). All UTF-8, CRLF, Burmese content.

## Behavior
- Back arrow / Close both dismiss.
- PWA: render the HTML inline (fetch from `/data/<page>.html`), styled to match; no WebView needed.

## Resolved
- Each bundled HTML carries its own `<head><style>`. The PWA renders `body.innerHTML` (via DOMParser), which drops that `<style>`, so the section styling is mirrored in `InfoViewerScreen.module.css` with tokens where they map. developer.html uses classes `.content-box`, `.disclaimer-box`, `.contact-info`, `.email-link`, `.dev-name` and red `h3` headings — unique to that page, so the module rules don't affect the other three.
