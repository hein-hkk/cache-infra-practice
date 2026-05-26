import { config } from '../config';

// Purges Cloudflare CDN cache for the given URLs.
// No-ops silently when zone ID or token are missing (dev environment).
export async function purgeCloudflareCache(urls: string[]): Promise<void> {
  if (!config.cloudflare.zoneId || !config.cloudflare.apiToken) return;
  // TODO: POST https://api.cloudflare.com/client/v4/zones/{zoneId}/purge_cache
}
