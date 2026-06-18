# OMNIA

**Wish it. OMNIA does the rest.**

OMNIA is a suite of four full-stack apps that share **one login** and are tied together by a gold-and-black **AI concierge**. Describe what you want in plain language — _"plan my weekend in Agadir for under 3,000 MAD"_ — and the agent finds real options across stays, food and rides, compares them, and books them into the live marketplaces on your behalf.

> Built end-to-end (design, frontend, backend, AI, infra) by **El Asmi Ilyas Daoud**.

---

## The four apps

| App | What it is | Theme | Frontend | Backend |
|-----|-----------|-------|----------|---------|
| **OMNIA Agent** | AI concierge — chat + live agent activity | Gold / black | `ai-agent-hub/` (5180) | `ai-agent-hub/backend/` (3000) |
| **OMNIA Stays** | Airbnb-style stays marketplace | Blue | `omnia-stays/frontend/` (5181) | `omnia-stays/backend/` (3001) |
| **OMNIA Eats** | Food-delivery marketplace | Orange | `omnia-eats/frontend/` (5182) | `omnia-eats/backend/` (3002) |
| **OMNIA Rides** | Ride-hailing marketplace | Green | `omnia-rides/frontend/` (5183) | `omnia-rides/backend/` (3003) |

Plus **`omnia-e2e/`** — a Playwright end-to-end suite covering all four apps.

It serves six Moroccan cities: **Rabat, Casablanca, Marrakech, Tanger, Oujda, Agadir**. Currency is MAD.

---

## What the agent can do

- **Natural-language ordering & booking** — _"order a Margherita and a Coca-Cola from Napoli in Rabat"_ → a confirm-ready receipt that creates a real order (tagged _via OMNIA Agent_).
- **Full-trip planning across all three marketplaces** — stay + ride + meals assembled into one itinerary, with a hard budget cap.
- **Manage existing orders** — cancel, modify nights/guests, change a ride's pickup, edit order items, reorder "your usual".
- **Recurring tasks** — _"order my usual from Dar Tagine every Friday at 7pm"_; a cron fires it while you're away.
- **Memory & context** — remembers the conversation; follow-ups like _"just a water please"_ keep the active restaurant.
- **Scope guardrails** — politely declines off-topic requests and unsupported cities.
- **Reviews, an OMNIA Rewards wallet, live ride tracking, maps, and a per-user request meter.**

---

## Architecture

```
        ┌──────────────────────────── shared Clerk identity ────────────────────────────┐
        │                                                                                │
  OMNIA Agent ──HTTP──> OMNIA Stays / Eats / Rides marketplaces (each its own DB)
  (chat + planner)       book / order / ride  →  real rows, "via OMNIA Agent" badge
        │
   Groq (Llama) with multi-key failover
```

- **Frontend:** React 19 + Vite + TypeScript + TailwindCSS + Framer Motion + Zustand + React Query.
- **Backend:** NestJS + Prisma + PostgreSQL (Neon), one database per app.
- **AI:** Groq (Llama) via a provider-agnostic layer, with automatic multi-key rotation on rate limits.
- **Auth:** Clerk (shared across all four apps) with Google sign-in.
- **Infra:** the four backends run under PM2 (`ecosystem.config.cjs`); the agent backend persists per-user daily request limits in Postgres.

See [`OMNIA_OVERVIEW.md`](./OMNIA_OVERVIEW.md) for the full architecture, run guide, and security checklist.

---

## Run it locally

Each app needs its own `.env` (copy from the `.env.example` in each backend/frontend and fill in your own keys — Neon database URLs, Clerk keys, and a Groq API key).

```bash
# 1. Install deps (per app)
npm --prefix ai-agent-hub install && npm --prefix ai-agent-hub/backend install
#   …repeat for omnia-stays, omnia-eats, omnia-rides (frontend + backend)

# 2. Push the Prisma schema + seed each backend's database
npm --prefix ai-agent-hub/backend run prisma:push

# 3. Build + start the backends under PM2
npm --prefix ai-agent-hub/backend run build   # repeat per backend
pm2 start ecosystem.config.cjs

# 4. Start the frontends (Vite dev), ports 5180–5183
npm --prefix ai-agent-hub run dev
```

---

## Security

- All real secrets live in per-app `.env` files, which are **gitignored** — only `.env.example` templates are committed.
- Per-user (or per-IP) rate limiting on the paid agent endpoint: 20/min + a daily cap persisted in Postgres.
- Helmet headers, per-user request keying by Clerk `sub`, and a report-only CSP starter in `ai-agent-hub/nginx.conf`.

---

## Creator

Built by **El Asmi Ilyas Daoud** — full-stack developer.

- GitHub: [ilyasdaoudrma](https://github.com/ilyasdaoudrma)
- LinkedIn: [ilyas-daoud-el-asmi](https://www.linkedin.com/in/ilyas-daoud-el-asmi-0a531039b)
- Instagram: [@ig_yas10](https://instagram.com/ig_yas10)

_Made with ♥ in Morocco._
