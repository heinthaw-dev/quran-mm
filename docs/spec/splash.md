# Splash

Screenshots: 11.png (raw capture)
Route: `/` (overlay shown on cold load)

## Purpose
Branding screen shown for 2000 ms on launch, then reveals the reader.

## Composable
`QuranMMSplashWrapper` (`app/MainActivity.kt:153`).

## Layout
- Full screen, near-white background (11.png; BLUE `#F0F4F8` reads as near-white).
- Centered image `R.drawable.kw_logo` at `fillMaxWidth(0.9f)` — moon + open book + "U Kyaw Win / ကုရ်အာန်ဘာသာပြန်" on a cream rounded card. Logo sits vertically centered.
- No text, no controls, no progress indicator.

## Behavior
- After 2000 ms delay, swaps to `QuranMMApp`. No user interaction.
- PWA: render as an overlay/splash gated on a 2000 ms timer AND `document.fonts.ready` + initial data load; also serves as manifest splash equivalent.

## Device measurements (from `adb` 1080×2340 @ 420dpi = 2.625 scale)
- App is edge-to-edge; status and nav bars are transparent overlays.
- Status bar: transparent overlay, only first row (y=0) has non-bg pixel; crop = 1 * scale ≈ 3px.
- Nav bar: gesture indicator only, background otherwise; crop = 0.
- Logo center: y=1170 = 50.0% of 2340. Logo span (visible): ~791×791px (card content, not full PNG).
- Visual test: `11-chrome.png` (Chrome-rendered baseline). `11.png` is the Android device reference; PNG has embedded ICC profile that causes ~8% color diff in headless Chrome (display calibration artefact, not a layout issue).
