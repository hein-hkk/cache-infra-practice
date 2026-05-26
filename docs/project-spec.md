# QuoteKai Project Specification

**Document Version:** 1.0
**Project Type:** Practice / Learning
**Status:** Approved Specification

---

## 1. Purpose

QuoteKai is a deliberately minimal application built to practice three infrastructure patterns:

1. **Cloudflare** as an edge layer (CDN, caching, WAF)
2. **Redis** as an application-level cache and worker state store
3. **Background workers** for scheduled jobs

The product itself is incidental. The features exist only to give the infrastructure something to operate on. Any feature that doesn't directly exercise the three target technologies is **out of scope**.

---

## 2. Scope

### In Scope

- Display a list of quotes (web and mobile)
- Display a rotating "highlight quote" updated every 5 minutes
- Provide a stats endpoint for observing system state
- Cloudflare in front of the API and web
- Redis caching pattern (cache-aside) and worker-written cache key
- BullMQ scheduled job for the highlight rotation
- Cloudflare cache purge from the worker
- Manual deployment to Railway (API, worker, infra) and Vercel (web)

### Out of Scope

- User authentication, accounts, sessions
- Admin dashboard or content management UI
- Push notifications, email, SMS, FCM
- Premium tiers, payments, subscriptions
- SEO optimization beyond Next.js defaults
- Internationalization
- Dark mode, animations, polished UI design
- Automated tests beyond smoke tests
- CI/CD pipelines
- Monitoring tools (Sentry, Datadog, etc.) — console logs are sufficient
- Multiple languages or locale support

---

## 3. Features

### Feature 1: All Quotes List

A scrollable list of all quotes in the system.

**Behavior:**

- Endpoint `GET /api/quotes` returns all quotes (up to 200 records, no pagination needed for practice)
- Web shows them on the home page as a scrollable list
- Mobile shows them on the Home tab as a scrollable list
- Data is cached in Cloudflare and Redis
- Quotes are seeded into PostgreSQL; no UI to create new ones

**Why it exists:**

To exercise the standard cache-aside pattern. The endpoint should rarely hit the database after the first request, demonstrating the value of layered caching.

---

### Feature 2: Highlight Quote

A single quote that is featured at any given time. Rotates automatically every 5 minutes.

**Behavior:**

- Background worker selects a random quote every 5 minutes
- Worker writes the chosen quote to Redis under key `quotes:highlight`
- Worker purges the Cloudflare cache for `/api/quotes/highlight`
- Endpoint `GET /api/quotes/highlight` returns the current highlighted quote
- Web shows it on the `/highlight` route
- Mobile shows it on the Highlight tab
- Users can manually refresh; the underlying data only changes every 5 minutes

**Why it exists:**

To exercise:

- A background worker doing scheduled work
- A worker writing to Redis (worker as cache producer, not just consumer)
- Cloudflare cache invalidation triggered from a worker
- Visible, observable behavior (the quote changes every 5 minutes)

---

### Feature 3: Stats Endpoint

A diagnostic endpoint that exposes the current state of the system. Used for observation and learning, not for end users.

**Behavior:**

- Endpoint `GET /api/stats` returns the current internal state
- Response includes: total quote count, current highlight ID, when the highlight was last set, Redis connection status, database connection status
- Response is never cached (always fresh)
- No corresponding UI screen — accessed via browser or curl during development

**Why it exists:**

To make the system observable. Without this endpoint, you'd have to log into Redis CLI to understand what's happening. With it, a single HTTP request shows the system's state. This is the kind of internal endpoint real production systems benefit from.

---

## 4. User Experience

### Web

Two routes:

- `/` — Home: scrollable list of quotes
- `/highlight` — Highlight: shows the current featured quote with a manual refresh button

No navigation menu needed beyond a simple header with two links. No design polish required.

### Mobile

Two tabs:

- **Home tab** — scrollable list of quotes
- **Highlight tab** — current featured quote with pull-to-refresh

Use Expo's default styling. No custom theming.

---

## 5. Data

### Quotes

A quote is a simple record:

- `id` — unique identifier
- `text` — the quote content
- `author` — attribution
- `createdAt` — timestamp

The system is seeded with 50-100 quotes from a public-domain quotes dataset (or hand-curated). Quotes do not change after seeding for this project.

See `docs/data-model.md` for the exact schema.

---

## 6. Performance Goals (Educational)

These are not strict requirements but observable targets that demonstrate the caching is working:

- After warm-up, `GET /api/quotes` should return from Cloudflare cache in under 50ms for users near an edge
- After warm-up, `GET /api/quotes/highlight` should return from Cloudflare cache in under 50ms
- When Cloudflare misses, Redis should respond in under 5ms
- Database queries should be rare — observable in logs

The success criterion is that Cloudflare's cache hit ratio is above 90% for the two public endpoints during normal use.

---

## 7. Deployment Targets

| Component         | Platform                           |
| ----------------- | ---------------------------------- |
| API server        | Railway                            |
| Background worker | Railway                            |
| PostgreSQL        | Railway                            |
| Redis             | Railway                            |
| Web (Next.js)     | Vercel                             |
| Mobile (Expo)     | Expo Go (development build only)   |
| Edge layer        | Cloudflare (using existing domain) |

Mobile is not published to app stores. Test builds via Expo Go on a physical device or simulator.

---

## 8. Constraints

- The project must be completable in approximately 5-7 days of focused work
- No paid services beyond Railway (~$10-20/month for the duration) and the domain (already owned)
- All code must run locally via `pnpm dev` and Docker Compose
- The repository structure is monorepo with apps and packages

---

## 9. Definition of Done

The project is complete when:

1. ✅ Web shows the list of quotes (SSR or ISR via Next.js)
2. ✅ Web shows the current highlight quote
3. ✅ Mobile shows both screens via Expo
4. ✅ API server runs and serves the three endpoints
5. ✅ Background worker rotates the highlight every 5 minutes
6. ✅ Worker successfully purges Cloudflare cache on rotation
7. ✅ Cloudflare cache hit ratio is observable in the dashboard (>90%)
8. ✅ Redis state is observable via `/api/stats` and `redis-cli`
9. ✅ The system is deployed to Railway + Vercel + Cloudflare
10. ✅ A `LEARNINGS.md` file is created documenting non-obvious things discovered during the build

---

## 10. After Completion

The project may be archived after the learning goals are met.
