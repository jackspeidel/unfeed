import { CATALOG } from './catalog.js';

// Pure builders that turn the catalog into chrome.declarativeNetRequest rule
// objects. Kept side-effect-free so they can be unit-tested without Chrome.
//
// Block rules redirect a gated feed request to the interstitial, carrying the
// original URL as `?dest=<full match>` via regexSubstitution (\0 = whole match).
// Allow rules (added per-domain when a pass is granted) outrank the block rules
// so the feed loads normally for the duration of the pass.

const BLOCK_PRIORITY = 1;
const ALLOW_PRIORITY = 100;
const ALLOW_RULE_BASE = 1000; // allow-rule ids live above block-rule ids

// Stable, collision-free allow-rule id per domain (index-based on the catalog).
export function allowRuleId(domain, catalog = CATALOG) {
  const idx = catalog.findIndex((s) => s.domain === domain);
  if (idx < 0) throw new Error(`unknown domain: ${domain}`);
  return ALLOW_RULE_BASE + idx;
}

export function buildBlockRules(interstitialUrl, catalog = CATALOG) {
  const rules = [];
  let id = 1;
  for (const site of catalog) {
    for (const filter of site.feedFilters) {
      rules.push({
        id: id++,
        priority: BLOCK_PRIORITY,
        action: {
          type: 'redirect',
          redirect: { regexSubstitution: `${interstitialUrl}?dest=\\0` }
        },
        condition: {
          regexFilter: filter,
          resourceTypes: ['main_frame']
        }
      });
    }
  }
  return rules;
}

export function buildAllowRule(domain, catalog = CATALOG) {
  const escaped = domain.replace(/\./g, '\\.');
  return {
    id: allowRuleId(domain, catalog),
    priority: ALLOW_PRIORITY,
    action: { type: 'allow' },
    condition: {
      // Allow any main-frame request to this domain (only feed routes were ever
      // blocked, so a domain-wide allow during the pass is safe).
      regexFilter: `^https://([a-z0-9-]+\\.)?${escaped}/`,
      resourceTypes: ['main_frame']
    }
  };
}
