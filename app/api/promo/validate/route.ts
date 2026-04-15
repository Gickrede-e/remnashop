import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { promoValidateSchema } from "@/lib/schemas/payments";
import { prisma } from "@/lib/prisma";
import { validatePromoCode } from "@/lib/services/promos";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const body = await parseRequestBody(request, promoValidateSchema);
    const plan = await prisma.plan.findUnique({
      where: { id: body.planId }
    });

    if (!plan) {
      return apiError("Тариф не найден", 404);
    }

    const result = await validatePromoCode({
      code: body.code,
      planId: body.planId,
      userId: session.userId,
      amount: plan.price * (body.months ?? 1)
    });

    return apiOk({
      promoCode: result.promo.code,
      type: result.promo.type,
      value: result.promo.value,
      finalAmount: result.finalAmount,
      discountAmount: result.discountAmount,
      bonusDays: result.bonusDays,
      bonusTrafficGb: result.bonusTrafficGb
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Промокод невалиден", 400);
  }
}
