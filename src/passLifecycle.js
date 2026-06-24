// Pure state machine for the "continue to feed" pass. Duration and the current
// time are always injected, never read from a clock here, so every transition
// is deterministic and testable. The service worker keeps an instance of this
// state in memory as the authoritative record of active passes and reflects it
// into DNR session rules + alarms.
//
// State shape: { passes: { [domain]: expiresAtMs } }
//
// Session semantics: this lives only in the service worker's memory, so a
// browser restart (which tears down the worker) naturally resets all passes.

export function initialState() {
  return { passes: {} };
}

export function grant(state, domain, now, durationMs) {
  return { passes: { ...state.passes, [domain]: now + durationMs } };
}

export function expire(state, domain) {
  const passes = { ...state.passes };
  delete passes[domain];
  return { passes };
}

export function reset() {
  return { passes: {} };
}

// Gated unless an unexpired pass exists for this exact domain.
export function isGated(state, domain, now) {
  const expiresAt = state.passes[domain];
  return !(typeof expiresAt === 'number' && expiresAt > now);
}

export function activePasses(state, now) {
  return Object.entries(state.passes)
    .filter(([, expiresAt]) => expiresAt > now)
    .map(([domain]) => domain);
}
