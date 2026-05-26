# QuoteKai Architecture

**Document Version:** 1.0

---

## 1. Overview

QuoteKai is a small distributed system with four runtime components: an Express API, a BullMQ worker, a Next.js web app, and a React Native mobile app. They share two data stores (PostgreSQL and Redis) and sit behind Cloudflare.

The architecture intentionally mirrors the real project's planned structure at a smaller scale, so patterns learned here transfer directly.

---

## 2. Architecture Diagram

```
                ┌──────────────────────┐
                │   Mobile (Expo)      │
                │   - Home tab         │
                │   - Highlight tab    │
                └──────────┬───────────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────┐   │
│   Web Browser        │   │
└──────────┬───────────┘   │
           │               │
           │               │
┌──────────▼───────────────▼──────────────────────────┐
│ Cloudflare                                          │
│ - DNS, SSL, CDN, WAF                                │
│ - Caches /api/quotes and /api/quotes/highlight      │
│ - api.<your-domain>      → Railway API              │
│ - <your-domain>          → Vercel (Next.js)         │
└──────┬────────────────────────────┬─────────────────┘
       │                            │
       │                            │
┌──────▼─────────────┐          ┌───▼─────────────────┐
│ Vercel             │          │ Railway Project     │
│ Next.js web        │          │                     │
│                    │          │ ┌─────────────────┐ │
│ - SSR for SEO      │          │ │ Express API     │ │
│ - Calls API        │          │ │ (port 3001)     │ │
│   server-side      │──────────┼─►                 │ │
└────────────────────┘          │ └─────────┬───────┘ │
                                │           │         │
                                │           │         │
                                │ ┌─────────▼───────┐ │
                                │ │ Redis           │ │
                                │ │ - quotes:all    │ │
                                │ │ - quotes:       │ │
                                │ │   highlight     │ │
                                │ │ - BullMQ queue  │ │
                                │ └────▲──────┬─────┘ │
                                │      │      │       │
                                │      │      │       │
                                │ ┌────┴──────▼─────┐ │
                                │ │ Worker          │ │
                                │ │ (BullMQ)        │ │
                                │ │ - every 5 min   │ │
                                │ │ - picks random  │ │
                                │ │ - writes Redis  │ │
                                │ │ - purges CF     │ │
                                │ └────┬─────────────┘ │
                                │      │               │
                                │ ┌────▼─────────────┐ │
                                │ │ PostgreSQL       │ │
                                │ │ - quotes table   │ │
                                │ └──────────────────┘ │
                                └──────────────────────┘
                                          │
                                          │ HTTPS
                                          ▼
                                ┌────────────────────┐
                                │ Cloudflare API     │
                                │ (cache purge)      │
                                └────────────────────┘
```

---

## 3. Components

### 3.1 Cloudflare

**Role:** Edge layer in front of both the API and the web.

**Configuration:**

- DNS records for two subdomains pointing to Vercel and Railway
- Cache Rules for `/api/quotes` (5 min) and `/api/quotes/highlight` (5 min)
- No cache for `/api/stats`
- WAF default rules enabled
- SSL mode: Full (strict)

**What it caches:**

- API JSON responses (per Cache Rules)
- Vercel-served static assets (automatic)
- Vercel SSR pages (per their cache headers)

**What it does NOT do here:**

- No API key validation (out of scope for practice)
- No rate limiting rules (defaults are enough)
- No Workers (free tier features only)

---

### 3.2 Express API (Railway)

**Role:** Serves data to web and mobile.

**Endpoints:**

| Method | Path                    | Cache Strategy                          |
| ------ | ----------------------- | --------------------------------------- |
| GET    | `/api/quotes`           | Cloudflare (5 min CDN) + Redis (30 min) |
| GET    | `/api/quotes/highlight` | Cloudflare (5 min CDN) + Redis (no TTL) |
| GET    | `/api/stats`            | No cache anywhere                       |

**Internal flow for `/api/quotes`:**

```
Request arrives
  ↓
Check Redis key 'quotes:all'
  ↓
  Hit?  → Return immediately (log: REDIS HIT)
  Miss? → Query PostgreSQL
        → Write result to Redis with 30min TTL
        → Return result (log: REDIS MISS, DB HIT)
```

**Internal flow for `/api/quotes/highlight`:**

```
Request arrives
  ↓
Read Redis key 'quotes:highlight'
  ↓
  Found? → Return immediately
  Empty? → Pick random quote from PostgreSQL
         → Write to Redis (no TTL — worker owns this key)
         → Return immediately
```

**Internal flow for `/api/stats`:**

```
Request arrives
  ↓
Check Redis connectivity
  ↓
Check PostgreSQL connectivity
  ↓
Count quotes in PostgreSQL
  ↓
Read 'quotes:highlight' metadata from Redis
  ↓
Return diagnostic JSON
```

---

### 3.3 Background Worker (Railway)

**Role:** Rotate the highlight quote on a schedule.

**Process:** Separate Node.js process from the API. Same Git repo, different entry point (`apps/worker`).

**Job: `rotate-highlight`**

```
Trigger: BullMQ repeat, every 5 minutes
  ↓
Pick random quote from PostgreSQL
  ↓
Write to Redis 'quotes:highlight':
  {
    id: "uuid",
    text: "...",
    author: "...",
    setAt: "2026-05-26T10:00:00Z"
  }
  ↓
Call Cloudflare API to purge /api/quotes/highlight cache
  ↓
Log the rotation with quote ID and timestamp
```

**Why the worker is a separate process:**

- API needs to be responsive; worker can take its time
- API and worker scale independently
- If worker crashes, API keeps serving (with stale highlight, which is fine)

---

### 3.4 Next.js Web (Vercel)

