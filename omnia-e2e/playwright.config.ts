import { defineConfig, devices } from '@playwright/test';

/**
 * OMNIA E2E config. The 4 apps are expected to be ALREADY RUNNING (frontends via
 * the preview/launch configs on 5180-5183, backends under PM2 on 3000-3003) — we
 * do not auto-start them here. See README.md. Tests cover the signed-out / public
 * paths; flows that require a Clerk Google session are written as documented
 * test.skip (they can't run headless without a real OAuth session).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    // Reuse a saved signed-in session if the user provides one (see README).
    storageState: process.env.OMNIA_STORAGE_STATE || undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
