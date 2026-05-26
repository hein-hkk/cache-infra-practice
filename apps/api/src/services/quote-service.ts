import type { Quote, Highlight } from '@quotekai/shared-types';

export async function getAllQuotes(): Promise<Quote[]> {
  // TODO: cache-aside — check Redis quotes:all (TTL 1800s), fallback to Postgres, write Redis
  return [];
}

export async function getHighlightQuote(): Promise<Highlight | null> {
  // TODO: read-through Redis quotes:highlight; if empty, pick random from Postgres and store
  return null;
}
