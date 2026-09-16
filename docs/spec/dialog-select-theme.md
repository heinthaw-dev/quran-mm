# Dialog: Select App Theme

Screenshots: 03.png
Route: overlay

## Purpose
Switch the app color theme; saves immediately and recomposes.

## Composable
`showThemeDialog` (`app/MainActivity.kt:1200`). Opened from drawer "App Theme".

## Layout (from 03.jpg)
- Title "Select App Theme" (bold, `theme.primary`).
- Four rows, each label in its own theme's primary color: **Blue** `#4B559C`, **Green** `#2E7D32`, **Pink** `#D81B60`, **Brown** `#5D4037`; dividers between.
- Bottom-right "Close" (primary text button).

## Behavior
- Tap a row → write `app_theme` pref (`"BLUE"|"GREEN"|"PINK"|"BROWN"`), recompose whole app, dismiss (or stay — confirm).
- Default BLUE. Affects primary/bg/card across app (see `_overview.md` theme table).

## Open questions
- Does selecting close the dialog automatically, or only "Close"?
- Is the current theme marked (checkmark/bold)?
