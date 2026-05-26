# QuoteKai API Specification

**Document Version:** 1.0
**Base URL (dev):** `http://localhost:3001`
**Base URL (prod):** `https://api.<your-domain>`

---

## Conventions

- All responses are JSON
- All endpoints use `GET` (this project has no writes from clients)
- Timestamps are ISO 8601 strings in UTC
- IDs are UUIDs (string)
- All error responses follow the shape:

```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

---

## Endpoints

### GET /api/quotes

Returns all quotes in the system.

**Cache headers (sent by API):**

```
Cache-Control: public, max-age=60, s-maxage=300
```

(Browser caches for 1 minute, Cloudflare caches for 5 minutes.)

**Request:** none (no query parameters, no headers required)

**Response 200:**

```json
{
  "quotes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "text": "The only way to do great work is to love what you do.",
      "author": "Steve Jobs",
      "createdAt": "2026-05-26T10:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "text": "Life is what happens when you're busy making other plans.",
      "author": "John Lennon",
      "createdAt": "2026-05-26T10:00:00.000Z"
    }
  ],
  "count": 100
}
```

**Response 500:** Internal server error (e.g., database unreachable)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unable to retrieve quotes"
  }
}
```

**Behavior notes:**

- Returns up to 200 quotes (no pagination needed for practice scale)
- Sorted by `createdAt` descending
- Reads from Redis first (`quotes:all`), falls back to PostgreSQL

---

### GET /api/quotes/highlight

Returns the currently highlighted quote, as set by the background worker.

**Cache headers:**

```
Cache-Control: public, max-age=60, s-maxage=300
```

**Request:** none

**Response 200:**

```json
{
  "quote": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "The only way to do great work is to love what you do.",
    "author": "Steve Jobs",
    "createdAt": "2026-05-26T10:00:00.000Z"
  },
  "highlightSetAt": "2026-05-26T10:35:00.000Z"
}
```

**Response 200 (Redis empty fallback):**

If the Redis key `quotes:highlight` is empty (e.g., right after deploy before worker has run), the API picks a random quote, writes it to Redis, and returns it.

```json
{
  "quote": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "text": "...",
    "author": "...",
    "createdAt": "..."
  },
  "highlightSetAt": "2026-05-26T10:30:00.000Z",
  "fallback": true
}
```

The `fallback: true` field signals this was an emergency fallback, not the worker-chosen highlight.

**Response 500:** Internal error (Redis and database both unreachable)

**Behavior notes:**

- Always reads from Redis first
- If Redis has nothing, falls back to picking a random quote and storing it
- The worker overwrites this key every 5 minutes

---

### GET /api/stats

Returns diagnostic information about the system state. Used for observation during development.

**Cache headers:**

```
Cache-Control: no-store
```

**Request:** none

**Response 200:**

```json
{
  "timestamp": "2026-05-26T10:42:13.000Z",
  "database": {
    "connected": true,
    "totalQuotes": 100
  },
  "redis": {
    "connected": true,
    "highlight": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "setAt": "2026-05-26T10:35:00.000Z",
      "ageSeconds": 433
    },
    "quotesAllCached": true,
    "quotesAllTTLSeconds": 1547
  },
  "uptime": {
    "processSeconds": 3600
  }
}
```

**Response 200 with degraded state:**

If something is wrong, the endpoint still returns 200 but with diagnostic info:

```json
{
  "timestamp": "2026-05-26T10:42:13.000Z",
  "database": {
    "connected": false,
    "error": "ECONNREFUSED"
  },
  "redis": {
    "connected": true,
    "highlight": null,
    "quotesAllCached": false
  },
  "uptime": {
    "processSeconds": 30
  }
}
```

This endpoint is intentionally lenient with status codes — it's for inspection, not health checking. A proper health check endpoint could be added separately if needed.

**Behavior notes:**

- Always queries fresh state (no caching)
- Tolerates partial outages — reports what it can
- Useful curl-able endpoint during development

---

## Cache Behavior Summary

| Endpoint                | Cloudflare TTL | Redis TTL | DB Hit Frequency |
| ----------------------- | -------------- | --------- | ---------------- |
| `/api/quotes`           | 5 min          | 30 min    | Once per 30 min  |
| `/api/quotes/highlight` | 5 min          | No TTL    | Almost never     |
| `/api/stats`            | No cache       | None      | Every request    |

---

## Request/Response Validation

All responses are validated against Zod schemas defined in `packages/shared-types`. The API and the client both use the same schemas, ensuring type safety end-to-end.

Example schema (Zod):

```typescript
// packages/shared-types/src/quote.ts
import { z } from "zod";

export const QuoteSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  author: z.string(),
  createdAt: z.string().datetime(),
});

export type Quote = z.infer<typeof QuoteSchema>;

export const QuotesListResponseSchema = z.object({
  quotes: z.array(QuoteSchema),
  count: z.number().int().nonnegative(),
});
```

---

## Error Codes

| Code             | HTTP Status | Meaning                        |
| ---------------- | ----------- | ------------------------------ |
| `INTERNAL_ERROR` | 500         | Unexpected server error        |
| `NOT_FOUND`      | 404         | Endpoint or resource not found |
| `BAD_REQUEST`    | 400         | Request was malformed          |

For this practice project, the error surface is minimal because there's no client-supplied input to validate.

---

## CORS

For development, the API allows requests from `http://localhost:3000` (Next.js dev) and Expo origins.

For production, the API allows requests from the Vercel production domain. Mobile apps don't need CORS (they're not browsers).

CORS is configured via `cors` middleware in Express.

---

## Versioning

This API uses unversioned paths (`/api/quotes`, not `/api/v1/quotes`). Versioning is overkill for a practice project.
