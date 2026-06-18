import { test, expect } from '@playwright/test';
import { APPS, API, firstId } from './_helpers';

const CITY_RE = /rabat|casablanca|marrakech|tanger|oujda|agadir/i;

interface Market {
  name: string;
  app: string;
  api: string;
  list: string;
  detail: (id: string) => string;
  reviews: (id: string) => string;
  /** The idle primary action (shown signed-out before clicking). */
  bookCta: RegExp;
  /** The sign-in prompt the guard shows after clicking the action signed-out. */
  authCta: RegExp;
  /** Eats requires a dish in the cart before the order button is enabled. */
  addFirst: boolean;
}

const MARKETS: Market[] = [
  {
    name: 'stays',
    app: APPS.stays,
    api: API.stays,
    list: `${API.stays}/listings?city=Rabat`,
    detail: (id) => `${APPS.stays}/stays/${id}`,
    reviews: (id) => `${API.stays}/listings/${id}/reviews`,
    bookCta: /book now/i,
    authCta: /sign in to book/i,
    addFirst: false,
  },
  {
    name: 'eats',
    app: APPS.eats,
    api: API.eats,
    list: `${API.eats}/vendors?city=Rabat`,
    detail: (id) => `${APPS.eats}/vendor/${id}`,
    reviews: (id) => `${API.eats}/vendors/${id}/reviews`,
    bookCta: /place order/i,
    authCta: /sign in to order/i,
    addFirst: true,
  },
  {
    name: 'rides',
    app: APPS.rides,
    api: API.rides,
    list: `${API.rides}/rides?city=Rabat`,
    detail: (id) => `${APPS.rides}/ride/${id}`,
    reviews: (id) => `${API.rides}/rides/${id}/reviews`,
    bookCta: /book ride/i,
    authCta: /sign in to book/i,
    addFirst: false,
  },
];

for (const m of MARKETS) {
  test.describe(`marketplace · ${m.name}`, () => {
    test('homepage renders the city picker', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (e) => e.type() === 'error' && errors.push(e.text()));
      await page.goto(m.app);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByText(CITY_RE).first()).toBeVisible();
      expect(errors, errors.join('\n')).toHaveLength(0);
    });

    test('detail page renders title, reviews, and the booking control', async ({ page, request }) => {
      const id = await firstId(request, m.list);
      expect(id, `no inventory from ${m.list}`).toBeTruthy();

      await page.goto(m.detail(id!));
      await expect(page.locator('h1').first()).toBeVisible();
      // Public reviews section is present on every detail page.
      await expect(page.getByText(/reviews/i).first()).toBeVisible();
      // The primary booking/order action is rendered.
      await expect(page.getByRole('button', { name: m.bookCta }).first()).toBeVisible();
    });

    test('booking signed-out is guarded → prompts sign-in', async ({ page, request }) => {
      const id = await firstId(request, m.list);
      expect(id).toBeTruthy();
      await page.goto(m.detail(id!));

      // Eats needs a dish in the cart before "Place order" is enabled.
      if (m.addFirst) {
        await page.getByRole('button', { name: /^add$/i }).first().click();
      }
      await page.getByRole('button', { name: m.bookCta }).first().click();
      // No Clerk session → the action resolves to a sign-in prompt, never a silent no-op.
      await expect(page.getByText(m.authCta).first()).toBeVisible({ timeout: 20_000 });
    });

    test('reviews API is public to read, protected to write', async ({ request }) => {
      const id = await firstId(request, m.list);
      expect(id).toBeTruthy();

      const read = await request.get(m.reviews(id!));
      expect(read.ok(), `GET reviews HTTP ${read.status()}`).toBeTruthy();
      expect(Array.isArray(await read.json())).toBeTruthy();

      const write = await request.post(m.reviews(id!), {
        data: { rating: 5, comment: 'e2e', authorName: 'E2E' },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(write.status(), 'unauthenticated POST must be rejected').toBe(401);
    });
  });
}
