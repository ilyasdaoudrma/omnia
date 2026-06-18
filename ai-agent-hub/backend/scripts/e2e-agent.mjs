#!/usr/bin/env node
/**
 * OMNIA Agent — repeatable end-to-end smoke test (no secrets printed).
 *
 * Drives the live agent over its SSE endpoint with the customer prompts from the
 * brief and asserts the assembled checkout / clarify / refusal. Also checks CORS
 * for 127.0.0.1 and that signed-out marketplace bookings are rejected (401).
 *
 * Usage:  node scripts/e2e-agent.mjs        (needs the 4 backends running)
 *         npm run e2e
 *
 * Requires Node 18+ (global fetch). Reads no .env and prints no credentials.
 */

const AGENT = process.env.AGENT_URL ?? 'http://localhost:3000';
const STAYS = process.env.STAYS_URL ?? 'http://localhost:3001';
const EATS = process.env.EATS_URL ?? 'http://localhost:3002';
const RIDES = process.env.RIDES_URL ?? 'http://localhost:3003';

const CITY = {
  Tanger: [35.7595, -5.834],
  Rabat: [34.0209, -6.8416],
  Marrakech: [31.6295, -7.9811],
  Agadir: [30.4278, -9.5981],
};

let passed = 0;
let failed = 0;
const fails = [];

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    fails.push(name);
    console.log(`  ✗ ${name}${detail ? `  — ${detail}` : ''}`);
  }
}

