# Dialog: Jump History

Screenshots: — (none)
Route: overlay

## Purpose
Show saved reading positions so the user can jump back after following cross-reference links.

## Composable
`showHistoryDialog` (`app/MainActivity.kt:1264`). Opened by the History icon when `jumpHistory.size > 2` (if `<= 2`, the icon jumps back directly and clears history instead).

## Layout (inferred)
- Title (e.g. "History").
- List of saved positions (surah + ayat labels); tap a row to navigate there.
- "Clear History" button.

## Behavior
- `jumpHistory` is a stack of `JumpStep` (surah/ayat) recorded on `[surah:ayat]` link jumps.
- Selecting a row → `executeJump`. Clear empties the stack (History icon reverts to gray/disabled).

## Open questions
- Exact row label format and title string — no screenshot; capture in port phase.
