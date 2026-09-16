# Dialog: Select Surah

Screenshots: — (no raw capture yet; store graphic existed pre-recapture)
Route: overlay

## Purpose
Pick a surah from the full list; selecting one chains into Jump to Ayat for that surah.

## Composable
`showSurahDialog` (`app/MainActivity.kt:1111`). `LazyColumn` of all loaded surahs.

## Layout (from 07.jpg)
- Title "Select Surah" (bold, `theme.primary`, ~22 sp).
- Rows: `N. <EnglishName>` (bold, primary) over `<ArabicName>` (gray), e.g. `1. Al-hamd` / `شُوْرَةُ الْحَمْدِ`, divider between rows.
- Bottom-right action "Select Ayat" (primary text button).
- Rounded white card, dimmed scrim behind.

## Behavior
- Tap a row → sets target surah, opens Jump to Ayat dialog.
- "Select Ayat" → opens Jump to Ayat for the current selection.
- Names sourced from `quran_surahs.csv` (englishName, Arabic name).

## Open questions
- Scroll position / whether current surah is highlighted.
