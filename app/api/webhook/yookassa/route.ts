import { type NextRequest } from "next/server";

import { apiError, apiOk, getClientIp } from "@/lib/http";
import { logAdminAction } from "@/lib/services/admin-logs";
import { handleYookassaWebhook } from "@/lib/services/payments";

export async function POST(request: NextRequest) {
  let remoteId = "UNKNOWN";

  try {
    const payload = (await request.json()) as {
      object?: {
        id?: string;
        status?: string;
        metadata?: Record<string, string>;
      };
    };
    remoteId = payload.object?.id ?? "UNKNOWN";

    const result = await handleYookassaWebhook({
      ip: getClientIp(request),
      secret: request.nextUrl.searchParams.get("secret"),
      event: payload
    });
    return apiOk(result);
  } catch (error) {
    await logAdminAction({
      action: "PAYMENT_WEBHOOK_ERROR",
      targetType: "PAYMENT",
      targetId: remoteId,
      details: {
        provider: "YOOKASSA",
        message: error instanceof Error ? error.message : "YooKassa webhook failed"
      }
    }).catch(() => null);
    console.error("[webhook:yookassa] failed", error);
    return apiError(error instanceof Error ? error.message : "YooKassa webhook failed", 400);
  }
}
