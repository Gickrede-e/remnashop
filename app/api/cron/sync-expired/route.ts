import { type NextRequest } from "next/server";

import { apiError, apiOk, assertCronSecret } from "@/lib/http";
import { logger, serializeError } from "@/lib/server/logger";
import { expireStaleSubscriptions } from "@/lib/services/subscription-cron";
import { retryPendingActivations } from "@/lib/services/payment-activation";

export async function POST(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return apiError("Invalid cron secret", 401);
  }

  try {
    const expiredCount = await expireStaleSubscriptions();
    // Also recover "paid but Remnawave provisioning failed" payments. Isolated so a
    // failure here is logged but doesn't mask the expiry result.
    const provisioning = await retryPendingActivations().catch((error) => {
      logger.error("cron.provision_retry_failed", { error: serializeError(error) });
      return { attempted: 0, recovered: 0 };
    });
    return apiOk({
      expiredCount,
      provisioningRetried: provisioning.attempted,
      provisioningRecovered: provisioning.recovered
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Cron sync failed", 500);
  }
}
