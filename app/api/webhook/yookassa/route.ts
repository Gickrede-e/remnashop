import { type NextRequest } from "next/server";

import { apiError, apiOk, getClientIp } from "@/lib/http";
import { handleYookassaWebhook } from "@/lib/services/payments";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      object?: {
        id?: string;
        status?: string;
        metadata?: Record<string, string>;
      };
    };

    const result = await handleYookassaWebhook({
      ip: getClientIp(request),
      secret: request.nextUrl.searchParams.get("secret"),
      event: payload
    });
    return apiOk(result);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "YooKassa webhook failed", 400);
  }
}
