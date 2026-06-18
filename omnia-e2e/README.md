# OMNIA E2E

Playwright end-to-end tests for the OMNIA suite — the agent (ai-agent-hub) plus
the OMNIA Stays / Eats / Rides marketplaces.

## Prerequisites

All four apps must be **running** (this project does not start them):

- Backends (PM2): `pm2 start ../ecosystem.config.cjs` → ports **3000–3003**
- Frontends (Vite): the `agenthub-dev`, `omnia-stays-dev`, `omnia-eats-dev`,
  `omnia-rides-dev` launch configs → ports **5180–5183**

The `backend health` spec asserts all four are up + DB-connected before the rest.

## Install & run

```bash
npm install
npx playwright install chromium   # first time only (browsers may already be cached)
npm test                          # all signed-out / public specs
npm run test:agent                # agent specs only
npm run test:market               # marketplace specs only
npm run report                    # open the last HTML report
```

## What's covered (signed-out / public — runs headless)

- **health** — all 4 backends `/health` return `ok` + `db: connected`.
- **agent (API, via SSE)** — assembles an Eats order, a Stays booking, a Rides
  booking, and a full multi-marketplace **trip** (with itinerary); refuses an
  unsupported city; asks to sign in for `cancel my order`; routes
  `order my usual every Friday` to the **recurring-task** path (sign-in prompt,
  no one-off checkout).
- **agent (UI)** — `/chat` loads (greeting + composer, no console errors); typing
  a request streams a confirmable **receipt** with a Buy now + sign-in CTA.
- **marketplaces** (Stays / Eats / Rides) — homepage city picker renders; a
  **detail page** (deep-linked from the live API) shows the title, the public
  **reviews** section, and the signed-out booking CTA; the **reviews API** is
  public to read and `401` to write.

## What's NOT covered headless (see `signed-in.spec.ts`)

Anything behind a **Clerk Google sign-in** can't run headless. `signed-in.spec.ts`
documents that test plan as `test.describe.skip`: placing orders/bookings/rides &
full trips via Buy now, cancelling, **scheduling a recurring task** end-to-end
(ScheduledCard → Dashboard → cancel), posting a review, and the **OMNIA Rewards**
wallet on the Dashboard.

To run them with a saved session:

```bash
# sign in once with Google in the opened browser, then close it
npx playwright codegen --save-storage=auth.json http://localhost:5180
# point the suite at the session and un-skip the describe block
OMNIA_STORAGE_STATE=auth.json npx playwright test signed-in
```

The recurring-task **scheduler + server-side placement** is verifiable without a
session via the agent backend's secret-guarded `POST /recurrences/admin/run-due`
(see the project notes) — the part that needs a session is only *creating* a
recurrence through the chat UI.
