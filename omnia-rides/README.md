# OMNIA Rides

inDrive-style ride-hailing marketplace in the **OMNIA** suite. Green/white light
theme, city-first browsing, a real car fleet (Sandero → Porsche), live map
tracking after booking, reviews. Part of a 4-app suite that shares one Clerk login.

- **Frontend** (`frontend/`): React 19 + Vite + TypeScript + Tailwind + Framer Motion → port **5183**
- **Backend** (`backend/`): NestJS + Prisma + PostgreSQL (Neon) → port **3003**

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
cp .env.example .env            # VITE_CLERK_PUBLISHABLE_KEY, VITE_RIDES_API_URL
npm install
npm run dev
```

Health: `GET http://localhost:3003/health` → `{ status: "ok", db: "connected" }`.

## Notes

- **Car photos** are served by the backend from `backend/public/cars/` at `/cars/*`
  (cross-origin, so Helmet sets `Cross-Origin-Resource-Policy: cross-origin`).
- **Shared identity:** uses the SAME Clerk keys as the other OMNIA apps.
- **Agent integration:** the OMNIA agent books rides here (`source: "agent"`). The
  recurring-task scheduler places rides via a trusted server-to-server path
  (shared `OMNIA_AGENT_SECRET` + clerkId).
- **Security:** Helmet headers, per-user/IP rate limiting, exact-origin CORS.
  Never put secrets in `VITE_` vars.
- **Reviews:** `GET /rides/:id/reviews` is public; `POST` requires auth.
