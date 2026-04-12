import { PaymentProvider } from "@prisma/client";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk, getClientIp } from "@/lib/http";
import { isPaymentProviderEnabledFromEnv } from "@/lib/payments/provider-config";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { logger, serializeError } from "@/lib/server/logger";
import { withApiLogging } from "@/lib/server/with-api-logging";
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

const WEBHOOK_BODY_LIMIT_BYTES = 64 * 1024;

function isPayloadTooLarge(request: Request, rawBody?: string) {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(contentLength) && contentLength > WEBHOOK_BODY_LIMIT_BYTES) {
    return true;
  }

  if (rawBody) {
    return Buffer.byteLength(rawBody, "utf8") > WEBHOOK_BODY_LIMIT_BYTES;
  }

  return false;
}

export async function POST(request: NextRequest) {
  return withApiLogging(request, async () => {
    const ip = getClientIp(request);
    let remoteId = "UNKNOWN";

    try {
      if (!isPaymentProviderEnabledFromEnv(PaymentProvider.YOOKASSA)) {
        return apiError("Not found", 404);
      }

      if (isPayloadTooLarge(request)) {
        logger.warn("webhook.payload_too_large", {
          provider: "YOOKASSA",
          limitBytes: WEBHOOK_BODY_LIMIT_BYTES
        });
        return apiError("Payload too large", 413);
      }

      try {
        // Initial tuning, adjust based on real traffic.
        enforceRateLimit({
          key: `webhook:yookassa:${ip || "unknown"}`,
          max: 30,
          windowMs: 60_000
        });
      } catch (error) {
        if (error instanceof RateLimitExceededError) {
          logger.warn("webhook.rate_limited", { provider: "YOOKASSA" });
          return apiOk({ accepted: true });
        }

        throw error;
      }

      let payload: z.infer<typeof yookassaWebhookSchema>;
      try {
        const rawBody = await request.text();
        if (isPayloadTooLarge(request, rawBody)) {
          logger.warn("webhook.payload_too_large", {
            provider: "YOOKASSA",
            limitBytes: WEBHOOK_BODY_LIMIT_BYTES
          });
          return apiError("Payload too large", 413);
        }

        const json = rawBody ? (JSON.parse(rawBody) as unknown) : null;
        payload = yookassaWebhookSchema.parse(json);
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
          paymentId: remoteId
        });
        return apiOk({ accepted: true });
      }

      if (error instanceof WebhookDropSilentlyError) {
        logger.warn("webhook.dropped", {
          provider: "YOOKASSA",
          paymentId: remoteId,
          reason: message
        });
        return apiOk({ accepted: true });
      }

      if (error instanceof WebhookIntegrityError) {
        logger.error("webhook.integrity", {
          provider: "YOOKASSA",
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
  });
}
