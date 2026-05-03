import { type NextRequest } from "next/server";

// Trust ONLY X-Real-IP, set by our Caddy reverse proxy (Caddyfile:
// header_up X-Real-IP {remote_host}). X-Forwarded-For is rejected because external
// clients can spoof it; trusting it would let attackers bypass IP allowlists and
// rate-limits keyed on IP. Caddy must be configured with `trusted_proxies private_ranges`
// (Caddyfile global servers block) so it doesn't forward client-supplied X-Real-IP.
export function getClientIp(request: NextRequest): string {
  return request.headers.get("x-real-ip")?.trim() ?? "";
}

export function getWebhookClientIp(request: NextRequest): string {
  return getClientIp(request);
}
