import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { log } from '../lib/logger';
import { getAllQuotes, getHighlightQuote } from '../services/quote-service';

export const quotesRouter = Router();

quotesRouter.get('/quotes', async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  try {
    const quotes = await getAllQuotes();
    res.json({ quotes, count: quotes.length });
  } catch (err) {
    log.error({ err }, 'GET /quotes failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to retrieve quotes' } });
  }
});

quotesRouter.get('/quotes/highlight', async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  try {
    const { highlight, fallback } = await getHighlightQuote();
    const body: Record<string, unknown> = {
      quote: {
        id: highlight.id,
        text: highlight.text,
        author: highlight.author,
        createdAt: highlight.createdAt,
      },
      highlightSetAt: highlight.setAt,
    };
    if (fallback) body.fallback = true;
    res.json(body);
  } catch (err) {
    log.error({ err }, 'GET /quotes/highlight failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to retrieve highlight' } });
  }
});

quotesRouter.get('/stats', async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');

  // Database check
  let database: Record<string, unknown>;
  try {
    const totalQuotes = await prisma.quote.count();
    database = { connected: true, totalQuotes };
  } catch (err) {
    database = { connected: false, error: (err as Error).message };
  }

  // Redis checks — run independently so one failure doesn't block the other
  let redisConnected = true;
  let highlight: Record<string, unknown> | null = null;
  let quotesAllCached = false;
  let quotesAllTTLSeconds: number | undefined;

  try {
    const raw = await redis.get('quotes:highlight');
    if (raw) {
      const payload = JSON.parse(raw) as { id: string; setAt: string };
      const ageSeconds = Math.floor((Date.now() - new Date(payload.setAt).getTime()) / 1000);
      highlight = { id: payload.id, setAt: payload.setAt, ageSeconds };
    }
  } catch (err) {
    log.warn({ err }, 'stats: failed to read quotes:highlight');
    redisConnected = false;
  }

  try {
    const ttl = await redis.ttl('quotes:all');
    // ttl === -2: key absent, ttl === -1: key exists with no TTL
    quotesAllCached = ttl > 0;
    if (quotesAllCached) quotesAllTTLSeconds = ttl;
  } catch (err) {
    log.warn({ err }, 'stats: failed to read quotes:all TTL');
    redisConnected = false;
  }

  res.json({
    timestamp: new Date().toISOString(),
    database,
    redis: {
      connected: redisConnected,
      highlight,
      quotesAllCached,
      ...(quotesAllTTLSeconds !== undefined && { quotesAllTTLSeconds }),
    },
    uptime: { processSeconds: Math.floor(process.uptime()) },
  });
});
