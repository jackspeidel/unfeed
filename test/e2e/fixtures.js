// Playwright fixtures for the E2E smoke seam.
//
// The pure core (resolveGate, passLifecycle) is proven by browser-free unit
// tests. This seam exists ONLY to verify the Chrome-API wiring that pure
// functions cannot reach: the declarativeNetRequest redirect, the session
// allow-rule a pass installs, and the message round-trip to the worker.
//
// We load the *unpacked* extension into a Chromium persistent context. MV3
// extensions need a real (non-legacy-headless) browser; the modern
// `--headless=new` mode supports them, so CI runs headless while
// HEADED=1 lets you watch the run locally.

import { test as base, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The extension root is the repo root (where manifest.json lives).
export const EXTENSION_PATH = path.resolve(__dirname, '../..');

export const test = base.extend({
  // A persistent context with the unpacked extension loaded.
  context: async ({}, use) => {
    const headless = !process.env.HEADED;
    const context = await chromium.launchPersistentContext('', {
      // Keep `headless: false` so Playwright does not inject the *legacy*
      // headless flag (which cannot load extensions); we opt into the modern
      // headless mode explicitly via args instead.
      headless: false,
      args: [
        ...(headless ? ['--headless=new'] : []),
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`
      ]
    });
    await use(context);
    await context.close();
  },

  // The extension's MV3 background service worker, with its block rules
  // guaranteed installed (the worker installs them on `onInstalled`, which
  // races a fast navigation — so we wait for them here).
  serviceWorker: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    await sw.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        if (rules.length > 0) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error('block rules were never installed');
    });
    await use(sw);
  },

  // The runtime extension id, derived from the service worker URL.
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  }
});

export const expect = test.expect;

// Set (or clear) the injectable pause-duration override the interstitial reads
// at load. Lets smokes shrink the enforced pause to milliseconds instead of
// waiting on a real wall clock. Pass `null` to clear it.
export async function setPauseOverrideSeconds(serviceWorker, seconds) {
  await serviceWorker.evaluate(async (secs) => {
    if (secs == null) {
      await chrome.storage.session.remove('pauseSecondsOverride');
    } else {
      await chrome.storage.session.set({ pauseSecondsOverride: secs });
    }
  }, seconds);
}
