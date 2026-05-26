import type { Quote, Highlight } from '@quotekai/shared-types';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { log } from '../lib/logger';

const QUOTES_ALL_KEY = 'quotes:all';
const QUOTES_ALL_TTL = 1800; // 30 minutes
const HIGHLIGHT_KEY = 'quotes:highlight';

export async function getAllQuotes(): Promise<Quote[]> {
  const cached = await redis.get(QUOTES_ALL_KEY);

  if (cached) {
    log.info({ key: QUOTES_ALL_KEY }, 'cache HIT');
    return JSON.parse(cached) as Quote[];
  }

  log.info({ key: QUOTES_ALL_KEY }, 'cache MISS — querying Postgres');

  const rows = await prisma.quote.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const quotes: Quote[] = rows.map((r) => ({
    id: r.id,
    text: r.text,
    author: r.author,
    createdAt: r.createdAt.toISOString(),
  }));

  await redis.setex(QUOTES_ALL_KEY, QUOTES_ALL_TTL, JSON.stringify(quotes));
  log.info({ key: QUOTES_ALL_KEY, ttl: QUOTES_ALL_TTL, count: quotes.length }, 'cache SET');

  return quotes;
}

export async function getHighlightQuote(): Promise<{ highlight: Highlight; fallback: boolean }> {
  const cached = await redis.get(HIGHLIGHT_KEY);

  if (cached) {
    log.info({ key: HIGHLIGHT_KEY }, 'cache HIT');
    return { highlight: JSON.parse(cached) as Highlight, fallback: false };
  }

  log.warn({ key: HIGHLIGHT_KEY }, 'cache MISS — picking fallback from Postgres');

  const count = await prisma.quote.count();
  if (count === 0) throw new Error('No quotes in database');

  const skip = Math.floor(Math.random() * count);
  const row = await prisma.quote.findFirst({ skip });
  if (!row) throw new Error('Failed to pick random quote');

  const highlight: Highlight = {
    id: row.id,
    text: row.text,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
    setAt: new Date().toISOString(),
  };

  // No TTL — the worker is the source of truth for this key
  await redis.set(HIGHLIGHT_KEY, JSON.stringify(highlight));
  log.info({ key: HIGHLIGHT_KEY, id: highlight.id }, 'fallback highlight SET');

  return { highlight, fallback: true };
}
