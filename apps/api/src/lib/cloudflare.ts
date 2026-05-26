// Purges Cloudflare CDN cache for the given URLs via the Cache Purge API.
// Only meaningful in production — zone ID and token are left blank in dev.
export async function purgeCloudflareCache(_urls: string[]): Promise<void> {
  // TODO: POST https://api.cloudflare.com/client/v4/zones/{zoneId}/purge_cache
}
