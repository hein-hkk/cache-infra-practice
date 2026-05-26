import type { Quote, Highlight } from '@quotekai/shared-types';

export interface QuotesResponse {
  quotes: Quote[];
  count: number;
}

export interface HighlightResponse {
  quote: Highlight | null;
  highlightSetAt: string | null;
  fallback?: boolean;
}

export interface StatsResponse {
  timestamp: string;
  database: { status: string };
  redis: { status: string };
  uptime: number;
}

export function createApiClient(baseUrl: string = 'http://localhost:3001') {
  async function request<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`);
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  return {
    getQuotes: () => request<QuotesResponse>('/api/quotes'),
    getHighlight: () => request<HighlightResponse>('/api/quotes/highlight'),
    getStats: () => request<StatsResponse>('/api/stats'),
  };
}