/** POST a prompt to the agent and collect the parsed SSE events. */
async function runAgent(prompt, city) {
  const [lat, lon] = CITY[city] ?? CITY.Rabat;
  const res = await fetch(`${AGENT}/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, history: [], location: { lat, lon, city, country: 'Morocco' } }),
  });
  const text = await res.text();
  const events = [];
  let tokens = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const p = line.slice(5).trim();
    if (!p || p === '[DONE]') continue;
    try {
      const e = JSON.parse(p);
      events.push(e);
      if (e.type === 'token') tokens += e.text;
    } catch {
      /* ignore non-JSON frames */
    }
  }
  return {
    tokens: tokens.trim(),
    checkout: events.find((e) => e.type === 'checkout'),
    clarify: events.find((e) => e.type === 'clarify'),
  };
}

const itemNames = (d) => (d?.items ?? []).map((i) => i.name.toLowerCase()).join(' | ');

async function main() {
  console.log(`\nOMNIA Agent E2E — agent=${AGENT}\n`);

  // ── 0) CORS: 127.0.0.1 must be allowed ──────────────────────────────────
  console.log('[CORS] 127.0.0.1 origin allowed');
  try {
    const r = await fetch(`${AGENT}/health`, { headers: { Origin: 'http://127.0.0.1:5180' } });
    const acao = r.headers.get('access-control-allow-origin');
    check('agent /health reflects 127.0.0.1 origin', acao === 'http://127.0.0.1:5180', `ACAO=${acao}`);
    const body = await r.json();
    check('public /health hides key-pool detail', body.groqKeys === undefined, JSON.stringify(Object.keys(body)));
    const kr = await fetch(`${AGENT}/health/keys`);
    check('gated /health/keys reachable in dev', kr.ok, `status=${kr.status}`);
  } catch (e) {
    check('agent reachable', false, String(e));
    return finish();
  }

  // ── 1) Eats: pepperoni pizza + coke in Tanger ───────────────────────────
  console.log('\n[1] "Order me a pepperoni pizza and a coke in Tanger"');
  {
    const r = await runAgent('Order me a pepperoni pizza and a coke in Tanger', 'Tanger');
    const d = r.checkout?.drafts?.[0];
    check('returns an eats checkout', d?.marketplace === 'eats', r.tokens.slice(0, 80));
    check('order includes a pizza', /pizza|margher|pepperoni/.test(itemNames(d)), itemNames(d));
    check('order total > 0', (d?.total ?? 0) > 0);
    // Coke isn't in the seed — it must be substituted with a drink or flagged, never silently dropped.
    const cokeFlagged = /coke/i.test(r.tokens) && /(isn'?t on|left (it|them) off|instead|added)/i.test(r.tokens);
    const hasDrink = /juice|tea|soda|water|cola|lemonade|smoothie/i.test(itemNames(d));
    check('unavailable coke is substituted or flagged (not silently dropped)', cokeFlagged || hasDrink, r.tokens.slice(0, 160));
  }

  // ── 2) Ride: from X to Y, ~12 km (the parseEndpoints fix) ───────────────
  console.log('\n[2] "Book me an economy ride from Rabat Agdal station to Rabat airport, about 12 km"');
  {
    const r = await runAgent('Book me an economy ride from Rabat Agdal station to Rabat airport, about 12 km', 'Rabat');
    const d = r.checkout?.drafts?.[0];
    check('returns a rides checkout', d?.marketplace === 'rides');
    check('pickup = "Rabat Agdal station"', d?.pickup === 'Rabat Agdal station', `pickup=${d?.pickup}`);
    check('dropoff = "Rabat airport"', d?.dropoff === 'Rabat airport', `dropoff=${d?.dropoff}`);
    check('distance = 12 km', d?.distanceKm === 12, `km=${d?.distanceKm}`);
    check('offers alternative ride tiers', (d?.rideOptions?.length ?? 0) > 1);
  }

  // ── 3) Stay: riad in Marrakech, 2 guests, 3 nights, under 900/night ─────
  console.log('\n[3] "Book a riad in Marrakech for 2 guests for 3 nights under 900 MAD per night"');
  {
    const r = await runAgent('Book a riad in Marrakech for 2 guests for 3 nights under 900 MAD per night', 'Marrakech');
    const d = r.checkout?.drafts?.[0];
    check('returns a stays checkout', d?.marketplace === 'stays');
    check('nights = 3', d?.nights === 3, `nights=${d?.nights}`);
    check('guests = 2', d?.guests === 2, `guests=${d?.guests}`);
    check('per-night within 900', d ? d.total / (d.nights || 1) <= 900 : false, `total=${d?.total}`);
  }

  // ── 3b) Misspelled city in the PROMPT must still resolve to Marrakech ────
  console.log('\n[3b] "Book a riad in marakech for 2 guests for 3 nights" (misspelled; location=Tanger)');
  {
    const r = await runAgent('Book a riad in marakech for 2 guests for 3 nights', 'Tanger');
    const d = r.checkout?.drafts?.[0];
    check('misspelled prompt city → stays checkout', d?.marketplace === 'stays', r.tokens.slice(0, 80));
    check('resolves to Marrakech inventory', /marrakech/i.test(d?.subtitle ?? ''), `subtitle=${d?.subtitle}`);
  }

  // ── 3c) Misspelled city in the LOCATION (prompt names no city) ──────────
  console.log('\n[3c] "Book me a riad for 2 guests for 3 nights" (location city="marakech")');
  {
    const r = await runAgent('Book me a riad for 2 guests for 3 nights', 'marakech');
    const d = r.checkout?.drafts?.[0];
    check('misspelled location city → stays checkout (not empty)', d?.marketplace === 'stays', r.tokens.slice(0, 80));
  }

  // ── 4) Trip with no party size → must ASK guests first ──────────────────
  console.log('\n[4] "Plan my full trip to Agadir"  (expects a clarifying question)');
  {
    const r = await runAgent('Plan my full trip to Agadir', 'Agadir');
    check('asks a clarifying question', Boolean(r.clarify), r.tokens.slice(0, 80));
    check('question is about guests', /guest/i.test(r.clarify?.question ?? ''), r.clarify?.question);
    check('does not pre-book', !r.checkout);
  }

  // ── 5) Full trip with guests + nights + budget → receipt + itinerary ────
  console.log('\n[5] "Plan my full trip to Agadir for 2 guests for 3 nights under 3000 MAD"');
  {
    const r = await runAgent('Plan my full trip to Agadir for 2 guests for 3 nights under 3000 MAD', 'Agadir');
    const c = r.checkout;
    check('returns a multi-action checkout', (c?.drafts?.length ?? 0) >= 2, `drafts=${c?.drafts?.length}`);
    check('includes a trip plan', Boolean(c?.trip));
    check('itinerary has days', (c?.trip?.days?.length ?? 0) >= 3, `days=${c?.trip?.days?.length}`);
    check('budget cap recorded = 3000', c?.trip?.budget?.budget === 3000, `budget=${c?.trip?.budget?.budget}`);
    check('budget breakdown present', c?.trip?.budget && ['stay', 'ride', 'food', 'total'].every((k) => typeof c.trip.budget[k] === 'number'));
  }

  // ── 6) Unsupported city → polite refusal, no booking ────────────────────
  console.log('\n[6] "Book me a hotel and dinner in Paris for 2 nights"  (expects refusal)');
  {
    const r = await runAgent('Book me a hotel and dinner in Paris for 2 nights', 'Rabat');
    check("refuses (doesn't operate in Paris)", /doesn'?t operate in Paris/i.test(r.tokens), r.tokens.slice(0, 100));
    check('does not book', !r.checkout);
  }

  // ── 7) Signed-out bookings must be rejected (401), never silent ─────────
  console.log('\n[7] Signed-out Buy Now — marketplace APIs reject without a token (401)');
  {
    const post = (url, body) =>
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.status);
    check('Eats /orders → 401', (await post(`${EATS}/orders`, { vendorId: 'x', items: [] })) === 401);
    check('Stays /bookings → 401', (await post(`${STAYS}/bookings`, { listingId: 'x', nights: 1 })) === 401);
    check('Rides /trips → 401', (await post(`${RIDES}/trips`, { rideClassId: 'x' })) === 401);
  }

  // ── 8) Signed-in Buy Now — needs a real Clerk session (manual) ──────────
  console.log('\n[8] Signed-in Buy Now');
  console.log('  ~ SKIPPED: requires a real Clerk session token (sign in with Google in the UI, then tap Buy now).');

  finish();
}

function finish() {
  console.log(`\n────────────────────────────\n${passed} passed, ${failed} failed`);
  if (fails.length) console.log(`Failed: ${fails.join('; ')}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('E2E runner crashed:', e);
  process.exit(1);
});
