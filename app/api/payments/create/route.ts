import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { paymentCreateSchema } from "@/lib/schemas/payments";
import { createPaymentForUser } from "@/lib/services/payments";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
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
