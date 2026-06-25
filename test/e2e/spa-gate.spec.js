// Smoke — the content-script hybrid gates SPA (in-app) navigations.
//
// declarativeNetRequest only sees network requests, so a client-side route
// change into the feed (History API pushState, no document request) would slip
// past it. The content script must catch that and send the tab to the front
// door, just like a real navigation.

import { test, expect, setPauseOverrideSeconds } from './fixtures.js';

// A non-gated LinkedIn route that performs a client-side navigation to /feed/.
const PROFILE_URL = 'https://www.linkedin.com/in/test/';

function stubProfilePage(context) {
  return context.route('https://www.linkedin.com/in/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!DOCTYPE html><title>Profile</title>
             <button id="go">Go to feed</button>
             <script>
               document.getElementById('go').addEventListener('click', () => {
                 history.pushState({}, '', '/feed/');
               });
             </script>`
    })
  );
}

test('a client-side SPA navigation to the feed is gated by the content script', async ({
  context,
  extensionId
}) => {
  await stubProfilePage(context);

  const page = await context.newPage();
  await page.goto(PROFILE_URL);
  await expect(page).toHaveTitle('Profile'); // a useful route loads normally

  // Client-side route change into the feed — no document request, so DNR is
  // blind to it. The content script must step in.
  await page.getByRole('button', { name: 'Go to feed' }).click();

  await expect(page).toHaveURL(
    new RegExp(`^chrome-extension://${extensionId}/interstitial\\.html\\?dest=`)
  );
  expect(page.url()).toContain('dest=https://www.linkedin.com/feed/');
  await expect(page.getByRole('heading', { name: /Heading into LinkedIn/i })).toBeVisible();
});

test('an active pass lets an in-app navigation to the feed through (no re-gating)', async ({
  context,
  serviceWorker,
  extensionId
}) => {
  await setPauseOverrideSeconds(serviceWorker, 0.1);
  await stubProfilePage(context);
  await context.route('https://www.linkedin.com/feed/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Feed</title>feed' })
  );

  // Earn a pass via the front door.
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/feed/');
  const continueBtn = page.getByRole('button', { name: /Continue to feed/i });
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });
  await continueBtn.click();
  await expect(page).toHaveTitle('Feed');

  // Now leave to a useful route and SPA-navigate back to the feed: with the
  // pass active, the content script must NOT bounce us to the front door.
  await page.goto(PROFILE_URL);
  await expect(page).toHaveTitle('Profile');
  await page.getByRole('button', { name: 'Go to feed' }).click();

  await expect(page).toHaveURL('https://www.linkedin.com/feed/');
  expect(page.url()).not.toContain(extensionId);
});
