import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  grant,
  expire,
  reset,
  isGated,
  activePasses
} from '../src/passLifecycle.js';

const TEN_MIN = 10 * 60 * 1000;

test('a domain is gated by default', () => {
  assert.equal(isGated(initialState(), 'linkedin.com', 1000), true);
});

test('granting opens a pass for exactly the injected duration', () => {
  const s = grant(initialState(), 'linkedin.com', 1000, TEN_MIN);
  assert.equal(isGated(s, 'linkedin.com', 1000), false); // immediately
  assert.equal(isGated(s, 'linkedin.com', 1000 + TEN_MIN - 1), false); // within window
  assert.equal(isGated(s, 'linkedin.com', 1000 + TEN_MIN + 1), true); // after expiry
});

test('a pass is scoped per-domain', () => {
  const s = grant(initialState(), 'linkedin.com', 0, TEN_MIN);
  assert.equal(isGated(s, 'linkedin.com', 0), false);
  assert.equal(isGated(s, 'substack.com', 0), true);
});

test('expire re-gates the domain immediately', () => {
  let s = grant(initialState(), 'linkedin.com', 0, TEN_MIN);
  s = expire(s, 'linkedin.com');
  assert.equal(isGated(s, 'linkedin.com', 0), true);
});

test('reset clears every pass (browser restart)', () => {
  let s = grant(initialState(), 'linkedin.com', 0, TEN_MIN);
  s = grant(s, 'substack.com', 0, TEN_MIN);
  s = reset();
  assert.deepEqual(activePasses(s, 0), []);
});

test('activePasses lists only unexpired domains', () => {
  let s = grant(initialState(), 'linkedin.com', 0, TEN_MIN);
  s = grant(s, 'substack.com', 0, 1000);
  assert.deepEqual(activePasses(s, 2000).sort(), ['linkedin.com']);
});
