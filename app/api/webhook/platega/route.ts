import { apiError, apiOk } from "@/lib/http";
import { logger, serializeError } from "@/lib/server/logger";
import { logAdminAction } from "@/lib/services/admin-logs";
import { handlePlategaWebhook } from "@/lib/services/payments";

export async function POST(request: Request) {
  let targetId = "UNKNOWN";

  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as {
      id?: string;
      order_id?: string;
      status?: string;
      payment_id?: string;
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
      payload.transaction?.payload ??
      payload.transaction?.orderId ??
      payload.id ??
      payload.payment_id ??
      "UNKNOWN";
    const result = await handlePlategaWebhook({
      rawBody,
      signature:
        request.headers.get("x-signature") ?? request.headers.get("x-platega-signature"),
      secret: request.headers.get("x-secret"),
      merchantId: request.headers.get("x-merchantid") ?? request.headers.get("x-merchant-id"),
      payload
    });
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
}
