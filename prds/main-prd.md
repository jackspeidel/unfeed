# Unfeed — PRD

> Chrome MV3 browser extension that gates the *feed route* of "Trojan-horse" sites — useful services with a social feed bolted on — turning the moment of arrival into an intentional front door rather than an ambush.

## Problem Statement

I use sites like LinkedIn and Substack for genuinely useful things — jobs, messaging, reading newsletters. But these sites bolt a social-media feed onto an otherwise useful tool, and that feed is the *default landing spot*. I open a new tab, type `linkedin.com`, and before I've formed a conscious intention I'm dropped straight into an infinite feed and start doomscrolling. The slop ambushes me on the way to the thing I actually came for. I don't want to block these sites — I need them — I just don't want the feed to be the thing that greets me by default.

Existing tools don't fit. Generic URL blockers (uBlock, BlockSite) force me to author URL patterns by hand and tend to block *whole sites*, which kills the useful parts I rely on. Pure "social media blockers" target sites where the feed *is* the product (TikTok, X, Instagram) — but those aren't my problem; their slop is at least honest about what it is. My problem is the feed *bolted onto a tool I need*.

## Solution

Unfeed is a Chrome extension that intercepts navigation to the *feed route specifically* (e.g. `linkedin.com/feed`, `substack.com/home`) — not the whole site — before the page renders, and replaces it with a calm interstitial ("front door"). Instead of the feed, the front door asks "where did you actually mean to go?" and offers:

