import { Router, Request, Response } from 'express';

export const quotesRouter = Router();

quotesRouter.get('/quotes', async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=3600');
  // TODO: wire up quote-service (cache-aside: Redis → Postgres → Redis)
  res.json({ quotes: [], count: 0 });
});

quotesRouter.get('/quotes/highlight', async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  // TODO: wire up quote-service (read-through: Redis only, fallback to random pick)
  res.json({ quote: null, highlightSetAt: null });
});

quotesRouter.get('/stats', async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  // TODO: report real Redis + Postgres status
  res.json({
    timestamp: new Date().toISOString(),
    database: { status: 'unknown' },
    redis: { highlight: null, quotesAll: null },
    uptime: process.uptime(),
  });
});
