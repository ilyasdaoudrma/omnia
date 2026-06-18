# AI Agent Hub

> Talk. Your agent does the rest.

A premium, futuristic SaaS frontend for an **agentic assistant** — describe what you
want in plain language and watch a planner agent decompose the request, select tools,
execute, compare options, and recommend actions across travel, food, rides, and shopping.

Full stack: **React 19 + Vite** frontend and a **NestJS + Prisma + PostgreSQL** backend
that runs a real **planner → tools → recommendation** agent loop over a provider-agnostic
AI layer (**mock · Claude · OpenAI**), with **Clerk** auth (email + **Google**).

```
ai-agent-hub/
├── src/        ← React 19 frontend (Vite, Tailwind, Framer Motion)
└── backend/    ← NestJS API (Prisma, Postgres, Claude/OpenAI, Clerk)
```

---

## ✨ What's inside

| Surface | Route | Highlights |
| --- | --- | --- |
| **Landing** | `/` | Cinematic hero (masked word reveal, ghost type, typewriter), bento features, agent-loop explainer, **live interactive demo**, count-up stats, testimonials marquee, pricing, FAQ, CTA |
| **AI Chat** | `/chat` | ChatGPT-style streaming chat, suggested actions, composer (voice/file UI), inline recommendation cards, and a live **Agent Activity Center** (current tool, task plan, progress, execution log) |
| **Dashboard** | `/dashboard` | Upcoming trips, active agent tasks, orders, notifications, recommendations |
| **Itinerary** | `/itinerary` | Visual day-by-day timeline with tool-tagged events and a budget meter |

### Design recipe
Glassmorphism, neon-aurora background, custom lerp cursor, magnetic buttons, film grain,
expo-out easing (`cubic-bezier(0.16,1,0.3,1)`), Lenis inertia scroll, reveal-on-scroll,
and full `prefers-reduced-motion` fallbacks.

---

## 🚀 Quick start

```bash
npm install
cp .env.example .env   # optional — app runs fully in guest + mock mode with no keys
npm run dev            # http://localhost:5180
```

The frontend runs **with zero configuration** in guest mode + mock AI, so the entire
experience (including the live agent loop) is explorable immediately — no backend needed.

### Run the full stack (real backend + database)

```bash
# 1. Backend
cd backend
cp .env.example .env          # set DATABASE_URL; add AI/Clerk keys for real mode
npm install
npx prisma db push            # create tables (needs a running Postgres)
npm run prisma:seed           # optional demo data
npm run start:dev             # http://localhost:3000

# 2. Frontend → point it at the backend
#    in the root .env set: VITE_AI_PROVIDER=claude  (or openai)
npm run dev
```

Or the whole thing in containers (frontend + backend + Postgres):

```bash
docker compose up --build     # frontend :8080 · backend :3000 · db :5432
```

### Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on `:5180` |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## 🔌 Wiring real services (you add the keys)

Everything is built behind clean interfaces. Flip from mock → real by setting env vars.

### Authentication — Clerk (with Google)
1. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Frontend — put the publishable key in the root `.env`:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   ```
3. Backend — put the secret key in `backend/.env`:
   ```env
   CLERK_SECRET_KEY=sk_test_xxxxx
   ```
4. **Enable Google login:** in the Clerk dashboard → **User & Authentication → Social
   Connections → toggle Google on**. That's the only step — the app's `/sign-in` and
   `/sign-up` pages automatically render a **“Continue with Google”** button (plus email).
   Google's OAuth credentials live in Clerk, never in this codebase.

Without a publishable key the app stays in **guest mode** and Clerk is **lazy-loaded** —
it never touches the landing bundle when disabled.

### AI provider — Claude / OpenAI
The browser must **never** hold secret model keys. Select the provider and point the
app at your backend, which holds the secrets and runs the real agent loop:
```env
VITE_AI_PROVIDER=claude        # mock | claude | openai
VITE_API_BASE_URL=http://localhost:3000
```
The NestJS backend in **`backend/`** already implements this — it runs the real planner,
executes tools, and streams the answer from Claude/OpenAI. With `AI_PROVIDER=mock` (the
default) it streams the same events with no keys. See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
for the `POST /agent/run` SSE contract. The frontend speaks it via `src/lib/ai/backend.ts`.

---

## 🧱 Architecture at a glance

```
src/
├── lib/ai/            Provider-agnostic agent layer
│   ├── types.ts       AgentEvent / Recommendation / AIProvider contract
│   ├── tools.ts       Tool registry (travel, maps, restaurant, shopping, …)
│   ├── mock.ts        Client-side agent-loop simulator
│   ├── backend.ts     Real Claude/OpenAI via SSE to your backend
│   ├── scenarios.ts   Rich demo scenarios
│   └── index.ts       createAIProvider() factory (env-driven)
├── store/             Zustand agent session store (shared chat ⇄ activity center)
├── hooks/             useLenis, useMagnetic, useCountUp, usePrefersReducedMotion
├── components/
│   ├── fx/            Aurora, CustomCursor, Reveal, Marquee, PageTransition
│   ├── ui/            Button, GlassCard, Badge, ToolIcon
│   ├── layout/        Navbar, Footer, AuthControls
│   ├── auth/          Lazy Clerk provider + buttons
│   ├── landing/       Hero, Features, HowItWorks, DemoShowcase, Stats, …
│   ├── chat/          ChatInterface, MessageBubble, Composer, HistorySidebar
│   └── agent/         AgentActivityCenter, StepRow, RecommendationCard
├── pages/             Landing / Chat / Dashboard / Itinerary
└── data/              Dashboard + itinerary mock data
```

The same `AIProvider` contract powers the mock simulator and the real backend, so the
chat UI and Activity Center are **identical** whether you're in demo or production.

---

## 📦 Build & deploy

### Static hosting (Vercel / Netlify / Cloudflare Pages)
`npm run build` → deploy `dist/`. Configure an **SPA fallback** so all routes serve
`index.html` (a `vercel.json` / `_redirects` rewrite of `/* → /index.html`).

### Docker — full stack
```bash
docker compose up --build     # frontend :8080 · backend :3000 · Postgres :5432
```
`docker-compose.yml` builds the nginx-served frontend (SPA fallback + asset caching via
`nginx.conf`), the NestJS backend (which runs `prisma db push` on boot), and Postgres
with a healthcheck gate. Pass AI/Clerk keys via env to switch from mock to real mode.

> Build-time env: pass `VITE_*` vars as Docker build args (they're inlined at build
> time, not runtime). See `Dockerfile` for the `ARG`/`ENV` hooks.

---

## ⚡ Performance

- Route-level code splitting (Chat/Dashboard/Itinerary load on demand).
- Clerk lazy-loaded out of the landing critical path.
- Compositor-only animations (`transform`/`opacity`), `prefers-reduced-motion` honored.
- Lazy images below the fold; explicit asset sizing.

---

## 🗺️ Roadmap (architecture is ready for)
Multi-agent collaboration · autonomous workflows · voice-first I/O · personal memory ·
budget optimization engine · connected-account execution · mobile + browser extension.

---

Built for the agentic era. © AI Agent Hub.
