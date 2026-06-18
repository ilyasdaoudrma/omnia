# Deploying OMNIA (Vercel + Hugging Face Spaces)

This guide deploys the 4 **frontends to Vercel** and the 4 **backends to Hugging Face
Docker Spaces**, all from this one GitHub repo. Databases stay on **Neon**, auth on
**Clerk**, AI on **Groq**.

```
 Vercel (static SPAs)                 Hugging Face Spaces (Docker)            Neon
 ─────────────────────                ───────────────────────────            ────
 omnia-agent   ─┐                     omnia-agent-api  :7860  ──► agent DB
 omnia-stays    ├─ call ─►            omnia-stays-api  :7860  ──► stays DB
 omnia-eats     │                     omnia-eats-api   :7860  ──► eats  DB
 omnia-rides   ─┘                     omnia-rides-api  :7860  ──► rides DB
                  the agent frontend ALSO calls the 3 marketplace backends directly
```

> **URLs are predictable**, so you can set env vars before everything is live:
> - HF Space: `https://<HF_USERNAME>-<space-name>.hf.space`
>   (e.g. `https://ilyasdaoudrma-omnia-agent-api.hf.space`)
> - Vercel: `https://<project-name>.vercel.app` (pick the project names below).

Throughout, replace `ilyasdaoudrma` with your own HF/Vercel handle if different.

---

## 0. Prerequisites (one-time)

