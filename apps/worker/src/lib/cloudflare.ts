import { config } from '../config';

// Purges Cloudflare CDN cache for the given URLs.
// Silently no-ops when zone ID or token are missing (dev environment).
export async function purgeCloudflareCache(urls: string[]): Promise<void> {
  if (!config.cloudflare.zoneId || !config.cloudflare.apiToken) return;

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/purge_cache`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.cloudflare.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudflare purge failed: ${res.status} ${body}`);
  }
}
