# QuoteKai Development Setup

**Document Version:** 1.0

This guide takes you from a clean machine to a running QuoteKai system in development.

---

## 1. Prerequisites

Install these on your machine before starting:

| Tool        | Version    | Why                                    |
| ----------- | ---------- | -------------------------------------- |
| Node.js     | 20 LTS+    | Runtime for API, worker, web           |
| pnpm        | 9.x        | Monorepo package manager               |
| Docker      | latest     | Local Postgres + Redis                 |
| Git         | any recent | Version control                        |
| Expo CLI    | latest     | Mobile development (`npx expo`)        |

### Installing pnpm

```bash
npm install -g pnpm
# Or use corepack (included with Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Verify versions

```bash
node --version    # should be 20.x or higher
pnpm --version    # should be 9.x or higher
docker --version  # any recent version works
```

---

## 2. Repository Setup

### Clone or initialize

```bash
# If starting fresh
mkdir quotekai && cd quotekai
git init

# If cloning
git clone <repo-url> quotekai && cd quotekai
```

### Install dependencies

From the repo root:

```bash
pnpm install
```

This installs dependencies for all workspaces in one command.

---

## 3. Environment Variables

### Root `.env`

Copy from the example:

```bash
cp .env.example .env
```

Edit `.env` with your local values. Variables used at the root level:

```bash
# Used by docker-compose and pnpm scripts
DATABASE_URL=postgresql://quotekai:quotekai_dev@localhost:5432/quotekai?schema=public
REDIS_URL=redis://localhost:6379
```

### Per-app `.env` files

Each app has its own `.env` and `.env.example`:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

**Important:** `.env` files are gitignored. Never commit them.

### Required variables per app

#### `apps/api/.env`

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://quotekai:quotekai_dev@localhost:5432/quotekai?schema=public
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
```

#### `apps/worker/.env`

```bash
NODE_ENV=development
DATABASE_URL=postgresql://quotekai:quotekai_dev@localhost:5432/quotekai?schema=public
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug

# Cloudflare (used for cache purging in production only)
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_PURGE_ENABLED=false  # set to true once Cloudflare is configured
```

#### `apps/web/.env.local`

```bash
# Server-side (used during SSR, not exposed to browser)
API_BASE_URL=http://localhost:3001

# Browser-exposed (must start with NEXT_PUBLIC_)
NEXT_PUBLIC_APP_NAME=QuoteKai
```

#### `apps/mobile/.env`

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Mobile env vars need the `EXPO_PUBLIC_` prefix to be exposed to the app.

---

## 4. Local Infrastructure (Postgres + Redis)

Start the infrastructure services with Docker Compose:

```bash
cd infrastructure
docker compose up -d
cd ..
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### Verify they're running

```bash
docker compose -f infrastructure/docker-compose.yml ps
```

You should see both services as `running`.

### Stopping infrastructure

```bash
cd infrastructure
docker compose down       # stops containers, keeps data
docker compose down -v    # stops and deletes all data (useful for fresh start)
```

---

## 5. Database Setup

### Run migrations

```bash
pnpm db:migrate:dev
```

This applies all Prisma migrations to your local database.

### Seed data

```bash
pnpm db:seed
```

This inserts the seed quotes into the database.

### Inspect the database

Two options:

**Option A: Prisma Studio (GUI)**

```bash
pnpm db:studio
```

Opens a web UI at `http://localhost:5555`.

**Option B: psql (CLI)**

```bash
docker compose -f infrastructure/docker-compose.yml exec postgres psql -U quotekai
```

Inside psql:

```sql
\dt                          -- list tables
SELECT count(*) FROM quotes; -- count rows
```

---

## 6. Running Services

You'll have multiple terminals open during development. Use VS Code's split terminal feature or your preferred terminal multiplexer.

### Terminal 1: API

```bash
pnpm dev:api
```

API runs on `http://localhost:3001`. Logs print to console.

Verify it's working:

```bash
curl http://localhost:3001/api/stats
```

### Terminal 2: Worker

```bash
pnpm dev:worker
```

Worker starts the BullMQ scheduler. First job runs immediately, then every 5 minutes.

You should see logs like:

```
{"level":"info","time":"...","msg":"Rotated highlight to <quote_id>, purged CF (skipped in dev)"}
```

### Terminal 3: Web

```bash
pnpm dev:web
```

Next.js dev server starts on `http://localhost:3000`.

Visit:

- `http://localhost:3000` — quote list
- `http://localhost:3000/highlight` — featured quote

### Terminal 4: Mobile (optional)

```bash
pnpm dev:mobile
```

Expo starts. Scan the QR code with the Expo Go app on your phone, or press `i` for iOS simulator / `a` for Android emulator.

### Shortcut: run all backend services at once

```bash
pnpm dev
```

This runs API, worker, and web in parallel using pnpm's `--parallel` flag. Mobile must be run separately.

