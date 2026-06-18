# OMNIA backend — Hugging Face Docker Space image.
# HF routes HTTPS to app_port (7860); NestJS reads PORT. Schema lives on Neon
# (run `prisma db push` once per DB — see DEPLOY.md); the container just connects.

# ── Stage 1: build ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# ── Stage 2: runtime ──
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:7860/health || exit 1
CMD ["node", "dist/main.js"]
