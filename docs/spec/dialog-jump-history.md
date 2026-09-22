# Dialog: Jump History

Screenshots: owner-supplied Android capture (2026-09-22, not saved in `App Screenshots/`)
Route: overlay

## Purpose
Show the reading positions collected during a jump session so the user can go back to any of them after following cross-reference links.

## Composable
`showHistoryDialog` (`app/MainActivity.kt:1264-1305`). Opened by the History icon when `jumpHistory.size > 2`; at 1 or 2 entries the icon jumps back to entry 0 directly and clears the history.

## State (`app/MainActivity.kt:246-247`)
- `jumpHistory: List<JumpStep>` — `JumpStep(surahId, ayatId, scrollIndex, scrollOffset)` (`app/QuranModels.kt:15`).
- `isHistoryActive: Boolean` — the "inside a jump" flag. A flag, not a size check, is what decides whether paging records steps.
- In-memory only: no `rememberSaveable`, no SharedPreferences. Lost on restart.

## When steps are recorded
- **Activation** (`activateHistoryIfNeeded`, `app/MainActivity.kt:397-403`): only from `handleJumpClick` (`:587-594`), i.e. tapping a `[surah:ayat]` link in the Myanmar translation, its `@` translation note, or the Tafsir notes. Runs only `if (!isHistoryActive)`: sets the flag and seeds the history with the pre-jump position.
  - The Jump-to-Ayat keypad "Go" (`:1181`) and surah selection never activate a session. While a session is already active they still get recorded by the settle effect below.
- **Paging** (`app/MainActivity.kt:405-428`): a `LaunchedEffect` keyed on surah/settled page/loading, with `delay(500)`, that runs only while `isHistoryActive`. For the settled page's ayat:
  - equal to entry 0 (surah and ayat) → `jumpHistory = emptyList()`, `isHistoryActive = false`: returning to the original spot ends the session;
  - equal to the last entry → nothing;
  - otherwise appended, and any earlier occurrence of that same surah/ayat (entry 0 excepted) is dropped — a revisited position moves to the end.
- The recorded ayat is `multiAyats.split("-").first()` (`:400`, `:410`), i.e. the first id of a combined row. A blank `multi_ayats` cell was already replaced with the row's own `Ayat_id` at parse time (`:683-690`), so this is the real ayat id.

## History icon (top bar)
`app/BlueprintTopBar.kt:57-58`: `Icons.Default.Refresh`, 32 dp with 4 dp inner padding, last icon in the row. `hasHistory = jumpHistoryCount > 0`; tint `theme.primary` when set, `Color.LightGray` when not, and `clickable(enabled = hasHistory)`.

`onHistoryClick` (`app/MainActivity.kt:1506-1516`): `isAutoTracking = false`; then `size <= 2` → jump to entry 0, `jumpHistory = emptyList()`, `isHistoryActive = false`; `size > 2` → open this dialog (history untouched).

## Layout
- `Surface(shape = RoundedCornerShape(16.dp), color = theme.bg, shadowElevation = 8.dp)`, `Column(padding top 24, bottom 12, start/end 24)`.
- Title `"Jump History"`, bold, `theme.primary`, 20 sp. Then a 16 dp spacer.
- `LazyColumn(heightIn(max = 400.dp))` — scrolls past ~5 rows.
- One `ListItem` per entry, `containerColor = Color.Transparent` (so the row shows the dialog's `theme.bg`), M3 two-line height 72 dp, 16 dp side padding:
  - headline = step label, bold, `theme.primary` (M3 bodyLarge, 16 sp);
  - supporting = `"\u202A[Surah ${surahId} : Ayat ${ayatId}]\u202C ${englishName}"`, `Color.DarkGray` (#444444, M3 bodyMedium, 14 sp). The U+202A/U+202C pair keeps the bracket text left-to-right.
- `HorizontalDivider(Color.LightGray.copy(alpha = 0.5f))` after every row, full Column width (not indented by the ListItem padding).
- 16 dp spacer, then a right-aligned row of `TextButton`s: `"Clear History"`, `"Close"`, both `theme.primary`.

## Step labels (`app/MainActivity.kt:1273-1277`)
- index 0 → `"Original Reading Spot"`
- last index → `"Current Spot"`
- otherwise → `"Jump Step $index"`

Order is list order: oldest (original) first, newest last.

## Behavior
- Row tap (`:1282-1292`): `isAutoTracking = false`; index 0 → clear the history and end the session; otherwise `jumpHistory.take(index + 1)` (later steps discarded); close the dialog; `executeJump` to that position.
- `"Clear History"` (`:1299`): empties the history, ends the session, closes — no navigation.
- `"Close"` (`:1300`): closes only.
- `executeJump` (`:430-450`) never touches the history itself; callers do. Only the two history-return call sites pass a stored `scrollIndex`/`scrollOffset`; ordinary jumps pass `-1, 0`.

## PWA deviations
- `JumpStep` holds `{ surahId, ayatId }` only. Android also restores the card list's scroll index/offset when returning through history; the PWA lands at the top of the target page.
- The 500 ms settle debounce is a `setTimeout` in `useSurah`, keyed on surah + page index + loading, matching `delay(500)`.
