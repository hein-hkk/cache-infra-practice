import { createApiClient } from '@quotekai/api-client';

// API_BASE_URL is server-only — never prefix with NEXT_PUBLIC_
const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001';

export const api = createApiClient(baseUrl);