- **Useful doors** — curated, instant links to the valuable parts of that site (LinkedIn Jobs/Messages; Substack Reading/Inbox).
- **Continue to feed** — a deliberately higher-friction path, gated by a ~5-second enforced pause, that grants a 10-minute timed pass to the feed before re-gating.
- **Leave** — exit cleanly (go back if there's history, else close the tab).

The asymmetry is the whole message: the good doors are instant and inviting; the feed costs you five seconds of stillness. Because the interception happens at the network layer (the feed page never loads), there is no flash of feed content — the ambush is structurally prevented, not merely covered up.

## User Stories

1. As a distracted professional, I want navigating to `linkedin.com/feed` to be intercepted before the feed renders, so that I am never ambushed by an infinite feed I didn't consciously choose.
2. As a user who types `linkedin.com` into a fresh tab, I want the auto-redirect into the feed to be caught too, so that the most common doomscroll trigger is covered.
3. As a user, I want the feed page to truly not load (no network, no flash of content), so that the dopamine hit of seeing feed posts never happens.
4. As a LinkedIn user, I want curated "useful door" buttons (Jobs, Messages) on the front door, so that I can reach the part of the site I actually came for in one click.
5. As a Substack user, I want curated "useful door" buttons (Reading/Inbox), so that I can read the newsletters I subscribed to without passing through the social feed.
6. As a user heading to the useful part of a site, I want those door links to be instant with no friction, so that intentional, healthy navigation is rewarded.
7. As a user who genuinely wants the feed right now, I want a "continue to feed" option, so that Unfeed is a speed bump and not a wall that makes me uninstall it.
8. As a user clicking "continue to feed," I want a ~5-second enforced pause before the action becomes available, so that my autopilot is interrupted and I get a beat to reconsider.
9. As a user who completes the pause and continues, I want a 10-minute pass to that site's feed, so that I'm not re-gated on every internal navigation while I'm deliberately using it.
10. As a user whose 10-minute pass has elapsed, I want the feed to be gated again on the next entry, so that the friction recurs and the tool keeps working over time.
11. As a user with a pass on LinkedIn, I want that pass to *not* unblock Substack's feed, so that each site is gated independently.
12. As a user who was granted a pass, I want it to apply browser-wide for that site (not just one tab), so that the pass matches my mental model of "I'm allowing myself this site right now."
13. As a user, I want a pass to reset when I restart the browser, so that a fresh session starts gated rather than silently carrying an old exemption.
14. As a user on the front door, I want a "Leave" option, so that I can honor the decision not to enter.
15. As a user who arrived at the front door from another page, I want "Leave" to take me back to where I was, so that I return to what I was doing.
16. As a user who opened a fresh tab to type a URL and then chose to leave, I want the tab to close, so that I'm not dead-ended on a blank page.
17. As a user, I want the front door to show a calm flower over a grey background, so that the interruption feels like a breath rather than a punishment or an error page.
18. As a user, I want "continue to feed" to send me to the exact feed URL I originally tried to reach, so that the pass doesn't lose my intended destination.
19. As a user, I want the front door to render the correct site's doors (LinkedIn's vs Substack's), so that the options always match where I was headed.
20. As a user, I want non-feed routes on these sites (LinkedIn `/jobs`, `/messaging`, `/in/*`; Substack post pages on `*.substack.com/p/*` and custom domains) to load normally, so that the useful parts of the site are never disrupted.
21. As a user, I want the extension to work with zero configuration out of the box, so that I can install it and immediately benefit without a setup step.
22. As a user, I want the per-visit "continue to feed" escape hatch to exist even without a settings page, so that I'm never permanently stuck.
23. As a user who navigates around inside LinkedIn after entering through a useful door, I understand that in-app clicks back to the feed are not gated in v1, so that I have a clear expectation of what v1 protects (the doorway, not every move).
24. As a maintainer, I want the catalog of sites/routes/doors to be simple static data, so that adding or fixing a site is a small, low-risk change.

## Implementation Decisions

**Platform**
- **Chrome / Chromium, Manifest V3 only** for v1. Firefox is the cheapest future port; Safari is treated as a separate project. No cross-browser abstraction is built for v1.

**Interception mechanism — `declarativeNetRequest` (DNR) redirect**
- Blocking is done with DNR **redirect rules**, not a content script. The feed's document request is redirected to the extension's interstitial page, so the feed page never loads — delivering a true no-flash render-stop.
- Rules are **static** (shipped as `rules.json` in the manifest). Zero-config v1 means no runtime rule generation from user settings is required for the *block* rules.
- Rules are authored as **regex rules using `regexSubstitution`** so the originally-requested URL is carried into the interstitial as a query parameter (e.g. `interstitial.html?dest=<original-url>`). This gives the interstitial both the site identity (to render the right doors) and the exact destination (to forward to on continue).

**Scope — curated route-blocklist, not whole-site, not generic**
- Unfeed ships a **curated catalog** of known "Trojan-horse" sites. It is *not* a generic user-authored URL blocker.
- The model is a **route-blocklist**: per site, only a small enumerable set of *feed routes* is redirected; everything else on the domain passes through untouched. (You cannot enumerate every useful LinkedIn route, but you can enumerate the one feed.)
- **v1 catalog: LinkedIn and Substack only.** Pure-social sites (X, TikTok, Instagram, Facebook) are deliberately excluded — there the feed *is* the product. YouTube/Reddit are deferred (borderline, high URL-churn maintenance).
- Feed routes to gate:
  - **LinkedIn** — `/feed/` and the bare-domain redirect into the feed when logged in.
  - **Substack** — feed/social surfaces under `substack.com` (`/home`, `/notes`, `/inbox`). Individual posts (`*.substack.com/p/*` and custom domains) are out of the block scope and load normally.

**The "continue to feed" pass**
- A "continue" grants a **timed pass: 10 minutes default**, so the friction *recurs* (this is the behavior-change mechanism; an unlimited pass would make the front door a one-time decoration).
- Mechanism: clicking continue (after the pause) registers a **session-scoped DNR `allow` rule** with **higher priority** than the block rule, plus a **`chrome.alarms`** timer that revokes that allow rule when it fires.
  - **`chrome.alarms`, not `setTimeout`** — the MV3 service worker is killed when idle; alarms survive and wake it to revoke the pass.
  - **Session rules, not dynamic rules** — a browser restart is a natural reset point; the pass should not outlive it.
- Pass **scope: browser-wide per-domain** (the allow rule matches the domain, no `tabIds` condition). Matches the user's mental model and avoids tab-ID bookkeeping. Each gated domain has its own independent allow rule + alarm, keyed by domain, so a pass on one site never unblocks another.

**The interstitial ("front door")**
- A single shared `interstitial.html` extension page. It reads `?dest`, matches it against the bundled catalog client-side, and renders the matching site's doors.
- **Curated launcher, capped at ~3 useful doors per site.** Each catalog entry carries a `usefulDoors: [...]` array (label + URL) alongside the `feedRoute` it blocks. Doors are curated (not user-editable) in v1.
- **Action set, three kinds:**
  1. **Useful doors** — instant navigation to non-feed routes (never gated, so they sail straight through; **no pause, no pass needed**).
  2. **Continue to feed** — gated by an **enforced ~5-second pause** (button disabled, flower present, then becomes clickable). On activation it registers the allow-rule + alarm, then forwards to the original `dest`.
  3. **Leave** — **smart fallback**: `history.back()` if real back-history exists, otherwise message the service worker to `chrome.tabs.remove()` the current tab.
- Visual: calm flower SVG (author-supplied) over a grey background. Useful doors are visually prominent; "continue to feed" is visually quieter. The asymmetry — instant good doors vs. a 5s feed tax — is intentional.

**Configuration**
- **Zero-config v1.** No options page. Both catalog sites gated; 10-minute pass fixed; smart-fallback Leave. Per-site toggles + duration slider are deferred to the moment a *third* catalog site is added (the point where "I don't use Substack, stop gating it" becomes a real complaint). Adding a settings page later is the trigger to migrate block rules from static to runtime-registered.

**Known v1 limitation — SPA in-app navigation**
- DNR sees **network requests** only. Client-side SPA route changes (LinkedIn/Substack `pushState` to the feed without a document reload) are **not** intercepted in v1. Unfeed guards the **doorway** (URL-bar entry, fresh navigations, external links, the bare-domain auto-redirect) — the highest-value doomscroll triggers — but not in-app clicks once you're already inside. A DNR + content-script **hybrid** that watches the History API is the v2 path if this gap bites; it is deliberately rejected for v1 because it reintroduces a content-script-everywhere cost and the very flash-of-feed problem DNR was chosen to avoid.

**Catalog distribution**
- Bundled as **static JSON** in the extension for v1. A URL change at LinkedIn/Substack is handled by a normal extension update. Remote-hosted/auto-updating config is premature at two sites.

**Architecture for testability**
- All *logic* lives in **pure functions** with no Chrome API calls, behind a thin imperative shell that applies their output. The service worker and interstitial stay "dumb": they call pure functions and apply results. Two key pure units:
  - `resolveGate(url, catalog)` → `{ site, doors, dest } | null` — the rule for what gets gated and what the front door shows.
  - **Pass-lifecycle state machine** → `idle → granted(domain, expiresAt) → expired`, with **duration injected** (not a hard-coded 10 minutes) so it is testable and tunable.

## Testing Decisions

**What makes a good test here:** tests assert **external behavior** — "navigating to a feed route is gated," "a continue grants exactly a 10-minute pass that then lapses," "useful routes pass through," "the right doors render for the right site" — and never assert implementation details like which DNR rule ID was used or internal function call order. Time-based behavior (the 10-minute expiry, the 5-second pause) is tested via **injected durations**, never by waiting on a real wall clock.

**Primary seam — the pure decision core (browser-free unit tests):**
- `resolveGate(url, catalog)` — table-driven cases: LinkedIn `/feed/` and bare-domain → gated with LinkedIn doors + correct `dest`; LinkedIn `/jobs`, `/messaging`, `/in/<name>` → `null` (pass-through); Substack `/home`, `/notes`, `/inbox` → gated with Substack doors; `*.substack.com/p/<post>` and a custom-domain post → `null`. Edge cases: feed URLs carrying query params/fragments preserve the exact `dest`.
- **Pass-lifecycle state machine** — `idle → granted → expired` transitions with injected duration: a continue produces `granted(domain, expiresAt)`; advancing past `expiresAt` yields `expired`/re-gated; a pass on one domain leaves another domain `idle`; restart semantics (session-scoped) reset to `idle`.
- This seam carries the bulk of the coverage because it encodes the genuinely behavioral rules deterministically and fast.

**Thin seam — E2E smoke (Playwright with the unpacked extension loaded):**
- 2–3 happy-path smokes only, for what pure functions cannot prove (the Chrome-API wiring): navigating to `linkedin.com/feed` actually redirects to the interstitial; the interstitial renders the expected doors; "continue to feed" (with **pause duration injected to ~100ms** for the test) forwards to the original destination; a useful door navigates without interception.
- **Explicitly not** wall-clock-tested: the real 10-minute alarm. Expiry behavior is proven at the primary seam via injected duration.

**Prior art:** none in-repo (greenfield). The pure-core pattern is standard table-driven unit testing; the E2E pattern follows the established "load unpacked MV3 extension in Playwright/Chromium and drive real navigations" approach.

## Out of Scope

- **Any browser other than Chrome/Chromium MV3** (Firefox, Safari).
- **Pure-social sites** (X/Twitter, TikTok, Instagram, Facebook) — excluded by thesis, not by time.
- **YouTube, Reddit, and any catalog site beyond LinkedIn and Substack** in v1.
- **SPA in-app navigation gating** (History-API watching / content-script hybrid) — v2 candidate.
- **A settings/options page** — no per-site toggles, no pass-duration UI, no custom "calm home" for Leave in v1.
- **User-authored / custom blocking patterns** and user-editable doors — curated only in v1.
- **Remote / auto-updating catalog** — static bundled JSON only.
- **Per-tab pass scoping** — explicitly rejected in favor of browser-wide-per-domain.
- **The flower SVG artwork itself** — author-supplied; this PRD assumes it as an asset.
- **Chrome Web Store listing, publishing, and developer-account logistics** — delivery concern, not covered here.

## Further Notes

- **Product framing matters to every UI decision:** Unfeed is a *front door*, not a wall. The reframe from "blocker with a give-up door and a cave-in door" to "intentional entry point that asks where you meant to go" is what distinguishes it from existing blockers and should guide copy, visual hierarchy, and the instant-doors-vs-paused-feed asymmetry.
- **The 5-second pause is load-bearing**, not decoration. A merely-muted "continue" link gets blown through by muscle memory; the enforced wait (paired with the calm flower so it reads as a breath) is the mechanism with actual behavioral evidence behind it. Keep it short enough to stay a speed bump.
- **Recurrence is the point.** The 10-minute timed pass (vs. an unlimited one) is what keeps the friction alive over weeks of use. If passes ever feel too frequent/annoying in real use, tune the *duration*, don't remove recurrence.
- **Bare-domain handling is the highest-value case.** "New tab → type `linkedin.com` → ambushed" is the dominant doomscroll trigger, and DNR catches the resulting redirect cleanly. The front-door "where did you mean to go?" framing is the perfect response to exactly this.
- **Filing note:** this PRD was written to `unfeed/PRD.md` because no issue tracker is configured in this workspace. To file it as a tracked issue with the `ready-for-agent` label, run `/setup-matt-pocock-skills` to configure the tracker, then re-run `/to-prd`.
