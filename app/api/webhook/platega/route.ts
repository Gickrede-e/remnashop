import { PaymentProvider } from "@prisma/client";
import { type NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/http";
import { isPaymentProviderEnabledFromEnv } from "@/lib/payments/provider-config";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { logger, serializeError } from "@/lib/server/logger";
import { getWebhookClientIp } from "@/lib/server/request-utils";
import { withApiLogging } from "@/lib/server/with-api-logging";
import { logAdminAction } from "@/lib/services/admin-logs";
import { handlePlategaWebhook } from "@/lib/services/payments";

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
    let targetId = "UNKNOWN";
    const ip = getWebhookClientIp(request);

    try {
      if (!isPaymentProviderEnabledFromEnv(PaymentProvider.PLATEGA)) {
        return apiError("Not found", 404);
      }

      if (isPayloadTooLarge(request)) {
        logger.warn("webhook.payload_too_large", {
          provider: "PLATEGA",
          limitBytes: WEBHOOK_BODY_LIMIT_BYTES
        });
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
          logger.warn("webhook.rate_limited", { provider: "PLATEGA" });
          return apiError("Too many requests", 429);
        }
        throw error;
      }

      const rawBody = await request.text();
      if (isPayloadTooLarge(request, rawBody)) {
        logger.warn("webhook.payload_too_large", {
          provider: "PLATEGA",
          limitBytes: WEBHOOK_BODY_LIMIT_BYTES
        });
        return apiError("Payload too large", 413);
      }

      const payload = JSON.parse(rawBody) as {
        id?: string;
        order_id?: string;
        payload?: string;
        status?: string;
        payment_id?: string;
        paymentMethod?: number;
        merchantId?: string;
        transaction?: {
          id?: string;
          status?: string;
          payload?: string;
          orderId?: string;
          merchantId?: string;
          mechantId?: string;
        };
      };
      targetId =
        payload.order_id ??
        payload.payload ??
        payload.transaction?.payload ??
        payload.transaction?.orderId ??
        payload.id ??
        payload.payment_id ??
        "UNKNOWN";
      const result = await handlePlategaWebhook({ payload });
      return apiOk(result);
    } catch (error) {
      await logAdminAction({
        action: "PAYMENT_WEBHOOK_ERROR",
        targetType: "PAYMENT",
        targetId,
        details: {
          provider: "PLATEGA",
          message: error instanceof Error ? error.message : "Platega webhook failed"
        }
      }).catch(() => null);
      logger.error("webhook.failed", {
        provider: "PLATEGA",
        paymentId: targetId,
        error: serializeError(error)
      });
      return apiError(error instanceof Error ? error.message : "Platega webhook failed", 400);
    }
  });
}