**Role:** Public web interface.

**Pages:**

- `/` (Home) — Server-side rendered list of quotes
- `/highlight` — Server-side rendered featured quote

**Data fetching pattern:**

```
Browser requests /
  ↓
Cloudflare (cache hit?)
  ↓ (miss)
Vercel Next.js server runs
  ↓
Next.js fetches /api/quotes server-side
  ↓
Cloudflare (cache hit?)
  ↓ (miss)
Railway API responds
  ↓
Next.js renders HTML
  ↓
Cloudflare caches the HTML
  ↓
Browser receives rendered page
```

For this practice project, Next.js uses `revalidate: 60` so pages regenerate every minute. This exercises Next.js ISR alongside Cloudflare's edge cache.

---

### 3.5 Mobile (Expo)

**Role:** Native mobile interface.

**Screens:**

- Home — Quote list with FlatList
- Highlight — Featured quote with pull-to-refresh

**Data fetching pattern:**

```
App opens screen
  ↓
fetch(API_BASE_URL + '/api/quotes')
  ↓
Cloudflare (cache hit?)
  ↓ (miss)
Railway API responds
```

Mobile calls the API directly, not through Next.js. No BFF pattern for this practice project.

---

### 3.6 PostgreSQL (Railway)

**Role:** Source of truth.

**Tables:**

- `quotes` — id, text, author, created_at

See `docs/data-model.md` for the Prisma schema.

**Note:** PostgreSQL is rarely queried because of caching. That's the point.

---

### 3.7 Redis (Railway)

**Role:** Cache and queue store.

**Keys used:**

| Key                | Type    | TTL     | Written by | Read by |
| ------------------ | ------- | ------- | ---------- | ------- |
| `quotes:all`       | String  | 30 min  | API        | API     |
| `quotes:highlight` | String  | No TTL  | Worker     | API     |
| `bull:*`           | Various | Managed | BullMQ     | BullMQ  |

**Why `quotes:highlight` has no TTL:**

The worker is the source of truth for this key. It writes a new value every 5 minutes. A TTL is unnecessary — the value is always recent.

---

## 4. Request Flows

### 4.1 Cold start: first request after deploy

```
User requests /
  ↓
Cloudflare: MISS
  ↓
Vercel SSR runs: needs data
  ↓
Vercel calls API: /api/quotes
  ↓
Cloudflare (API): MISS
  ↓
API receives request
  ↓
API checks Redis 'quotes:all': MISS
  ↓
API queries PostgreSQL: returns 100 quotes
  ↓
API writes Redis 'quotes:all' (TTL 30 min)
  ↓
API responds to Vercel
  ↓
Cloudflare caches API response (5 min)
  ↓
Vercel renders HTML
  ↓
Cloudflare caches the HTML page
  ↓
User receives the page
```

### 4.2 Warm: subsequent requests

```
User requests /
  ↓
Cloudflare: HIT — returns cached HTML
  ↓
User receives the page instantly
```

The API server is never touched for repeat requests within the cache window.

### 4.3 Worker rotation

```
[Every 5 minutes]
  ↓
Worker wakes up (BullMQ scheduler)
  ↓
Worker picks random quote from PostgreSQL
  ↓
Worker writes to Redis 'quotes:highlight'
  ↓
Worker calls Cloudflare API:
  POST /zones/{zone_id}/purge_cache
  body: { files: ["https://api.<domain>/api/quotes/highlight"] }
  ↓
Worker logs: "Rotated highlight to <quote_id>, purged CF"
  ↓
Worker exits (job complete)
  ↓
[5 minutes later, repeat]
```

### 4.4 Highlight endpoint after rotation

```
User opens /highlight on web or mobile
  ↓
Cloudflare: MISS (was just purged)
  ↓
API reads Redis 'quotes:highlight'
  ↓
Redis returns the new highlight (worker just wrote it)
  ↓
API responds
  ↓
Cloudflare caches the new highlight (5 min)
  ↓
User sees new featured quote
```

---

## 5. Environment Layout

### Development

- All services run locally
- Postgres and Redis run in Docker via `docker-compose.yml`
- API and worker run as Node.js processes (`pnpm dev`)
- Web runs via `next dev`
- Mobile runs via `expo start`
- No Cloudflare in development (direct API access)

### Production

- API and worker deployed to Railway
- Postgres and Redis as Railway add-ons
- Web deployed to Vercel
- Cloudflare in front of both API and web
- Mobile points to production API URL via env config

---

## 6. Observability

This project does not use formal observability tools. Instead:

- **API logs:** structured JSON via pino, includes cache hit/miss for every request
- **Worker logs:** structured JSON, logs every job execution
- **`/api/stats` endpoint:** real-time view of system state
- **Cloudflare dashboard:** cache hit ratio per endpoint
- **Railway dashboard:** CPU, memory, request counts

For learning purposes, log liberally. Real production would tune log volume down.

---

## 7. Security Considerations

This is a practice project, so security is minimal:

- No authentication (everything is public)
- No API keys (relying on Cloudflare for basic DDoS protection)
- Cloudflare WAF default rules
- Origin servers should ideally accept only Cloudflare IPs (set up after deployment)
- Database not exposed publicly (Railway internal networking)

---

## 8. Cost Estimate

| Component  | Cost                                              |
| ---------- | ------------------------------------------------- |
| Railway    | ~$10-20/month                                     |
| Vercel     | $0 (Hobby tier — acceptable for practice project) |
| Cloudflare | $0 (free tier)                                    |
| Expo       | $0                                                |
| Domain     | Already owned                                     |
| **Total**  | **~$10-20/month**                                 |

Stop the project after the learning goals are met to avoid ongoing costs.
