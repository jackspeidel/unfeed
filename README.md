# Unfeed

A calm **front door** for Trojan-horse sites — services with a genuinely useful
core (jobs, reading, search) and a social feed bolted onto the entrance. Unfeed
gates the **feed route only** (not the whole site), so the slop never ambushes
you on the way to the thing you actually came for.

When you head into a gated feed (e.g. `linkedin.com/feed`, or just
`linkedin.com`, which redirects there), the page **never loads**. Instead you get
a quiet grey screen with a flower that asks *"where did you mean to go?"* and
offers:

- **Useful doors** — instant, curated links to the valuable parts of the site.
- **Continue to feed** — taxed by a ~5-second pause, then a 10-minute pass.
- **Leave** — go back, or close the tab if there's nowhere to go back to.

See [`PRD.md`](./PRD.md) for the full rationale and decisions.

## Status

v1 scaffold. Catalog: **LinkedIn + Substack**. Chrome MV3 only.

## How it works

- **Blocking** is done with `declarativeNetRequest` redirect rules — the feed's
  network request is redirected to the interstitial, so it truly never renders
  (no flash of feed). Rules are generated from the catalog at startup.
- **Continue** registers a higher-priority DNR **session allow-rule** for the
  domain plus a **`chrome.alarms`** timer that revokes it after 10 minutes. The
  pass is browser-wide per-domain and resets on browser restart.
- **The pure core** (`resolveGate`, `passLifecycle`, `rules`) holds all logic and
  is Chrome-free; the service worker and interstitial are thin shells over it.

## Project layout

```
manifest.json            MV3 manifest
interstitial.html        the front door (extension page)
src/
  catalog.js             single source of truth: sites, feed filters, doors
  resolveGate.js         pure: URL -> gate decision (or null)
  passLifecycle.js       pure: pass state machine (injected time/duration)
  rules.js               pure: catalog -> DNR rule objects
  service-worker.js      shell: installs rules, grants/revokes passes
  interstitial.js        shell: renders doors, runs the pause, forwards
styles/interstitial.css
assets/flower.svg        PLACEHOLDER — replace with your artwork
test/                    node:test unit tests for the pure core
test/e2e/                intended Playwright smokes (documented, not built)
```

## Develop

```sh
npm test          # runs the pure-core unit tests (node --test)
```

Load the unpacked extension: Chrome → `chrome://extensions` → enable Developer
mode → **Load unpacked** → select this folder. Then visit
`https://www.linkedin.com/feed/`.

## Known v1 limitations / refinements made during scaffolding

- **SPA in-app navigation is not gated.** DNR only sees network requests, so a
  client-side hop back to the feed *after* you're already inside the site won't
  be caught. v1 guards the doorway (URL-bar entry, fresh navigations, external
  links, bare-domain redirect). A DNR + content-script hybrid is the v2 path.
- **Rules are registered dynamically from the catalog at startup**, not shipped
  as a static `rules.json`. Reason: embedding the original URL as `?dest=` via
  `regexSubstitution` requires the runtime extension ID (`chrome.runtime.getURL`),
  which a static rule can't reference. The *catalog* remains the static source of
  truth; this stays zero-config.
- **Substack Inbox is a door, not a gated surface.** The Inbox (`/inbox`) is your
  real subscriptions and is treated as the useful destination; only Home and
  Notes (the algorithmic/social feeds) are gated. This refines the PRD, which had
  listed Inbox among the feed surfaces.
- **The pause is not yet injectable** for E2E; `PAUSE_SECONDS` is a constant.
  Make it overridable before wiring smoke #3.
- **`assets/flower.svg` is a placeholder.** Drop in your own artwork (same path).
```
