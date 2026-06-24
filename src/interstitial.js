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

  // Continue-to-feed — enforced pause before it becomes clickable.
  startPause(continueBtn, PAUSE_SECONDS);
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

function startPause(btn, seconds) {
  let remaining = seconds;
  btn.disabled = true;
  btn.textContent = `Continue to feed (${remaining})`;
  const timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = 'Continue to feed';
    } else {
      btn.textContent = `Continue to feed (${remaining})`;
    }
  }, 1000);
}
