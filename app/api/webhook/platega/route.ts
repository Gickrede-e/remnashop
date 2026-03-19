import { apiError, apiOk } from "@/lib/http";
import { handlePlategaWebhook } from "@/lib/services/payments";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as {
      order_id?: string;
      status?: string;
      payment_id?: string;
    };
    const result = await handlePlategaWebhook({
      rawBody,
      signature:
        request.headers.get("x-signature") ?? request.headers.get("x-platega-signature"),
      payload
    });
    return apiOk(result);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Platega webhook failed", 400);
  }
}
