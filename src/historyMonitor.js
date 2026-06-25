// Runs in the page's MAIN world (see manifest `content_scripts`). An
// isolated-world content script gets its own wrappers and cannot observe the
// site's own History API calls, so this thin shim — which shares the page's
// real `history` object — wraps pushState/replaceState and announces each
// client-side route change as a DOM event the isolated-world guard listens for.
//
// It holds no gate logic and touches no chrome.* API; its sole job is to make
// SPA navigations observable. SPA route changes fire no network request, so
// declarativeNetRequest never sees them — this is what bridges that gap.

(() => {
  const announce = () => window.dispatchEvent(new CustomEvent('unfeed:locationchange'));

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      announce();
      return result;
    };
  }
})();
