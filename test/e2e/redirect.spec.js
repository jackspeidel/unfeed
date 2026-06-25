// Smoke #1 — the redirect path (issue #1).
//
// A real navigation to the LinkedIn feed must never load the feed document:
// the DNR redirect rule swaps it for the extension's front door before any
// feed content renders, carrying the original URL as `?dest=`.

import { test, expect } from './fixtures.js';

const FEED_URL = 'https://www.linkedin.com/feed/';

test('navigating to the LinkedIn feed is redirected to the front door', async ({
  context,
  extensionId
}) => {
  const page = await context.newPage();

  // Drive a real main-frame navigation. DNR intercepts it at the network layer,
  // so this resolves on the interstitial — the feed document never loads.
  await page.goto(FEED_URL);

  // We end on the extension's interstitial, with the exact feed URL in `dest`.
  await expect(page).toHaveURL(
    new RegExp(`^chrome-extension://${extensionId}/interstitial\\.html\\?dest=`)
  );
  expect(page.url()).toContain(`?dest=${FEED_URL}`);

  // No flash-of-feed: every assertion below targets the interstitial document,
  // never the live feed page.
  await expect(page.getByRole('heading', { name: /Heading into LinkedIn/i })).toBeVisible();

  // The LinkedIn useful doors render on the front door.
  for (const label of ['Jobs', 'Messaging', 'Notifications']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }
});
