# E2E smoke tests (thin seam)

These smokes exercise the real **Chrome-API wiring** that the pure core cannot
prove: the `declarativeNetRequest` redirect, the session allow-rule a pass
installs, and the message round-trip to the service worker. The behavioral rules
(gate decisions, pass expiry, which doors render) are proven deterministically
and fast at the pure-core seam (`test/resolveGate.test.js`,
`test/passLifecycle.test.js`) — this seam stays to a few happy paths.

## How it works

[`fixtures.js`](./fixtures.js) loads the **unpacked extension** into a Chromium
persistent context (`--disable-extensions-except` / `--load-extension`) and
exposes three fixtures:

- `context` — the extension-loaded browser context
- `serviceWorker` — the MV3 background worker, with its block rules guaranteed
  installed (it waits out the install-on-startup race)
- `extensionId` — the runtime extension id, resolved from the worker URL

MV3 extensions need a non-legacy browser, so the harness runs Chromium's modern
`--headless=new` mode by default.

## Running

```sh
npm run test:e2e            # headless
HEADED=1 npm run test:e2e   # watch it run in a real window
```

First-time setup downloads the browser: `npx playwright install chromium`.

## The smokes

1. **Redirect** ([`redirect.spec.js`](./redirect.spec.js)) — navigating to
   `https://www.linkedin.com/feed/` ends on `interstitial.html?dest=<feed-url>`
   with the LinkedIn doors rendered. The assertion targets the interstitial
   document, never the live feed (no flash-of-feed).
2. **Useful door** ([`useful-door.spec.js`](./useful-door.spec.js)) — from the
   front door, clicking **Jobs** lands on `/jobs/` un-gated (no re-interception,
   no `?dest=`).
3. **Continue forwards** ([`continue-to-feed.spec.js`](./continue-to-feed.spec.js))
   — with the enforced pause shrunk to ~100ms via an injectable override
   (`chrome.storage.session` key `pauseSecondsOverride`, read by the interstitial
   at load and defaulting to the catalog's `PAUSE_SECONDS`), "Continue to feed"
   becomes clickable and forwards to the **exact** original feed URL; the pass's
   allow rule outranks the block rule so the feed loads instead of re-gating. A
   companion check confirms that with **no** override the real pause is still in
   effect (no production regression).

Smokes 2 and 3 stub the real LinkedIn network (the routes a pass/door lets
through) so they stay hermetic — they assert the navigation landed un-gated, not
what LinkedIn serves.

## Explicitly not tested here

The real 10-minute alarm is **not** wall-clock tested. Pass expiry is proven
deterministically at the pass-lifecycle seam via injected durations.
