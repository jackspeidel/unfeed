import { resolveGate } from './resolveGate.js';
import { PAUSE_SECONDS } from './catalog.js';

// Extract the original destination. The block rule appends `?dest=<full URL>`
// without URL-encoding, so the value can itself contain `?`, `&`, or `#`.
// Taking everything after the marker (rather than URLSearchParams) preserves
// the original URL intact, query string and all.
function getDest() {
  const marker = '?dest=';
  const i = location.href.indexOf(marker);
  return i >= 0 ? location.href.slice(i + marker.length) : '';
}

const promptEl = document.getElementById('prompt');
const doorsEl = document.getElementById('doors');
const continueBtn = document.getElementById('continue');
const leaveBtn = document.getElementById('leave');

const dest = getDest();
const gate = dest ? resolveGate(dest) : null;

if (!gate) {
  // Unknown destination (shouldn't normally happen): fail open rather than trap.
  promptEl.textContent = 'Taking you there…';
  if (dest) location.replace(dest);
} else {
  promptEl.textContent = `Heading into ${gate.name}. Where did you mean to go?`;

  // Useful doors — instant navigation, no friction.
  for (const door of gate.doors) {
    const a = document.createElement('a');
    a.className = 'door';
    a.textContent = door.label;
    a.href = door.url;
    doorsEl.appendChild(a);
  }

  // Continue-to-feed — enforced pause before it becomes clickable. The
  // duration is read at load (overridable for tests; see resolvePauseSeconds),
  // defaulting to the catalog's PAUSE_SECONDS in normal use.
  resolvePauseSeconds().then((seconds) => startPause(continueBtn, seconds));
  continueBtn.addEventListener('click', () => {
    // Ask the worker to open the 10-minute pass, then proceed to the real feed.
    chrome.runtime.sendMessage(
      { type: 'CONTINUE_TO_FEED', domain: gate.domain },
      () => location.replace(gate.dest)
    );
  });
}

// Leave — go back if there's real history, otherwise close the tab.
leaveBtn.addEventListener('click', () => {
  if (history.length > 1) {
    history.back();
  } else {
    chrome.runtime.sendMessage({ type: 'LEAVE_CLOSE_TAB' });
  }
});

// The enforced pause duration, in seconds. Defaults to the catalog's
// PAUSE_SECONDS, but an optional `chrome.storage.session` override lets E2E
// smokes shrink it to ~100ms instead of waiting on a real wall clock. With no
// override set, production behavior (the real ~5s pause) is unchanged.
async function resolvePauseSeconds() {
  try {
    const { pauseSecondsOverride } = await chrome.storage.session.get('pauseSecondsOverride');
    if (typeof pauseSecondsOverride === 'number' && pauseSecondsOverride >= 0) {
      return pauseSecondsOverride;
    }
  } catch {
    // No storage access (or none set) — fall back to the catalog default.
  }
  return PAUSE_SECONDS;
}

// Disable the button for `seconds`, counting down once per second for the UX,
// then enable it precisely when the duration elapses. Works for sub-second
// durations (the countdown simply never ticks before the button enables).
function startPause(btn, seconds) {
  const totalMs = Math.max(0, seconds * 1000);
  btn.disabled = true;
  setLabel(btn, Math.ceil(seconds));

  if (totalMs === 0) {
    btn.disabled = false;
    setLabel(btn, 0);
    return;
  }

  const start = Date.now();
  const tick = setInterval(() => {
    const remaining = Math.ceil((totalMs - (Date.now() - start)) / 1000);
    if (remaining > 0) setLabel(btn, remaining);
  }, 1000);
  setTimeout(() => {
    clearInterval(tick);
    btn.disabled = false;
    setLabel(btn, 0);
  }, totalMs);
}

function setLabel(btn, remaining) {
  btn.textContent = remaining > 0 ? `Continue to feed (${remaining})` : 'Continue to feed';
}
