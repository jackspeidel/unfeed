// Hybrid SPA guard (isolated world).
//
// declarativeNetRequest redirects real navigations to a feed route at the
// network layer — but client-side SPA route changes (LinkedIn/Substack
// pushState into the feed) make no network request, so the feed can slip in
// without ever hitting the front door. This content script closes that gap:
// on every in-page URL change it re-applies the *same* gate decision the DNR
// layer enforces (resolveGate — the one source of truth) and, unless a
// deliberate pass is active, sends the tab to the interstitial.
//
// Pass-awareness matters: "continue to feed" forwards to the feed with a pass,
// and the user then navigates around inside the app. Without honoring the pass
// we'd bounce them straight back to the front door. The service worker mirrors
// pass expiry into chrome.storage.session (readable here), so we can tell a
// deliberate visit from an ambush.

(async () => {
  const { resolveGate } = await import(chrome.runtime.getURL('src/resolveGate.js'));
  const INTERSTITIAL_URL = chrome.runtime.getURL('interstitial.html');

  // Guard against re-entrancy: once we've decided to leave for the front door,
  // don't fire again on any further events before the navigation commits.
  let leaving = false;

  async function hasActivePass(domain) {
    try {
      const { passes = {} } = await chrome.storage.session.get('passes');
      const expiresAt = passes[domain];
      return typeof expiresAt === 'number' && expiresAt > Date.now();
    } catch {
      // Storage unreachable — fail toward gating (the safe default).
      return false;
    }
  }

  async function maybeGate() {
    if (leaving) return;
    const url = location.href;
    const gate = resolveGate(url);
    if (!gate) return; // not a feed route — a useful route passes through
    if (await hasActivePass(gate.domain)) return; // a deliberate pass is in effect
    leaving = true;
    // Carry the exact destination, matching the DNR rule's `?dest=<full URL>`.
    location.replace(`${INTERSTITIAL_URL}?dest=${url}`);
  }

  // Every way an in-page URL can change: SPA pushState/replaceState (relayed by
  // the MAIN-world monitor), history back/forward, and hash changes.
  window.addEventListener('unfeed:locationchange', maybeGate);
  window.addEventListener('popstate', maybeGate);
  window.addEventListener('hashchange', maybeGate);

  // And the URL we loaded with (covers a feed page that loaded under a pass
  // whose window has since elapsed, or any case DNR didn't catch).
  maybeGate();
})();
