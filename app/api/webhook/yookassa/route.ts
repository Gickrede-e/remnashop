import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { logger, serializeError } from "@/lib/server/logger";
import { logAdminAction } from "@/lib/services/admin-logs";
import {
  WebhookDropSilentlyError,
  WebhookIntegrityError,
  WebhookIpForbiddenError,
  handleYookassaWebhook
} from "@/lib/services/payments";

const yookassaWebhookSchema = z.object({
  object: z.object({
    id: z.string().min(1),
    status: z.string().optional(),
    metadata: z
      .object({
        paymentId: z.string().min(1)
      })
      .passthrough()
  })
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  let remoteId = "UNKNOWN";

  try {
    try {
      // Initial tuning, adjust based on real traffic.
      enforceRateLimit({
        key: `webhook:yookassa:${ip || "unknown"}`,
        max: 30,
        windowMs: 60_000
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        logger.warn("webhook.rate_limited", { provider: "YOOKASSA", ip });
        return apiOk({ accepted: true });
      }

      throw error;
    }

    let payload: z.infer<typeof yookassaWebhookSchema>;
    try {
      payload = await parseRequestBody(request, yookassaWebhookSchema);
    } catch {
      throw new WebhookDropSilentlyError("invalid body");
    }
    remoteId = payload.object.id;

    const result = await handleYookassaWebhook({
      ip,
      event: payload
    });
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "YooKassa webhook failed";

    if (error instanceof WebhookIpForbiddenError) {
      logger.warn("webhook.ip_forbidden", {
        provider: "YOOKASSA",
        ip,
        paymentId: remoteId
      });
      return apiOk({ accepted: true });
    }

    if (error instanceof WebhookDropSilentlyError) {
      logger.warn("webhook.dropped", {
        provider: "YOOKASSA",
        ip,
        paymentId: remoteId,
        reason: message
      });
      return apiOk({ accepted: true });
    }

    if (error instanceof WebhookIntegrityError) {
      logger.error("webhook.integrity", {
        provider: "YOOKASSA",
        ip,
        paymentId: remoteId,
        reason: message
      });
      await logAdminAction({
        action: "PAYMENT_WEBHOOK_INTEGRITY",
        targetType: "PAYMENT",
        targetId: remoteId,
        details: { provider: "YOOKASSA", ip, reason: message }
      }).catch(() => null);
      return apiOk({ accepted: true });
    }

    await logAdminAction({
      action: "PAYMENT_WEBHOOK_ERROR",
      targetType: "PAYMENT",
      targetId: remoteId,
      details: { provider: "YOOKASSA", message }
    }).catch(() => null);

    logger.error("webhook.failed", {
      provider: "YOOKASSA",
      paymentId: remoteId,
      error: serializeError(error)
    });
    return apiOk({ accepted: true });
  }
}
