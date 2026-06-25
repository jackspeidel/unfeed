// Smoke #3 — continue-to-feed forwards to the original URL (issue #3).
//
// With the enforced pause shrunk to ~100ms via the injectable override, the
// "Continue to feed" button becomes clickable; clicking it grants a pass and
// forwards to the EXACT original feed URL (query string and all). The pass's
// session allow-rule outranks the block rule, so the feed loads rather than
// re-gating. The real 10-minute alarm is NOT wall-clock tested here — pass
// expiry is proven at the pass-lifecycle seam.

import { test, expect, setPauseOverrideSeconds } from './fixtures.js';

// A feed URL carrying a query string, to prove `dest` is forwarded intact.
const FEED_URL = 'https://www.linkedin.com/feed/?trk=smoke-test';

test('continue-to-feed grants a pass and forwards to the exact original URL', async ({
  context,
  serviceWorker,
  extensionId
}) => {
  // Shrink the enforced pause so the smoke doesn't wait on a real wall clock.
  await setPauseOverrideSeconds(serviceWorker, 0.1);

  // Once the pass lets the feed through DNR, it hits the real network. Stub it
  // so the smoke is hermetic: we only assert the forward landed on the exact
  // feed URL un-gated, not what LinkedIn serves.
  await context.route('https://www.linkedin.com/feed/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Feed</title>feed' })
  );

  const page = await context.newPage();

  // Reach the front door.
  await page.goto(FEED_URL);
  await expect(page).toHaveURL(
    new RegExp(`^chrome-extension://${extensionId}/interstitial\\.html`)
  );

  // With the override, the pause elapses in ~100ms and the button enables.
  const continueBtn = page.getByRole('button', { name: /Continue to feed/i });
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });

  // Continue forwards to the exact original feed URL...
  await continueBtn.click();
  await expect(page).toHaveURL(FEED_URL);

  // ...and the feed actually loads (allow rule outranks block) rather than
  // bouncing back to the interstitial.
  expect(page.url()).not.toContain(extensionId);
  await expect(page).toHaveTitle('Feed');
});

test('with no override, the enforced pause is still in effect (no regression)', async ({
  context,
  extensionId
}) => {
  // No setPauseOverrideSeconds call: the front door uses the catalog default.
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/feed/');
  await expect(page).toHaveURL(
    new RegExp(`^chrome-extension://${extensionId}/interstitial\\.html`)
  );

  // The button is disabled on arrival and stays disabled — the real pause was
  // not bypassed. We don't wait out the full duration (the PRD forbids
  // wall-clock-testing it); proving it's still enforced is enough.
  const continueBtn = page.getByRole('button', { name: /Continue to feed/i });
  await expect(continueBtn).toBeDisabled();
  await page.waitForTimeout(500);
  await expect(continueBtn).toBeDisabled();
});