- **GitHub**: this repo is already pushed. ✅
- **Neon**: the 4 databases already exist (the `DATABASE_URL`s are in your local
  `.env` files). You can reuse them, or create 4 fresh prod DBs. For any *fresh* DB,
  run the schema once from your machine:
  `npm --prefix ai-agent-hub/backend run prisma:push` (repeat per app with that app's `DATABASE_URL`).
- **Clerk** (production): in the Clerk dashboard create/switch to a **Production**
  instance, enable **Google** under Social Connections, and grab the
  `pk_live_…` / `sk_live_…` keys. Add all your Vercel domains under
  **Allowed origins / Paths**. (You can launch with the existing `pk_test`/`sk_test`
  keys to test, but use `pk_live`/`sk_live` for the real LinkedIn launch.)
- **Groq**: you already have 7 keys (in the agent's local `.env`).
- **Accounts**: a free [Hugging Face](https://huggingface.co) account and a free
  [Vercel](https://vercel.com) account, both connected to your GitHub.

---

## 1. Backends → Hugging Face Docker Spaces

### 1a. Create the 4 Spaces
For each backend, create a Space (https://huggingface.co/new-space):

| Space name (must match exactly) | From repo folder |
|---|---|
| `omnia-agent-api` | `ai-agent-hub/backend` |
| `omnia-stays-api` | `omnia-stays/backend` |
| `omnia-eats-api`  | `omnia-eats/backend` |
| `omnia-rides-api` | `omnia-rides/backend` |

- **SDK: Docker** → "Blank" template. Visibility: Public is fine (no secrets in the repo).
- Leave it empty for now — the GitHub Action fills it.

### 1b. Wire auto-deploy (push → rebuild)
The workflow `.github/workflows/deploy-backends.yml` pushes each backend folder to its
Space on every `git push`. Add two **GitHub repo secrets**
(GitHub → repo → Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `HF_USERNAME` | your Hugging Face username (e.g. `ilyasdaoudrma`) |
| `HF_TOKEN` | a Hugging Face **write** token (HF → Settings → Access Tokens) |

Then trigger it: GitHub → **Actions** → "Deploy backends to Hugging Face Spaces" →
**Run workflow** (or just push any change). Each Space will build its Docker image and boot.

### 1c. Set each Space's environment variables
In **each** Space → **Settings → Variables and secrets**, add the vars below.
Use **Secrets** (not Variables) for anything sensitive (keys, DB URLs, the agent secret).

**All four backends get:**

| Key | Value |
|---|---|
| `DATABASE_URL` | that app's Neon connection string |
| `CLERK_SECRET_KEY` | `sk_live_…` (or `sk_test_…` to start) |
| `NODE_ENV` | `production` |
| `OMNIA_AGENT_SECRET` | the SAME 60-char secret across all 4 (rotate it from dev) |
| `CORS_ORIGINS` | the frontend domains that call it (see table) |

**`CORS_ORIGINS` per backend** (comma-separated, your real Vercel URLs):

| Backend | CORS_ORIGINS |
|---|---|
| `omnia-agent-api` | `https://omnia-agent.vercel.app` |
| `omnia-stays-api` | `https://omnia-stays.vercel.app,https://omnia-agent.vercel.app` |
| `omnia-eats-api`  | `https://omnia-eats.vercel.app,https://omnia-agent.vercel.app` |
| `omnia-rides-api` | `https://omnia-rides.vercel.app,https://omnia-agent.vercel.app` |

*(The agent frontend calls all three marketplace backends directly, so each marketplace
backend must allow the agent's domain too.)*

**`omnia-agent-api` also gets:**

| Key | Value |
|---|---|
| `AI_PROVIDER` | `groq` |
| `GROQ_API_KEYS` | your 7 keys, comma-separated |
| `STAYS_API_URL` | `https://ilyasdaoudrma-omnia-stays-api.hf.space` |
| `EATS_API_URL` | `https://ilyasdaoudrma-omnia-eats-api.hf.space` |
| `RIDES_API_URL` | `https://ilyasdaoudrma-omnia-rides-api.hf.space` |
| `HEALTH_ADMIN_TOKEN` | any random string (hides `/health/keys` in prod) |
| `AGENT_RATE_PER_MIN` / `AGENT_RATE_PER_DAY` | optional, defaults 20 / 300 |

**`omnia-stays-api` / `omnia-eats-api` / `omnia-rides-api` also get:**

| Key | Value |
|---|---|
| `CLERK_PUBLISHABLE_KEY` | `pk_live_…` |

After saving secrets, **Restart** each Space. Confirm it's healthy:
`https://ilyasdaoudrma-omnia-agent-api.hf.space/health` → `{"status":"ok","db":"connected",…}`.

---

## 2. Frontends → Vercel

For each frontend, create a Vercel project (https://vercel.com/new → import this repo):

| Vercel project name | Root Directory (set in project settings) |
|---|---|
| `omnia-agent` | `ai-agent-hub` |
| `omnia-stays` | `omnia-stays/frontend` |
| `omnia-eats`  | `omnia-eats/frontend` |
| `omnia-rides` | `omnia-rides/frontend` |

Vercel auto-detects Vite (a `vercel.json` is already in each folder with the SPA
rewrite so routes like `/chat` work). Set **Environment Variables** per project:

**`omnia-agent` (agent frontend):**

| Key | Value |
|---|---|
| `VITE_AI_PROVIDER` | `groq` |
| `VITE_API_BASE_URL` | `https://ilyasdaoudrma-omnia-agent-api.hf.space` |
| `VITE_STAYS_API_URL` | `https://ilyasdaoudrma-omnia-stays-api.hf.space` |
| `VITE_EATS_API_URL` | `https://ilyasdaoudrma-omnia-eats-api.hf.space` |
| `VITE_RIDES_API_URL` | `https://ilyasdaoudrma-omnia-rides-api.hf.space` |
| `VITE_STAYS_URL` | `https://omnia-stays.vercel.app` |
| `VITE_EATS_URL` | `https://omnia-eats.vercel.app` |
| `VITE_RIDES_URL` | `https://omnia-rides.vercel.app` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |

**`omnia-stays` / `omnia-eats` / `omnia-rides` (each marketplace frontend):**

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | that app's HF backend URL (e.g. `…-omnia-stays-api.hf.space`) |
| `VITE_AGENT_URL` | `https://omnia-agent.vercel.app` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |

Deploy each project. **Vite bakes env vars at build time**, so after changing any
`VITE_…` value you must **redeploy** that project.

> Future pushes to `main` auto-redeploy the Vercel projects (Vercel watches the repo).

---

## 3. Final wiring checklist

1. All 4 HF Spaces healthy (`/health` → db connected).
2. Each backend's `CORS_ORIGINS` lists the exact `https://…vercel.app` domains.
3. Agent backend's `STAYS/EATS/RIDES_API_URL` point at the HF Space URLs.
4. Agent frontend's `VITE_*_API_URL` (HF) and `VITE_*_URL` (Vercel) are set.
5. Clerk production instance has Google enabled + your Vercel domains allowlisted.
6. Open `https://omnia-agent.vercel.app`, sign in, run a wish → it should book into the
   marketplaces (check each marketplace's "via OMNIA Agent" rows).

---

## 4. Keeping it awake (HF free Spaces sleep)

Free Spaces sleep after inactivity (cold start on the next hit). The daily request cap
is persisted in Neon, so quota can't be farmed by restarts. To avoid a cold first
impression on your LinkedIn link, add a free uptime pinger (e.g.
[cron-job.org](https://cron-job.org) or UptimeRobot) hitting each
`https://…-api.hf.space/health` every ~10 minutes.

---

## 5. Production hardening (before the real launch)

- `NODE_ENV=production` on every backend (set above).
- Real Clerk `pk_live`/`sk_live` (not `pk_test`/`sk_test`).
- `OMNIA_AGENT_SECRET` rotated to a fresh 60-char value (it's a master key — the
  recurring-task scheduler can act as any user with it). Keep it identical across the 4.
- `HEALTH_ADMIN_TOKEN` set so `/health/keys` (Groq pool) isn't public.
- `CORS_ORIGINS` = your exact domains, no wildcards.
- Rate limiting stays ON (`DISABLE_RATE_LIMIT=0` / unset).

---

## 6. Troubleshooting

- **CORS errors in the browser console** → the calling frontend's domain isn't in that
  backend's `CORS_ORIGINS`. Add it and restart the Space.
- **HF build fails on Prisma** → ensure the Space has enough build time; the Dockerfile
  installs `openssl` for the Prisma engine on Alpine. Check the Space's build logs.
- **`db:connected` is false** → wrong/missing `DATABASE_URL` secret, or the Neon DB is
  paused (open the Neon console once to wake it).
- **First request is slow** → the Space was asleep; add the uptime pinger (section 4).
- **Agent can't reach marketplaces** → check the agent Space's `STAYS/EATS/RIDES_API_URL`
  and that those Spaces are awake.
