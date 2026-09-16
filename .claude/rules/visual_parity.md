---
paths:
  - "App Screenshots/**"
  - "pwa/tests/visual/**"
  - "pwa/scripts/visual*"
---

# Visual parity (definition of done for every screen)

## How `npm run test:visual -- <screen-id>` works
1. Reference: the screenshot named in `docs/spec/<screen-id>.md`. If a screenshot is a store graphic (device frame, captions) or a state is missing, ask the user for a raw capture: `adb exec-out screencap -p > name.png`.
2. Device match: `adb shell wm size` and `adb shell wm density` (scale = dpi ÷ 160). Playwright viewport = physical px ÷ scale, rounded; `deviceScaleFactor` = scale. If sizes still differ by 1–2 px, crop both images to the shared area. Never stretch.
3. Crop the Android status bar and navigation bar, and compare app content only. Record the device size, density, and bar heights in `docs/spec/_overview.md`.
4. Render in Chromium after `document.fonts.ready`, with animations and the text caret off and fixed data.
5. Diff with pixelmatch (`threshold: 0.1`, anti-aliased pixels ignored) and save the diff PNG.
6. Print exactly one line: `VISUAL <screen-id>: <n>% (limit 1%) PASS|FAIL`.

## Pass criteria
- At most 1% of pixels differ, AND the diff image shows no layout, color, icon, or text difference. Font anti-aliasing noise is fine.
- Open the diff image only when the result is FAIL or after a big change, then fix the largest difference first.
- If the same fix fails twice with no change in the percentage, stop and report what you tried.
