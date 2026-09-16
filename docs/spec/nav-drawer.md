# Navigation drawer

Screenshots: 02.png (clean, drawer open, Blue theme)
Route: overlay (left `ModalNavigationDrawer`, 320 dp)

## Purpose
App menu: audio management, settings, translator info pages, about, exit.

## Composable
`ModalNavigationDrawer` content (`app/MainActivity.kt:1309`). Rows use `MenuRow` (`app/MenuRow.kt`: title 14 sp, subtitle 12 sp, leading icon). Section labels 13 sp. Header = white bg with logo + app title; body bg = `theme.bg`. `gesturesEnabled` only when open.

## Structure (top → bottom)
- Header: `kw_logo` + `မြန်မာ ကုရ်အာန် ဘာသာပြန်` / `ဆရာ ဦးကျော်ဝင်း`.
- **Audio Files**: Downloads (download icon) → scan then Select-Surahs-to-Download; Delete Downloads (trash) → scan then Select-Audio-to-Delete.
- **App Settings**: App Theme (edit/brush) → Select App Theme; Continuous Swiping (switch, `continuous_swipe`); Save Reading Position (switch, `remember_last_read`).
- **Translator's Info**: Preface, Introduction, Biography → Info viewer (WebView).
- Developer (person icon) → Info viewer `developer.html`.
- About App (info icon) → About dialog.
- Exit App (X icon) → `finishAndRemoveTask()` + `exitProcess(0)` — no web equivalent.

## Icons (from 02.png)
Downloads = download-circle, Delete Downloads = trash, App Theme = pencil/edit, Continuous Swiping = arrow→, Save Reading Position = check-circle (filled), Preface/Introduction = list, Biography/Developer = person, About App = info-circle, Exit App = X. Confirm exact Material icons in port phase.

## Notes
- Two switches (Continuous Swiping, Save Reading Position) shown **ON** in 02.png; the ON track is **green** (Material default), NOT theme primary.
- Section labels gray; row titles dark; App Theme shows current value "BLUE" as subtitle.
