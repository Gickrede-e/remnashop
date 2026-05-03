import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { calculateDurationPricing, normalizePaymentMonths } from "@/lib/payments/pricing";
import { promoValidateSchema } from "@/lib/schemas/payments";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { validatePromoCode } from "@/lib/services/promos";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();

    try {
      enforceRateLimit({
        key: `promo-validate:${session.userId}`,
        max: 30,
        windowMs: 60_000
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return apiError("Слишком много проверок промокода. Попробуйте позже.", 429);
      }
      throw error;
    }

    const body = await parseRequestBody(request, promoValidateSchema);
    const plan = await prisma.plan.findUnique({
      where: { id: body.planId }
    });

    if (!plan) {
      return apiError("Тариф не найден", 404);
    }

    const months = normalizePaymentMonths(body.months);
    const durationPricing = calculateDurationPricing(plan.price, months);
    const result = await validatePromoCode({
      code: body.code,
      planId: body.planId,
      userId: session.userId,
      amount: durationPricing.subtotalAmount
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
