import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGate } from '../src/resolveGate.js';

test('gates the LinkedIn feed and carries the exact dest', () => {
  const g = resolveGate('https://www.linkedin.com/feed/');
  assert.ok(g);
  assert.equal(g.siteId, 'linkedin');
  assert.equal(g.domain, 'linkedin.com');
  assert.equal(g.dest, 'https://www.linkedin.com/feed/');
});

test('gates the LinkedIn bare-domain redirect (www and apex)', () => {
  assert.ok(resolveGate('https://www.linkedin.com/'));
  assert.ok(resolveGate('https://linkedin.com/'));
});

test('passes through LinkedIn useful routes', () => {
  assert.equal(resolveGate('https://www.linkedin.com/jobs/'), null);
  assert.equal(resolveGate('https://www.linkedin.com/messaging/'), null);
  assert.equal(resolveGate('https://www.linkedin.com/in/jane-doe/'), null);
  assert.equal(resolveGate('https://www.linkedin.com/notifications/'), null);
});

test('gates Substack Home and Notes, but not Inbox or posts', () => {
  assert.ok(resolveGate('https://substack.com/home'));
  assert.ok(resolveGate('https://substack.com/notes'));
  assert.equal(resolveGate('https://substack.com/inbox'), null);
  assert.equal(resolveGate('https://example.substack.com/p/some-post'), null);
  assert.equal(resolveGate('https://my-newsletter.com/p/post'), null);
});

test('preserves query params in the dest', () => {
  const url = 'https://www.linkedin.com/feed/?trk=nav';
  assert.equal(resolveGate(url).dest, url);
});

test('matching is case-insensitive', () => {
  assert.ok(resolveGate('https://WWW.LinkedIn.com/FEED/'));
});
