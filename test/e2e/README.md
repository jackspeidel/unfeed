# E2E smoke tests (thin seam)

These are intentionally **not implemented yet** — this file documents the intended
shape so the seam is reserved. Per the PRD, E2E covers only what the pure core
cannot prove: the Chrome-API wiring (DNR redirect, alarms, tabs).

Recommended setup: Playwright + Chromium with the unpacked extension loaded
(`--disable-extensions-except` / `--load-extension`), using a persistent context.

Smokes (keep to 2–3 happy paths):

1. **Redirect** — navigate to `https://www.linkedin.com/feed/`; assert the URL
   becomes `chrome-extension://<id>/interstitial.html?dest=...` and the LinkedIn
   doors render.
2. **Useful door** — click "Jobs"; assert navigation to `/jobs/` with no further
   interception.
3. **Continue forwards** — with the pause duration injected to ~100ms (see note),
   click "Continue to feed"; assert the page lands on the original feed URL.

Explicitly **not** wall-clock tested: the real 10-minute alarm. Pass expiry is
proven deterministically at the primary seam (`test/passLifecycle.test.js`).

Note: to make the pause testable, `PAUSE_SECONDS` should become overridable
(e.g. via a build flag or `chrome.storage` value read at interstitial load).
Until that hook exists, smoke #3 should wait out the real pause or stub it.
