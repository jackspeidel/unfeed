// Smoke #2 — useful doors are a zero-friction escape (issue #2).
//
// The asymmetry the product is built on: feed routes are gated, but the curated
// non-feed routes pass straight through. From the front door, clicking "Jobs"
// must land on the real `/jobs/` route — not re-intercepted, no `?dest=`.

import { test, expect } from './fixtures.js';

const FEED_URL = 'https://www.linkedin.com/feed/';
const JOBS_URL = 'https://www.linkedin.com/jobs/';

test('clicking a useful door navigates through without interception', async ({
  context,
  extensionId
}) => {
  // Stub the real LinkedIn network so the smoke is hermetic: we only care that
  // the navigation reaches the `/jobs/` route un-gated, not what LinkedIn
  // actually serves. The feed URL is left to DNR (it redirects before any
  // request to LinkedIn is made).
  await context.route('https://www.linkedin.com/jobs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Jobs</title>jobs' })
  );

  const page = await context.newPage();

  // Reach the LinkedIn front door (as in the redirect smoke).
  await page.goto(FEED_URL);
  await expect(page).toHaveURL(
    new RegExp(`^chrome-extension://${extensionId}/interstitial\\.html`)
  );

  // Click the Jobs door.
  await page.getByRole('link', { name: 'Jobs' }).click();

  // We land on the real /jobs/ route — the non-feed route was not gated...
  await expect(page).toHaveURL(JOBS_URL);
  // ...and the page is NOT the interstitial, with no `?dest=` redirect.
  expect(page.url()).not.toContain(extensionId);
  expect(page.url()).not.toContain('dest=');
});
