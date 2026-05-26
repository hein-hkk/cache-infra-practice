# Instructions for Claude Code

This file tells Claude Code how to work on this project. Read this before making changes.

## Project Purpose

QuoteKai is a **practice project** for learning Cloudflare, Redis, and background workers. The product features are intentionally minimal. **Do not add scope-creep features** (auth, user accounts, admin dashboard, notifications, premium tiers, etc.) even if they seem useful. The point is infrastructure practice, not product completeness.

If a feature seems missing, it's intentional. Ask before adding.

## Tech Stack (Strict)

Use exactly these tools. Do not substitute:

- **Package manager:** pnpm (never npm or yarn)
- **Monorepo:** pnpm workspaces (no Turborepo, Nx, or Lerna)
- **Language:** TypeScript everywhere (no plain JavaScript)
- **API framework:** Express.js (not Fastify, Hono, NestJS)
- **Web framework:** Next.js with App Router (not Pages Router)
- **Mobile framework:** React Native with Expo (managed workflow)
- **ORM:** Prisma (not Drizzle, TypeORM, raw SQL)
- **Queue:** BullMQ (not Bull, Agenda, BeeQueue)
- **Cache/Queue store:** Redis
- **Database:** PostgreSQL
- **Local infra:** Docker Compose
- **Validation:** Zod (for request/response validation)
- **HTTP client:** native fetch (don't add axios)
- **Logging:** pino (structured JSON logs)

## Repository Structure

```
quotekai/
├── apps/
│   ├── api/           # Express API (port 3001)
│   ├── worker/        # BullMQ worker (no port)
│   ├── web/           # Next.js web (port 3000)
│   └── mobile/        # Expo mobile
├── packages/
│   ├── shared-types/  # TypeScript types only
│   └── api-client/    # Fetch wrapper for web + mobile
├── infrastructure/
│   └── docker-compose.yml
├── docs/
└── package.json
```

**Each app and package gets its own `package.json`.** Workspace dependencies use the `workspace:*` protocol.

## Conventions

### File naming

- TypeScript files: `kebab-case.ts` (e.g., `quote-service.ts`)
- React components: `PascalCase.tsx` (e.g., `QuoteCard.tsx`)
- Test files: `*.test.ts` colocated with the file they test
- Folder names: `kebab-case`

### Code organization in `apps/api`

```
apps/api/src/
├── index.ts              # Entry point, server bootstrap
├── config.ts             # Loads env vars, exports typed config
├── routes/               # Route definitions
│   └── quotes.ts
├── services/             # Business logic
│   └── quote-service.ts
├── lib/                  # Infrastructure clients
│   ├── prisma.ts
│   ├── redis.ts
│   └── cloudflare.ts
├── middleware/           # Express middleware
└── types/                # Local types (not shared)
```

### Code organization in `apps/worker`

```
apps/worker/src/
├── index.ts              # Worker entry point, registers jobs
├── config.ts
├── jobs/                 # Job processors
│   └── rotate-highlight.ts
└── lib/                  # Shared with API patterns
    ├── prisma.ts
    ├── redis.ts
    └── cloudflare.ts
```

### Imports

- Use `@quotekai/shared-types` and `@quotekai/api-client` for cross-package imports
- Within an app, use relative imports (`./services/quote-service`)
- Don't use barrel files (`index.ts` re-exports) — they hurt tree-shaking and slow IDE

### Async patterns

- Use `async/await`, never raw promises with `.then()`
- Always handle errors at the top of route handlers using a wrapping helper
- Never swallow errors silently

### Error handling

- API returns errors as `{ error: { code: string, message: string } }` with appropriate HTTP status
- Workers log errors with full context, let BullMQ handle retries

## What NOT to do

- ❌ Do not add authentication, login, or user accounts
- ❌ Do not add an admin dashboard
- ❌ Do not add push notifications or FCM
- ❌ Do not add tests beyond minimal smoke tests (out of scope for practice)
- ❌ Do not add CI/CD pipelines (we deploy manually for practice)
- ❌ Do not add Sentry, OpenTelemetry, or other observability tools (use console + pino logs)
- ❌ Do not add Tailwind animations, dark mode, or complex UI (this is infra practice, not UI practice)
- ❌ Do not add ESLint rules beyond defaults (keep config minimal)
- ❌ Do not over-engineer abstractions (no repository pattern, no DI containers)

## What TO do

- ✅ Log cache hits and misses prominently (we want to observe the cache)
- ✅ Use structured logging (pino with JSON output)
- ✅ Set explicit TTLs on every Redis key
- ✅ Set `Cache-Control` headers on every HTTP response
- ✅ Document non-obvious decisions with inline comments
- ✅ Keep API responses small and consistent

## Caching Behavior (Important)

This project's whole point is caching. Implement carefully:

### Endpoint: `GET /api/quotes`

- **Cloudflare:** `Cache-Control: public, max-age=60, s-maxage=3600` (browser 1min, CDN 1hr)
- **Redis key:** `quotes:all` with TTL 1800 (30 min)
- **Pattern:** cache-aside (check Redis → fallback to Postgres → write Redis)
- **Invalidation:** none needed for this project (quotes are seeded, don't change)

### Endpoint: `GET /api/quotes/highlight`

- **Cloudflare:** `Cache-Control: public, max-age=60, s-maxage=300` (CDN 5min)
- **Redis key:** `quotes:highlight` — written by worker, no TTL (worker is source of truth)
- **Pattern:** read-through Redis only (Redis is the source for this endpoint)
- **Fallback:** if Redis is empty, pick a quote immediately and store it

### Endpoint: `GET /api/stats`

- **Cloudflare:** `Cache-Control: no-store` (always fresh)
- **Redis:** read current state but don't cache
- **Purpose:** observability — show what's happening in the system

### Worker: `rotate-highlight` job

- Runs every 5 minutes via BullMQ repeat
- Picks a random quote from Postgres
- Writes to Redis as `quotes:highlight` with metadata `{ id, text, author, setAt }`
- Purges Cloudflare cache for `/api/quotes/highlight`
- Logs the rotation prominently

## Environment Variables

Each app has its own `.env`. Never commit `.env` files. Always commit `.env.example`.

Required env vars are documented in each app's `.env.example`.

## Git Workflow

- `main` — production-deployable
- `staging` — staging environment
- `dev` — integration branch
- `feat/*` — feature branches off `dev`

Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## When in Doubt

- Read `docs/architecture.md` for system design questions
- Read `docs/api-spec.md` for exact API contracts
- Read `docs/data-model.md` for database schema
- Ask the human if a design decision is ambiguous

Don't guess on architecture. Ask.
