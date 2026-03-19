import { type NextRequest } from "next/server";

import { apiError, apiOk, assertCronSecret } from "@/lib/http";
import { expireStaleSubscriptions } from "@/lib/services/subscriptions";

export async function POST(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return apiError("Invalid cron secret", 401);
  }

  try {
    const expiredCount = await expireStaleSubscriptions();
    return apiOk({ expiredCount });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Cron sync failed", 500);
  }
}
