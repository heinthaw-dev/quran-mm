# Dialog: About App

Screenshots: 08.png
Route: overlay

## Purpose
Show version and copyright / attribution.

## Composable
`AboutDialog` (`app/AboutDialog.kt:27`). Opened from drawer "About App".

## Layout (from 05.jpg)
- Title "About App" (bold, `theme.primary`).
- "Version: V 1.0.0".
- Divider.
- "App & Software Design:" → "Copyright © 2026 noon Software Development Team. All rights reserved."
- "Myanmar Translation & Tafsir:" → "Copyright © 2026 U Kyaw Win. All rights reserved."
- Small print: "No part of this software may be reproduced, distributed, or transmitted in any form without the prior written permission of the respective copyright holders." (12 sp, lineHeight 16).
- Bottom-right "Close" (primary text button).

## Behavior
- Static content; Close dismisses.
- Version string from app version (V 1.0.0).

## Open questions
- Whether version is hard-coded or read from build config.
