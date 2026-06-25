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

// --- Init: rebuild block rules and expose pass state to content scripts. ---
async function init() {
  // The SPA guard (a content script in an untrusted context) reads pass state
  // from session storage to honor an active pass; grant it read access.
  try {
    await chrome.storage.session.setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    });
  } catch {
    // Older Chrome without setAccessLevel — the content script then fails
    // toward gating, which is the safe default.
  }
  await installBlockRules();
}

// Block rules: rebuilt from the catalog on install and on each startup.
async function installBlockRules() {
  const desired = buildBlockRules(INTERSTITIAL_URL);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: desired
  });
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

// Mirror of active passes into session storage, so the content-script SPA guard
// can read pass expiry without waking the worker. Read-modify-write keeps each
// domain's entry independent (a worker restart can drop the in-memory `state`
// while DNR rules + alarms persist, so we never clobber the whole map).
async function setStoredPass(domain, expiresAt) {
  const { passes = {} } = await chrome.storage.session.get('passes');
  passes[domain] = expiresAt;
  await chrome.storage.session.set({ passes });
}

async function clearStoredPass(domain) {
  const { passes = {} } = await chrome.storage.session.get('passes');
  delete passes[domain];
  await chrome.storage.session.set({ passes });
}

// --- Pass grant / revoke. ---
async function grantPass(domain) {
  const now = Date.now();
  const durationMs = PASS_MINUTES * 60 * 1000;
  state = grant(state, domain, now, durationMs);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [allowRuleId(domain)],
    addRules: [buildAllowRule(domain)]
  });
  await chrome.alarms.create(ALARM_PREFIX + domain, { delayInMinutes: PASS_MINUTES });
  await setStoredPass(domain, now + durationMs);
}

async function revokePass(domain) {
  state = expire(state, domain);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [allowRuleId(domain)]
  });
  await clearStoredPass(domain);
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
