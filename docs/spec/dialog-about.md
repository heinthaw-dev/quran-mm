# Dialog: About App

Screenshots: 08.png (Android reference) · dialog-about-chrome.png (Chrome baseline)
Route: overlay (`/?nosplash=1&dialog=about`)

## Purpose
Show version and copyright / attribution.

## Composable
`AboutDialog` (`app/AboutDialog.kt:27`), a Material3 `AlertDialog`. Opened from drawer "About App".

Important: no `MaterialTheme { }` wraps this app, so every `Text` without an explicit
style falls back to the **Compose Material3 library defaults**, not to `Type.kt` /
`Theme.kt` (both are dead code here). `theme.primary` is the custom `AppTheme` enum
in `MainActivity.kt:94-99`, default BLUE `#4B559C`.

## Exact values (`AboutDialog.kt`, confirmed by pixel measurement of 08.png)
- Card: `RoundedCornerShape(16.dp)`, `containerColor = Color.White`, platform default
  width — measured 320 dp on a 411 dp-wide screen. `DialogPadding` 24 dp on all sides.
- Title: "About App", `FontWeight.Bold`, `color = theme.primary`. No size set → M3
  `headlineSmall` = 24 sp / 32 sp. `TitlePadding` bottom = 16 dp.
- Text slot: `Column(verticalArrangement = Arrangement.spacedBy(8.dp))`. Unstyled Texts
  take the AlertDialog default = `bodyMedium` 14 sp / 20 sp on `onSurfaceVariant` `#49454F`.
  `TextPadding` bottom = 18 dp; measurement shows a further 12 dp before the button row.
- Order: Version → Divider → header → body → header → body → disclaimer.
  - "Version: V 1.0.0" — `FontWeight.Medium` (500).
  - **Exactly ONE `Divider`**, immediately after the version line: 1 dp,
    `theme.primary.copy(alpha = 0.2f)` (over white = `#DBDDEB`).
  - "App & Software Design:" and "Myanmar Translation & Tafsir:" — `FontWeight.Bold`.
  - The two copyright lines carry no style at all.
  - Disclaimer: `fontSize = 12.sp`, `lineHeight = 16.sp`, `color = Color.Gray` = `#888888`.
- Spacers: `Spacer(8.dp)` before "Myanmar Translation & Tafsir:" and `Spacer(12.dp)`
  before the disclaimer. `spacedBy(8.dp)` also applies on both sides of each Spacer,
  so the visible gaps are **24 dp** and **28 dp**, not 8 dp and 12 dp.
- Confirm button: `TextButton` labelled "Close", `color = theme.primary`, right-aligned.
  M3 TextButton = 40 dp min height, 12 dp horizontal content padding → the label sits
  36 dp from the card's right edge (measured 37 dp).

## Behavior
- Static content; Close dismisses. Backdrop click dismisses.
- The dialog takes focus on open so `showModal()` does not put a focus ring on Close.

## Answered questions
- Version is read at runtime: `getAppVersion()` → `packageManager.getPackageInfo(...).versionName`
  (`AboutDialog.kt:16-23`). No Gradle file exists in this repo, so the literal comes from
  the screenshot: "V 1.0.0". The year `2026` IS hard-coded (`AboutDialog.kt:30`).

## Known difference
Android renders this all-Latin dialog in Roboto; the PWA uses `--font-ui`
(Noto Sans Myanmar). Every band lines up within 1 dp except the title, which sits
3.4 dp higher because Noto Sans Myanmar has a taller ascent, and the disclaimer wraps
one word earlier on line 2. Self-hosting Roboto (see `.claude/rules/ui_components.md`)
would close both.
