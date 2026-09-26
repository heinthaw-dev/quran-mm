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
- Validates input is within `firstAyatId(surah)..totalAyats`; out-of-range rejected.
  Android hardcodes the lower bound to 1 for every surah (MainActivity.kt:1177) and shows a
  Toast "Out of Total Ayats" plus clears the field; the PWA shows a red outline instead.
  KNOWN DEVIATION (owner-requested, 2026-09-27): surah 1 accepts 0, because its basmala is a
  real page (001.csv Ayat_id 0) that Android's keypad cannot reach.
- "Go" → `executeJump` to that ayat (pager page). "Cancel" dismisses.
- Numeric keyboard. On phones the keyboard must not cover the dialog: the PWA tracks
  `window.visualViewport` and recentres the dialog in the space above the keypad
  (Android dialogs are resized by the window manager for free).

## Open questions
- Invalid-input feedback (Toast? disabled Go?) — confirm in port phase.
