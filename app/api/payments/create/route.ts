import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { paymentCreateSchema } from "@/lib/schemas/payments";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { createPaymentForUser } from "@/lib/services/payments";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();

    try {
      enforceRateLimit({
        key: `payment-create:${session.userId}`,
        max: 5,
        windowMs: 60_000
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return apiError("Слишком много попыток оплаты. Попробуйте через минуту.", 429);
      }
      throw error;
    }

    const body = await parseRequestBody(request, paymentCreateSchema);
    const payment = await createPaymentForUser({
      userId: session.userId,
      ...body
    });

    return apiOk({
      paymentId: payment.id,
      redirectUrl: payment.confirmationUrl
    });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return apiError(error instanceof Error ? error.message : "Не удалось создать платёж", status);
  }
}
