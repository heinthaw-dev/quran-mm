# Dialog: Jump to Ayat

Screenshots: — (no raw capture yet; store graphic existed pre-recapture)
Route: overlay

## Purpose
Type an ayat number to jump directly within the current surah.

## Composable
`showAyatKeypad` (`app/MainActivity.kt:1150`). Opened from the Ayat chip or after selecting a surah.

## Layout (from 08.jpg)
- Title "Jump to Ayat" (bold, `theme.primary`).
- Subtitle "Total Ayats in Surah: N" (gray), e.g. 6.
- Outlined text field labeled "Enter Ayat Number" (numeric), primary outline when focused.
- Actions: "Cancel" (text) and "Go" (filled primary pill).

## Behavior
- Validates input is within `1..totalAyats`; out-of-range rejected.
- "Go" → `executeJump` to that ayat (pager page). "Cancel" dismisses.
- Numeric keyboard.

## Open questions
- Invalid-input feedback (Toast? disabled Go?) — confirm in port phase.
