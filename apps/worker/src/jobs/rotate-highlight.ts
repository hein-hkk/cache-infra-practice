import type { Job } from 'bullmq';
import type { Highlight } from '@quotekai/shared-types';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { purgeCloudflareCache } from '../lib/cloudflare';
import { log } from '../lib/logger';

const HIGHLIGHT_KEY = 'quotes:highlight';

export async function rotateHighlight(_job: Job): Promise<void> {
  log.info('rotate-highlight: starting');

  // 1. Pick a random quote from Postgres
  const count = await prisma.quote.count();
  if (count === 0) throw new Error('rotate-highlight: no quotes in database');

  const skip = Math.floor(Math.random() * count);
  const row = await prisma.quote.findFirst({ skip });
  if (!row) throw new Error('rotate-highlight: failed to fetch random quote');

  // 2. Write to Redis — no TTL, the worker is the source of truth for this key
  const payload: Highlight = {
    id: row.id,
    text: row.text,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
    setAt: new Date().toISOString(),
  };

  await redis.set(HIGHLIGHT_KEY, JSON.stringify(payload));

  // 3. Purge Cloudflare CDN cache so the next request gets the new highlight
  if (config.apiBaseUrl) {
    await purgeCloudflareCache([`${config.apiBaseUrl}/api/quotes/highlight`]);
  }

  log.info(
    { quoteId: payload.id, author: payload.author, setAt: payload.setAt },
    'rotate-highlight: done',
  );
}
