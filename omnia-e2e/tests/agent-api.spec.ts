import { test, expect } from '@playwright/test';
import { runAgent, typesOf, tokenText, checkoutOf } from './_helpers';

/**
 * Agent critical flows driven through the real SSE endpoint (POST /agent/run).
 * These run signed-out: the agent ASSEMBLES the order/booking/ride/trip and emits
 * a `checkout` receipt (confirming it would need a Clerk sign-in). Actually
 * placing the order is the signed-in flow — see agent-signed-in.spec.ts.
 */
test.describe('agent · assembles checkouts (signed-out)', () => {
  test('order food → eats checkout', async ({ request }) => {
    const events = await runAgent(request, 'order a pizza from Napoli in Rabat');
    const checkout = checkoutOf(events);
    expect(checkout, `events: ${typesOf(events).join(',')}`).toBeTruthy();
    expect(checkout!.drafts[0].marketplace).toBe('eats');
  });

  test('book stay → stays checkout', async ({ request }) => {
    const events = await runAgent(request, 'book a riad in Marrakech for 2 nights for 2 guests');
    const checkout = checkoutOf(events);
    expect(checkout, `events: ${typesOf(events).join(',')}`).toBeTruthy();
    expect(checkout!.drafts.some((d: { marketplace: string }) => d.marketplace === 'stays')).toBeTruthy();
  });

  test('book ride → rides checkout', async ({ request }) => {
    const events = await runAgent(request, 'book a Porsche in Marrakech');
    const checkout = checkoutOf(events);
    expect(checkout, `events: ${typesOf(events).join(',')}`).toBeTruthy();
    expect(checkout!.drafts.some((d: { marketplace: string }) => d.marketplace === 'rides')).toBeTruthy();
  });

  test('full trip → multi-action checkout with an itinerary', async ({ request }) => {
    const events = await runAgent(request, 'plan a full trip to Rabat for 2 nights for 2 guests');
    const checkout = checkoutOf(events);
    expect(checkout, `events: ${typesOf(events).join(',')}`).toBeTruthy();
    // A trip spans multiple marketplaces and carries a day-by-day plan.
    expect(checkout!.drafts.length).toBeGreaterThan(1);
    expect(checkout!.trip).toBeTruthy();
  });
});

test.describe('agent · guardrails & manage (signed-out)', () => {
  test('unsupported city → polite refusal, no checkout', async ({ request }) => {
    const events = await runAgent(request, 'book a riad in Paris for 3 nights');
    expect(checkoutOf(events)).toBeFalsy();
    expect(tokenText(events)).toMatch(/Paris|don'?t (operate|serve)|only serve|Rabat, Casablanca/i);
  });

  test('cancel with no session → asks to sign in', async ({ request }) => {
    const events = await runAgent(request, 'cancel my order');
    expect(checkoutOf(events)).toBeFalsy();
    expect(tokenText(events)).toMatch(/sign in/i);
  });
});

test.describe('agent · recurring tasks (signed-out)', () => {
  test('schedule a recurring order → asks to sign in (intent detected)', async ({ request }) => {
    const events = await runAgent(request, 'order my usual every Friday at 7pm');
    // Routed to the recurrence path (not a one-off order): no checkout, sign-in prompt.
    expect(checkoutOf(events)).toBeFalsy();
    expect(tokenText(events)).toMatch(/sign in/i);
    expect(typesOf(events)).not.toContain('scheduled');
  });

  test('list recurring tasks → asks to sign in', async ({ request }) => {
    const events = await runAgent(request, 'what are my recurring tasks');
    expect(tokenText(events)).toMatch(/sign in/i);
  });
});
