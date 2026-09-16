---
paths:
  - "pwa/**/*.test.{ts,tsx}"
  - "pwa/tests/**"
  - "pwa/vitest.config.*"
  - "pwa/playwright.config.*"
---

# Testing

- Unit and component tests: Vitest + React Testing Library (jsdom), next to the code as `*.test.ts` or `*.test.tsx`.
- Test what users see, not implementation details. Query by role or text.
- Data tests use small fixtures copied from the real CSVs. Include CRLF endings, a quoted comma, `217a`, and the missing `171`.
- E2E tests live in `pwa/tests/e2e/`; visual checks live in `pwa/tests/visual/`.
- Keep tests fast and deterministic: no real network, fake timers, fixed data.
- A bug fix starts with a failing test that reproduces the bug.
