# OMNIA — overview & deployment guide

OMNIA is **four full-stack apps that share one Clerk login**, plus a Playwright
E2E suite. The agent is an AI concierge that books across the three marketplaces.

| App | Folder | Frontend | Backend | Theme |
|-----|--------|----------|---------|-------|
| **Agent** (OMNIA) | `ai-agent-hub/` | :5180 | :3000 | gold / black |
| **OMNIA Stays** | `omnia-stays/` | :5181 | :3001 | blue |
| **OMNIA Eats** | `omnia-eats/` | :5182 | :3002 | orange |
| **OMNIA Rides** | `omnia-rides/` | :5183 | :3003 | green |
| **E2E tests** | `omnia-e2e/` | — | — | Playwright |

**Stack:** React 19 + Vite + TypeScript + Tailwind + Framer Motion (frontends);
NestJS + Prisma + PostgreSQL/Neon (backends); Groq for the agent AI; Clerk for
auth; Leaflet for maps.

## Run locally

```bash
# 1) Each backend: copy env, install, push schema, seed
#    (per-app: cp backend/.env.example backend/.env, then fill values)
# 2) Backends under PM2 (recommended):
pm2 start ecosystem.config.cjs && pm2 save
pm2 status            # omnia-agent-api / stays-api / eats-api / rides-api online
# 3) Frontends: npm run dev in each app's frontend dir (5180–5183)
# 4) Smoke check:
curl localhost:3000/health   # → { status:"ok", db:"connected" }  (repeat 3001–3003)
```

After a reboot: `pm2 resurrect`. After a backend source change:
`npm --prefix <app>/backend run build && pm2 restart omnia-<app>-api`.

## E2E tests

```bash
cd omnia-e2e && npm install && npm test    # 26 pass / 7 skipped (signed-in)
```
Use `npm test`, NOT `npx playwright test`. See `omnia-e2e/README.md`.

## Key features

- **Agent**: natural-language order/book/ride, full multi-marketplace trip
  planning with budget, cancel/modify, "your usual"/reorder, personalization,
  EN/FR/AR (+RTL), PWA + on-device notifications.
- **Recurring tasks**: "order my usual every Friday" → a cron fires it and places
  the order server-side via a trusted path (see Security). Managed in the agent
  Dashboard.
- **Marketplaces**: city-first browse, premium detail pages, reviews, wallet
  (OMNIA Rewards), maps + live ride tracking.

## Security (production checklist)

- **Secrets are server-only.** `OMNIA_AGENT_SECRET`, `CLERK_SECRET_KEY`, Groq keys,
  and `DATABASE_URL` live in backend env vars. Never in `VITE_*` (those ship to the
  browser). All `.env` files are git-ignored; `.env.example` files document the vars.
- **`OMNIA_AGENT_SECRET`** must be identical in all 4 backends — it authenticates
  the scheduler's server-to-server order placement (header `x-omnia-agent-secret`
  + clerkId). Generate a long random value.
- **Rate limiting** (`@nestjs/throttler`): per signed-in user, else per IP. Baseline
  120/min; agent `/agent/run` capped at 20/min (Groq cost); `recurrences/admin/run-due`
  at 10/min. Health checks are exempt.
- **Helmet** headers on all backends (HSTS, nosniff, frameguard, CORP cross-origin).
- **CORS**: set `CORS_ORIGINS` to your EXACT domains in production (no wildcards),
  e.g. `https://stays.omnia.app,https://omnia.app`.
- **`recurrences/admin/run-due`**: secret-guarded + rate-limited; optionally lock to
  `RECURRENCE_ADMIN_IPS` and keep on an internal network. The cron does the same work
  on a schedule, so this route is for ops only.
- Behind a proxy/load balancer, `trust proxy` is enabled so rate limiting sees the
  real client IP — make sure the proxy sets `X-Forwarded-For`.

## Pushing to GitHub

Each app folder is self-contained (own `.gitignore` ignoring `node_modules`,
`dist`, `.env`; own `.env.example`). Two options:

1. **One repo** — create an `omnia/` repo and add the 5 folders + `ecosystem.config.cjs`
   + this file. Add a root `.gitignore` with `**/node_modules`, `**/dist`, `**/.env`.
   (Do NOT `git init` directly in this Downloads folder — it contains unrelated projects.)
2. **Per-app repos** — push each of `ai-agent-hub`, `omnia-stays`, `omnia-eats`,
   `omnia-rides`, `omnia-e2e` as its own repo.

Before the first push, confirm no real secret is staged:
`git grep -nE "sk_(test|live)|gsk_|npg_|postgres://[^ ]*:[^@]+@"` should only match
`.env` (ignored) — never a tracked file.
