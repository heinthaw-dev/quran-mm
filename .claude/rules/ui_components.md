---
paths:
  - "pwa/src/features/**"
  - "pwa/src/ui/**"
  - "pwa/src/theme/**"
  - "pwa/scripts/tokens*"
---

# UI components and Android → web mapping

## Styling
- Use tokens from `src/theme/tokens.css` only. Never hard-code a color, size, or font.
- `npm run tokens` generates the tokens from `res/values*/` (plus Compose theme constants such as `Color.kt` and `Type.kt`, if the app uses them). Don't edit `tokens.css` by hand.
- One CSS Module per component.

## Units and resources
- dp → px (1:1). sp → rem (sp ÷ 16).
- `values-night` → `prefers-color-scheme: dark`, only if that folder exists.
- `res/font` → self-hosted WOFF2 with `@font-face`. Don't subset: it can break Burmese and Arabic shaping. If some text uses Android's default font, self-host Roboto.
- Vector drawables → SVG with the `vector-drawable-svg` package; check each result visually. Density PNG/WebP → `srcset` (mdpi 1x, hdpi 1.5x, xhdpi 2x, xxhdpi 3x, xxxhdpi 4x).
- Shape, selector, and ripple XML → CSS. From `res/xml`, port only what affects UI or behavior; ignore Android-only config.

## Compose → React
- Column/Row → flex. Box → grid with all children in one cell (`grid-area: 1 / 1`). `spacedBy` → `gap`. `weight` → `flex`.
- LazyColumn → plain list; virtualize only if profiling shows jank. Dialogs → `<dialog>`. Elevation → `box-shadow`.
- SharedPreferences → `localStorage` through one small typed module. System back → browser history. Share → Web Share API with a copy fallback.
- No web equivalent (ads, in-app review, etc.)? Add a `docs/PARITY.md` row and ask.

## Text
- Direction: unless the Kotlin sets it, Android picks each paragraph's direction from its first strong character, and many notes start with Arabic. Use `dir="auto"` to match, then confirm against the screenshot.
- Burmese line breaks can differ slightly between Android and Chrome. Check wrap points before changing spacing.
- The Arabic font must cover ﷺ (U+FDFA). Otherwise each platform falls back to a different font.

## Behavior
- Match Android's loading, empty, and error states. Android reads assets instantly, so avoid visible loading flashes.
- Accessibility must not change the look: semantic HTML, labels, and `:focus-visible` only.
- A screen is done only when `npm run test:visual -- <screen-id>` passes.
