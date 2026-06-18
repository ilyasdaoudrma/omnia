---
title: OMNIA Eats API
emoji: 🟠
colorFrom: orange
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# OMNIA Eats API

NestJS + Prisma backend for **OMNIA**, deployed as a Hugging Face Docker Space from
the [omnia monorepo](https://github.com/ilyasdaoudrma/omnia) (`omnia-eats/backend`).

Set the environment variables (DATABASE_URL, Clerk keys, CORS_ORIGINS, etc.) in this
Space's **Settings → Variables and secrets** — see `DEPLOY.md` in the repo. The app
listens on port 7860 and exposes `GET /health`.
