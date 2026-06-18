import { test, expect } from '@playwright/test';
import { APPS } from './_helpers';

/** Agent chat UI smoke + one real end-to-end assemble through the browser. */
test.describe('agent · chat UI', () => {
  test('chat loads with greeting + composer', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto(`${APPS.agent}/chat`);
    await expect(page.getByText(/OMNIA/i).first()).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('typing a request assembles a confirmable receipt', async ({ page }) => {
    await page.goto(`${APPS.agent}/chat`);
    const box = page.locator('textarea');
    await box.click();
    await box.fill('book a Porsche in Marrakech');
    await box.press('Enter');

    // The agent streams steps then renders the receipt card with a Buy now CTA.
    await expect(page.getByText(/Buy now/i).first()).toBeVisible({ timeout: 60_000 });
    // Signed-out: confirming requires a sign-in (proactively shown on the card).
    await expect(page.getByText(/sign in/i).first()).toBeVisible();
  });
});
