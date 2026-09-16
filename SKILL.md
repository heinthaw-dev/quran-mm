---
name: port-screen
description: Build, port, fix, or restyle one PWA screen, dialog, or shared UI component so it matches the Android app pixel for pixel, loading only that screen's context. Use it whenever the user asks to build or change a screen or UI component, even if they don't name this skill.
argument-hint: "<screen-id> [notes]"
arguments: [screen]
---

# Port one screen: $screen

Full request: $ARGUMENTS

If no screen id was given, list the `todo` rows in `docs/PARITY.md` and ask which one to build.

## 1. Load only this context, in this order
1. `docs/spec/$screen.md` and its row in `docs/PARITY.md`.
2. The screenshot files named in the spec. Reading them also loads the visual parity rules.
3. `pwa/src/ui/index.ts`, to reuse shared components. Reading it also loads the architecture and UI rules.
4. `pwa/src/theme/tokens.css`. Use tokens only.
5. Only if the screen shows CSV data: `pwa/src/data/types.ts` and the hook in `pwa/src/hooks/` it needs.
6. Missing an exact value or behavior? Ask `android-explorer` one specific question, then add the answer to the spec file so nobody has to ask again.

Don't open other screens' folders, other spec files, Kotlin files, or CSV files.

## 2. Build
- Set the PARITY row to `in-progress`.
- Put the code in `pwa/src/features/$screen/`. Move a component to `pwa/src/ui/` only when a second screen needs it or the Android code shares it.

## 3. Verify until it passes
- Run `npm run test:visual -- $screen` and follow the pass criteria in the visual parity rules.
- If it takes more than about five rounds, suggest that the user let it run on its own with:
  `/goal npm run test:visual -- $screen prints PASS and npm test exits 0, or stop after 12 turns`

## 4. Finish
- Run `npm run typecheck`, `npm run lint`, and `npm test`.
- Set the PARITY row to `done` and commit as `feat($screen): <summary>`.
- Report in three lines: what you built, the final diff percentage, and open issues. Then suggest `/clear` before the next screen.
