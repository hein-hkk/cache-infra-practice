import type { Job } from 'bullmq';
import pino from 'pino';

const log = pino({ name: 'rotate-highlight' });

export async function rotateHighlight(_job: Job): Promise<void> {
  log.info('rotate-highlight: starting');
  // TODO: pick random quote from Postgres
  // TODO: write { id, text, author, setAt } to Redis quotes:highlight (no TTL)
  // TODO: purge Cloudflare cache for /api/quotes/highlight
  log.info('rotate-highlight: done');
}
