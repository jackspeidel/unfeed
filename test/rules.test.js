import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlockRules, buildAllowRule, allowRuleId } from '../src/rules.js';

const INT = 'chrome-extension://abcdef/interstitial.html';

test('builds a redirect rule per feed filter with unique ids', () => {
  const rules = buildBlockRules(INT);
  assert.ok(rules.length >= 4); // 2 LinkedIn + 3 Substack filters currently
  const ids = rules.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'rule ids must be unique');
});

test('block rules redirect to the interstitial carrying the matched URL', () => {
  for (const r of buildBlockRules(INT)) {
    assert.equal(r.action.type, 'redirect');
    assert.equal(r.action.redirect.regexSubstitution, `${INT}?dest=\\0`);
    assert.deepEqual(r.condition.resourceTypes, ['main_frame']);
  }
});

test('allow rule outranks block rules and targets the domain', () => {
  const allow = buildAllowRule('linkedin.com');
  assert.equal(allow.action.type, 'allow');
  assert.ok(allow.priority > 1, 'allow must outrank block priority');
  assert.ok(allow.condition.regexFilter.includes('linkedin'));
  assert.deepEqual(allow.condition.resourceTypes, ['main_frame']);
});

test('allow-rule ids are stable and distinct per domain', () => {
  assert.equal(allowRuleId('linkedin.com'), allowRuleId('linkedin.com'));
  assert.notEqual(allowRuleId('linkedin.com'), allowRuleId('substack.com'));
});

test('allowRuleId throws on an unknown domain', () => {
  assert.throws(() => allowRuleId('example.com'));
});
