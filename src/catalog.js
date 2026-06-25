// The curated catalog is the single source of truth for the whole extension:
// it drives both the DNR redirect rules (src/rules.js) and the interstitial's
// doors (src/interstitial.js). Adding or fixing a site is a change here only.
//
// `feedFilters` are RE2-/JS-compatible regex *strings* (matched against the full
// URL) so the same pattern feeds chrome.declarativeNetRequest's `regexFilter`
// and `new RegExp(...)` in resolveGate. They are matched case-insensitively.

export const PASS_MINUTES = 8; // how long "continue to feed" grants access
export const PAUSE_SECONDS = 10; // enforced wait before "continue to feed" is clickable

export const CATALOG = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    domain: 'linkedin.com',
    // Gate the feed and the bare-domain auto-redirect into the feed.
    feedFilters: [
      '^https://(www\\.)?linkedin\\.com/feed(/|$|\\?|#)',
      '^https://(www\\.)?linkedin\\.com/?($|\\?|#)'
    ],
    // Up to ~3 curated "useful doors" (non-feed routes, never gated).
    doors: [
      { label: 'Jobs', url: 'https://www.linkedin.com/jobs/' },
      { label: 'Messaging', url: 'https://www.linkedin.com/messaging/' },
      { label: 'Notifications', url: 'https://www.linkedin.com/notifications/' }
    ]
  },
  {
    id: 'substack',
    name: 'Substack',
    domain: 'substack.com',
    // Gate the algorithmic Home feed and the Notes social feed (and the
    // bare-domain redirect into Home). The Inbox (your actual subscriptions)
    // and individual posts (*.substack.com/p/...) are NOT gated.
    feedFilters: [
      '^https://substack\\.com/home(/|$|\\?|#)',
      '^https://substack\\.com/notes(/|$|\\?|#)',
      '^https://substack\\.com/?($|\\?|#)'
    ],
    doors: [
      { label: 'Inbox', url: 'https://substack.com/inbox' }
    ]
  }
];