---

## 7. Useful Commands

### From root

```bash
pnpm dev              # Run API + worker + web in parallel
pnpm dev:api          # Run API only
pnpm dev:worker       # Run worker only
pnpm dev:web          # Run web only
pnpm dev:mobile       # Run mobile only

pnpm build            # Build all apps and packages
pnpm typecheck        # Run TypeScript checks across all workspaces
pnpm lint             # Run linting across all workspaces

pnpm db:migrate:dev   # Create + apply migration
pnpm db:migrate:deploy # Apply migrations (production)
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Run seed script
pnpm db:reset         # Reset database (dev only)
```

### Inspecting Redis

```bash
# Open redis-cli inside the container
docker compose -f infrastructure/docker-compose.yml exec redis redis-cli

# Inside redis-cli:
KEYS *                  # list all keys
GET quotes:highlight    # see current highlight
TTL quotes:all          # check TTL on cached list
FLUSHALL                # clear everything (dev only!)
```

---

## 8. Common Development Tasks

### Add a new dependency to an app

```bash
# Example: add zod to the API
pnpm --filter @quotekai/api add zod

# Add a dev dependency
pnpm --filter @quotekai/api add -D @types/express
```

### Add a workspace dependency

```bash
# Make web depend on shared-types
pnpm --filter @quotekai/web add @quotekai/shared-types@workspace:*
```

### Update Prisma schema

1. Edit `apps/api/prisma/schema.prisma`
2. Create migration: `pnpm db:migrate:dev --name describe-change`
3. Prisma auto-generates the client

### Add a new endpoint

1. Add route to `apps/api/src/routes/`
2. Register in `apps/api/src/index.ts`
3. Add types to `packages/shared-types/`
4. Add client method to `packages/api-client/`

### Run a single test

```bash
pnpm --filter @quotekai/api test path/to/test.ts
```

---

## 9. Git Workflow

### Branches

```
main      — production-ready
staging   — staging environment
dev       — integration branch
feat/*    — feature branches
```

### Typical feature flow

```bash
# Start a new feature
git checkout dev
git pull
git checkout -b feat/add-stats-endpoint

# Work on the feature
# ... edit code ...
git add .
git commit -m "feat: add /api/stats endpoint"

# Push and merge to dev
git push origin feat/add-stats-endpoint
# Open PR on GitHub, merge to dev

# When ready for staging
git checkout staging
git merge dev
git push origin staging

# When ready for production
git checkout main
git merge staging
git push origin main
```

### Commit message format

Conventional Commits:

- `feat:` new feature
- `fix:` bug fix
- `chore:` tooling / config
- `docs:` documentation
- `refactor:` code change without behavior change

---

## 10. Troubleshooting

### "Port already in use"

Another process is using port 3000, 3001, or 5432. Find and kill it:

```bash
# macOS / Linux
lsof -i :3001
kill -9 <PID>
```

### "Cannot connect to database"

Check Docker is running:

```bash
docker compose -f infrastructure/docker-compose.yml ps
```

If Postgres isn't listed, start it:

```bash
cd infrastructure && docker compose up -d
```

### "Redis connection refused"

Same as above — ensure Redis container is running.

### "Module not found: @quotekai/shared-types"

Workspace dependencies need to be installed and built:

```bash
pnpm install
pnpm --filter @quotekai/shared-types build
```

### Worker not picking up jobs

Verify Redis is running and check the queue:

```bash
docker compose -f infrastructure/docker-compose.yml exec redis redis-cli KEYS "bull:*"
```

You should see BullMQ keys. If not, the worker isn't connected properly — check `REDIS_URL` in `apps/worker/.env`.

### Cloudflare cache purge fails

In development, set `CLOUDFLARE_PURGE_ENABLED=false` in `apps/worker/.env`. The worker will log that it would purge but skip the actual call. Set to `true` only after deploying and configuring real Cloudflare credentials.

### "Cannot find type definitions"

```bash
pnpm install
pnpm typecheck
```

If types are still missing, restart your TypeScript server in VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server".

---

## 11. VS Code Setup (Optional but Recommended)

### Workspace settings

Create `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Recommended extensions

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense (for Next.js)
- React Native Tools (for mobile)

---

## 12. Deployment (Brief)

Full deployment is covered in a separate document, but at a high level:

- **API + Worker:** push to `main` triggers Railway deployment
- **Web:** push to `main` triggers Vercel deployment
- **Mobile:** built via `expo build` or `eas build`
- **Cloudflare:** configured once via dashboard, then static

For this practice project, deploy on Day 6 or 7 after local development is complete.

---

## 13. Tearing Down

When you're done practicing:

```bash
# Stop and remove all local containers + data
cd infrastructure
docker compose down -v

# Delete the project directory
cd ..
rm -rf quotekai
```

On Railway and Vercel, delete the projects from their dashboards to stop billing.
