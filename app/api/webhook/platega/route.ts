import { PaymentProvider } from "@prisma/client";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/http";
import { isPaymentProviderEnabledFromEnv } from "@/lib/payments/provider-config";
import { getMetrics } from "@/lib/server/metrics";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { logger, serializeError } from "@/lib/server/logger";
import { getWebhookClientIp } from "@/lib/server/request-utils";
import { withApiLogging } from "@/lib/server/with-api-logging";
import { logAdminAction } from "@/lib/services/admin-logs";
import { WebhookDropSilentlyError, WebhookIntegrityError, handlePlategaWebhook } from "@/lib/services/payments";
import { verifyPlategaCallbackHeaders } from "@/lib/services/platega";

const plategaCallbackSchema = z.object({
  id: z.string().min(1),
  payload: z.string().min(1).optional()
});

const WEBHOOK_BODY_LIMIT_BYTES = 64 * 1024;

function isPayloadTooLarge(request: Request, rawBody?: string) {
  const contentLength = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isFinite(contentLength) && contentLength > WEBHOOK_BODY_LIMIT_BYTES) {
    return true;
  }

  return rawBody !== undefined && Buffer.byteLength(rawBody, "utf8") > WEBHOOK_BODY_LIMIT_BYTES;
}

export async function POST(request: NextRequest) {
  return withApiLogging(request, async () => {
    const ip = getWebhookClientIp(request);
    let remoteId = "UNKNOWN";

    try {
      if (!isPaymentProviderEnabledFromEnv(PaymentProvider.PLATEGA)) {
        return apiError("Not found", 404);
      }

      if (isPayloadTooLarge(request)) {
        getMetrics().webhookRejected.inc({ provider: "PLATEGA", reason: "payload_too_large" });
        logger.warn("webhook.payload_too_large", { provider: "PLATEGA", limitBytes: WEBHOOK_BODY_LIMIT_BYTES });
        return apiError("Payload too large", 413);
      }

      try {
        enforceRateLimit({
          key: `webhook:platega:${ip || "unknown"}`,
          max: 30,
          windowMs: 60_000
        });
      } catch (error) {
        if (error instanceof RateLimitExceededError) {
          getMetrics().webhookRejected.inc({ provider: "PLATEGA", reason: "rate_limited" });
          logger.warn("webhook.rate_limited", { provider: "PLATEGA" });
          return apiError("Too many requests", 429);
        }

        throw error;
      }

      if (!verifyPlategaCallbackHeaders(request.headers)) {
        getMetrics().webhookRejected.inc({ provider: "PLATEGA", reason: "unauthorized" });
        logger.warn("webhook.unauthorized", { provider: "PLATEGA" });
        return apiError("Unauthorized", 401);
      }

      getMetrics().webhookReceived.inc({ provider: "PLATEGA" });

      let callback: z.infer<typeof plategaCallbackSchema>;
      try {
        const rawBody = await request.text();
        if (isPayloadTooLarge(request, rawBody)) {
          logger.warn("webhook.payload_too_large", { provider: "PLATEGA", limitBytes: WEBHOOK_BODY_LIMIT_BYTES });
          return apiError("Payload too large", 413);
        }

        callback = plategaCallbackSchema.parse(rawBody ? (JSON.parse(rawBody) as unknown) : null);
      } catch {
        throw new WebhookDropSilentlyError("invalid body");
      }
      remoteId = callback.id;

      const result = await handlePlategaWebhook({ callback });
      return apiOk(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Platega webhook failed";

      if (error instanceof WebhookDropSilentlyError) {
        getMetrics().webhookRejected.inc({ provider: "PLATEGA", reason: "dropped" });
        logger.warn("webhook.dropped", { provider: "PLATEGA", paymentId: remoteId, reason: message });
        return apiOk({ accepted: true });
      }

      if (error instanceof WebhookIntegrityError) {
        getMetrics().webhookRejected.inc({ provider: "PLATEGA", reason: "integrity" });
        logger.error("webhook.integrity", { provider: "PLATEGA", paymentId: remoteId, reason: message });
        await logAdminAction({
          action: "PAYMENT_WEBHOOK_INTEGRITY",
          targetType: "PAYMENT",
          targetId: remoteId,
          details: { provider: "PLATEGA", ip, reason: message }
        }).catch(() => null);
        return apiOk({ accepted: true });
      }

      await logAdminAction({
        action: "PAYMENT_WEBHOOK_ERROR",
        targetType: "PAYMENT",
        targetId: remoteId,
        details: { provider: "PLATEGA", message }
      }).catch(() => null);

      logger.error("webhook.failed", {
        provider: "PLATEGA",
        paymentId: remoteId,
        error: serializeError(error)
      });
      return apiError("Temporarily unavailable", 503);
    }
  });
}
