import { CATALOG } from './catalog.js';

// Pure: given a URL, decide whether it is a gated feed route and, if so, what
// the front door should show. Returns null for any pass-through URL.
//
// This is the canonical encoding of "what gets gated" — the same rule the DNR
// layer enforces at the network level — expressed as a testable pure function.
export function resolveGate(url, catalog = CATALOG) {
  for (const site of catalog) {
    for (const filter of site.feedFilters) {
      if (new RegExp(filter, 'i').test(url)) {
        return {
          siteId: site.id,
          name: site.name,
          domain: site.domain,
          doors: site.doors,
          dest: url // the exact URL the user was trying to reach
        };
      }
    }
  }
  return null;
}
