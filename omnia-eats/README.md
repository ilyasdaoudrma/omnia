# OMNIA Eats

Glovo-style food-delivery marketplace in the **OMNIA** suite. Orange/green light
theme, city-first browsing, menus with drinks/sides, real orders, reviews,
delivery-area maps. Part of a 4-app suite that shares one Clerk login.

- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind + Framer Motion → port **5182**
- **Backend** (`backend/`): NestJS + Prisma + PostgreSQL (Neon) → port **3002**

## Setup

```bash
# Backend
cd backend
cp .env.example .env            # fill DATABASE_URL, Clerk keys, OMNIA_AGENT_SECRET
npm install
npm run prisma:push && npm run prisma:seed
npm run start:dev               # or run under PM2 (see overview)

# Frontend
cd ../frontend
cp .env.example .env            # VITE_CLERK_PUBLISHABLE_KEY, VITE_EATS_API_URL
npm install
npm run dev
```

Health: `GET http://localhost:3002/health` → `{ status: "ok", db: "connected" }`.

## Notes

- **Shared identity:** uses the SAME Clerk keys as the other OMNIA apps.
- **Agent integration:** the OMNIA agent orders here (`source: "agent"`). The
  recurring-task scheduler places orders via a trusted server-to-server path
  (shared `OMNIA_AGENT_SECRET` + clerkId).
- **Security:** Helmet headers, per-user/IP rate limiting, exact-origin CORS.
  Never put secrets in `VITE_` vars.
- **Reviews:** `GET /vendors/:id/reviews` is public; `POST` requires auth.
