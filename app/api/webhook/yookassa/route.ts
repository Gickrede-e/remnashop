import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { logger, serializeError } from "@/lib/server/logger";
import { logAdminAction } from "@/lib/services/admin-logs";
import { WebhookAuthorizationError, handleYookassaWebhook } from "@/lib/services/payments";

const yookassaWebhookSchema = z.object({
  object: z
    .object({
      id: z.string().optional(),
      status: z.string().optional(),
      metadata: z.record(z.string(), z.string()).optional()
    })
    .optional()
});

function getProvidedSecret(request: NextRequest) {
  const headerSecret = request.headers.get("x-webhook-secret")?.trim();
  if (headerSecret) {
    return headerSecret;
  }

  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() || null;
}

export async function POST(request: NextRequest) {
  let remoteId = "UNKNOWN";

  try {
    const payload = await parseRequestBody(request, yookassaWebhookSchema);
    remoteId = payload.object?.id ?? "UNKNOWN";

    const result = await handleYookassaWebhook({
      ip: getClientIp(request),
      providedSecret: getProvidedSecret(request),
      event: payload
    });
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "YooKassa webhook failed";

    await logAdminAction({
      action: "PAYMENT_WEBHOOK_ERROR",
      targetType: "PAYMENT",
      targetId: remoteId,
      details: {
        provider: "YOOKASSA",
        message
      }
    }).catch(() => null);

    if (error instanceof WebhookAuthorizationError) {
      logger.warn("webhook.unauthorized", {
        provider: "YOOKASSA",
        paymentId: remoteId,
        error: message
      });
      return apiError(message, 401);
    }

    logger.error("webhook.failed", {
      provider: "YOOKASSA",
      paymentId: remoteId,
      error: serializeError(error)
    });
    return apiError(message, 400);
  }
}
