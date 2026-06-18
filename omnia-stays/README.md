# OMNIA Stays

Airbnb-style stays marketplace in the **OMNIA** suite. Blue/white light theme,
city-first browsing, real bookings, reviews, Leaflet maps. Part of a 4-app suite
that shares one Clerk login — see the OMNIA overview for the big picture.

- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind + Framer Motion → port **5181**
- **Backend** (`backend/`): NestJS + Prisma + PostgreSQL (Neon) → port **3001**

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
cp .env.example .env            # VITE_CLERK_PUBLISHABLE_KEY, VITE_STAYS_API_URL
npm install
npm run dev
```

Health: `GET http://localhost:3001/health` → `{ status: "ok", db: "connected" }`.

## Notes

- **Shared identity:** uses the SAME Clerk keys as the other OMNIA apps.
- **Agent integration:** the OMNIA agent books here (`source: "agent"`), shown with
  a "via OMNIA Agent" badge. The recurring-task scheduler places bookings via a
  trusted server-to-server path (shared `OMNIA_AGENT_SECRET` + clerkId).
- **Security:** Helmet headers, per-user/IP rate limiting, exact-origin CORS
  (`CORS_ORIGINS`). Never put secrets in `VITE_` vars — those ship to the browser.
- **Reviews:** `GET /listings/:id/reviews` is public; `POST` requires auth.
