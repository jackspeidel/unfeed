import { defineConfig } from '@playwright/test';

// Thin E2E seam — a handful of happy-path smokes that exercise the real
// Chrome-API wiring (DNR redirect, session allow-rule, alarms). The behavioral
// rules are proven deterministically by the pure-core unit tests under `test/`.
export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.js',
  // Each test launches its own extension-loaded Chromium; keep them serial so
  // the persistent contexts don't contend.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: [['list']]
});
