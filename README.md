# outegro

Outegro monorepo — pnpm workspaces + Turborepo. Shared code lives in `packages/*`
(`@outegro/*`, consumed via `workspace:*`, never published), apps in `apps/*`.

## Layout

```
apps/
  auth-backend/        Email-code login, JWT/JWKS, sessions, refresh (NestJS)
  auth-web/            Login + profile (Next.js, BFF-lite)
  landing-web/         outegro.com services overview (Next.js)
  notifications-backend/  Channel-agnostic delivery: Resend + Telegram (NestJS)
packages/
  core/            logger, env validation, errors, graceful shutdown
  contracts/       shared Zod schemas + types (FE/BE source of truth)
  events/          RabbitMQ exchanges / routing keys / payload types
  auth-client/     JWT/JWKS verification (interface now, impl in Ch3)
  db/              Drizzle baseline (postgres.js client factory)
docker-compose.yml local Postgres + Redis + RabbitMQ
```

## Toolchain

- **Node 24**, **pnpm 10**, **Turborepo**, **Biome** (lint + format).
- Shared packages compile to **CommonJS** (consumable by Nest CJS + bundled by Next).
- TypeScript pinned at `5.9` (Nest/Next ecosystem) and `@types/node` at `24` (runtime match).

## Develop

```bash
pnpm install
docker compose up -d                 # Postgres + Redis + RabbitMQ
cp .env.example .env                 # local config

pnpm build                           # turbo: build packages, then apps
pnpm turbo run lint typecheck build  # full check

# run a single app
pnpm --filter auth-backend start:dev
pnpm --filter auth-web dev
```

Each app exposes `/health` (liveness) and `/api/metrics` (frontend) or `/health/deep`
(backend) in Prometheus-friendly shapes for the in-cluster kube-prometheus-stack.
