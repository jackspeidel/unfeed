// Imperative shell. Holds no logic of its own: it installs block rules from the
// catalog, and on a "continue" it reflects the pass state machine into a DNR
// session allow-rule + a chrome.alarms timer that revokes it. All decisions
// live in the pure modules it imports.

import { PASS_MINUTES } from './catalog.js';
import { buildBlockRules, buildAllowRule, allowRuleId } from './rules.js';
import { initialState, grant, expire } from './passLifecycle.js';

const ALARM_PREFIX = 'unfeed-pass:';
const INTERSTITIAL_URL = chrome.runtime.getURL('interstitial.html');

// Authoritative record of active passes. In-memory, so a browser restart
// (which tears down this worker) resets every pass — matching session semantics.
let state = initialState();

// --- Block rules: rebuilt from the catalog on install and on each startup. ---
async function installBlockRules() {
  const desired = buildBlockRules(INTERSTITIAL_URL);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: desired
  });
}

chrome.runtime.onInstalled.addListener(installBlockRules);
chrome.runtime.onStartup.addListener(installBlockRules);

// --- Pass grant / revoke. ---
async function grantPass(domain) {
  const durationMs = PASS_MINUTES * 60 * 1000;
  state = grant(state, domain, Date.now(), durationMs);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [allowRuleId(domain)],
    addRules: [buildAllowRule(domain)]
  });
  await chrome.alarms.create(ALARM_PREFIX + domain, { delayInMinutes: PASS_MINUTES });
}

async function revokePass(domain) {
  state = expire(state, domain);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [allowRuleId(domain)]
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(ALARM_PREFIX)) {
    revokePass(alarm.name.slice(ALARM_PREFIX.length));
  }
});

// --- Messages from the interstitial page. ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'CONTINUE_TO_FEED') {
      await grantPass(msg.domain);
      sendResponse({ ok: true });
    } else if (msg?.type === 'LEAVE_CLOSE_TAB') {
      if (sender.tab?.id != null) await chrome.tabs.remove(sender.tab.id);
      sendResponse({ ok: true });
    }
  })();
  return true; // keep the message channel open for the async response
});
