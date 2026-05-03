import { type NextRequest } from "next/server";

import { apiError, assertCronSecret } from "@/lib/http";
import { getMetricsContentType, renderMetrics } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

// Prometheus scrape endpoint. Auth-gated by CRON_SECRET so only the internal
// scraper (Prometheus, Grafana Agent, etc.) can read metrics — they include
// rate-limit-key fragments and other operational signal we don't want public.
export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return apiError("Invalid cron secret", 401);
  }

  const body = await renderMetrics();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": getMetricsContentType(),
      "Cache-Control": "no-store"
    }
  });
}
