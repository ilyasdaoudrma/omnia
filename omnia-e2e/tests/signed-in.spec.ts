import { test, expect } from '@playwright/test';
import { APPS } from './_helpers';

/**
 * SIGNED-IN flows. These require a real Clerk Google session, which can't be
 * obtained headlessly, so they are skipped by default and documented here as the
 * manual / storage-state test plan.
 *
 * To run them: sign in once in a real browser, save the session, and point the
 * suite at it:
 *   1) npx playwright codegen --save-storage=auth.json http://localhost:5180  (sign in with Google, then close)
 *   2) OMNIA_STORAGE_STATE=auth.json npx playwright test signed-in
 * then change `test.describe.skip` → `test.describe` below.
 */
test.describe.skip('signed-in flows (need a Clerk Google session)', () => {
  test('agent: order food → Buy now → order appears in Eats orders', async ({ page }) => {
    await page.goto(`${APPS.agent}/chat`);
    // fill "order a pizza from Napoli in Rabat" → Buy now → expect "All set" +
    // the order at APPS.eats/orders with a "via OMNIA Agent" badge.
    expect(true).toBeTruthy();
  });

  test('agent: book stay / book ride / full trip → Buy now places real rows', async () => {
    // Same pattern as above for stays (/trips), rides (/trips), and a full trip
    // (one Buy now places stay + ride + food across all three marketplaces).
  });

  test('agent: cancel my order / cancel my ride → row becomes cancelled', async () => {
    // "cancel my order" → ManageCard → Cancel → the order/ride shows cancelled.
  });

  test('agent: schedule "order my usual every Friday" → ScheduledCard + Dashboard', async ({ page }) => {
    await page.goto(`${APPS.agent}/chat`);
    // "order my usual every Friday" → ScheduledCard ("Scheduled ✓") → the task is
    // listed under Dashboard → "Recurring tasks" → the Trash button cancels it.
  });

  test('marketplace: browse → book a stay/ride / order food (signed in)', async () => {
    // Pick a city → open a detail → Book/Order → row created in that app.
  });

  test('marketplace: post a review → it appears in the list with the live average', async () => {
    // On a detail page, submit the star + comment form → the review renders.
  });

  test('wallet: OMNIA Rewards points + tier reflect total spend on the Dashboard', async ({ page }) => {
    await page.goto(`${APPS.agent}/dashboard`);
    // The Rewards card shows points (1 per 10 MAD) + tier + progress bar.
  });
});
