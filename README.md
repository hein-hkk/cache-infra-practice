# QuoteKai

A practice project to learn production-grade infrastructure patterns: **Cloudflare** (edge caching), **Redis** (application caching + worker state), and **Background Workers** (scheduled jobs).

The product is intentionally minimal so the focus stays on infrastructure, not features.

## What it does

- Displays a scrollable list of quotes (web and mobile)
- Shows a "highlight quote" that rotates every 5 minutes (chosen by a background worker)
- Exposes a stats endpoint for observing the system's internal state

That's the entire product. The interesting parts are the layers behind it.

## Tech Stack

- **Monorepo:** pnpm workspaces
- **API:** Express.js + TypeScript
- **Web:** Next.js (App Router)
- **Mobile:** React Native (Expo)
- **Worker:** BullMQ
- **Database:** PostgreSQL (via Prisma)
- **Cache:** Redis
- **Edge:** Cloudflare (CDN + WAF)
- **Hosting:** Railway (API, worker, Postgres, Redis), Vercel (web), Expo (mobile)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start local infrastructure (Postgres + Redis)
cd infrastructure && docker compose up -d && cd ..

# Run migrations and seed data
pnpm db:migrate
pnpm db:seed

# Start everything (API, worker, web) in parallel
pnpm dev

# In another terminal, start the mobile app
pnpm --filter @quotekai/mobile start
```

See `docs/dev-setup.md` for detailed setup.

## Documentation

- `docs/project-spec.md` — what we're building (features, scope, constraints)
- `docs/architecture.md` — how the system is structured
- `docs/api-spec.md` — exact API contract
- `docs/data-model.md` — database schema
- `docs/dev-setup.md` — detailed development setup
- `CLAUDE.md` — instructions for Claude Code

## Status

Practice project. Not for commercial use. Will be archived after learning goals are met.
