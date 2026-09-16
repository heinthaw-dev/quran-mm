# Dialog: Update Available

Screenshots: — (none)
Route: overlay (auto on launch)

## Status
**DROPPED** (owner decision). Android APK self-update flow; a PWA updates via its service worker. Do not build. Kept here for reference only.

## Purpose
Prompt the user to install a newer APK when the remote version is higher.

## Composable
`UpdateAvailableDialog` (`app/UpdateAvailableDialog.kt:11`). Driven by `UpdateChecker` (`app/UpdateChecker.kt`).

## Behavior (Android)
- On launch, fetches `http://38.247.64.94/uploads/APK/update.json` (fields `version_code`, `version_name`, `apk_url`).
- If `version_code > current`, shows dialog: "Update Now" (opens `apk_url` in browser via `ACTION_VIEW`) / "Later".
- Network errors silently ignored. Note: a duplicate `LaunchedEffect` check sets `updateApkUrl` but never uses it (dead code) — do not replicate.

## Open questions
- Q4: drop entirely for PWA, or replace with a "new version available, refresh" service-worker prompt?
