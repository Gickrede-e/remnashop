import { PromoCodeType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getPromoByCode(code: string) {
  return prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() }
  });
}

export async function getPromoById(id: string) {
  return prisma.promoCode.findUnique({
    where: { id }
  });
}

export async function listPromoCodes() {
  return prisma.promoCode.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
  });
}

export const listPromos = listPromoCodes;

export async function validatePromoCode(input: {
  code: string;
  planId: string;
  userId?: string;
  amount: number;
}) {
  const promo = await getPromoByCode(input.code);
  if (!promo || !promo.isActive) {
    throw new Error("Промокод не найден или выключен");
  }

  const now = new Date();
  if (promo.startsAt > now) {
    throw new Error("Промокод ещё не активен");
  }

  if (promo.expiresAt && promo.expiresAt < now) {
    throw new Error("Срок действия промокода истёк");
  }

  if (promo.maxUsages && promo.currentUsages >= promo.maxUsages) {
    throw new Error("Лимит использований промокода исчерпан");
  }

  if (promo.minAmount && input.amount < promo.minAmount) {
    throw new Error("Сумма заказа меньше минимальной для промокода");
  }

  if (promo.applicablePlanIds.length && !promo.applicablePlanIds.includes(input.planId)) {
    throw new Error("Промокод не применяется к выбранному тарифу");
  }

  if (input.userId) {
    const usageCount = await prisma.payment.count({
      where: {
        userId: input.userId,
        promoCodeId: promo.id,
        status: "SUCCEEDED"
      }
    });

    if (usageCount >= promo.maxUsagesPerUser) {
      throw new Error("Промокод уже использован максимальное число раз");
    }
  }

  const outcome = calculatePromoOutcome(promo.type, promo.value, input.amount);

  return {
    promo,
    ...outcome
  };
}

export function calculatePromoOutcome(
  type: PromoCodeType,
  value: number,
  amount: number
) {
  switch (type) {
    case "DISCOUNT_PERCENT": {
      const discountAmount = Math.floor((amount * value) / 100);
      return {
        finalAmount: Math.max(0, amount - discountAmount),
        discountAmount,
        bonusDays: 0,
        bonusTrafficGb: 0
      };
    }
    case "DISCOUNT_FIXED": {
      const discountAmount = Math.min(amount, value);
      return {
        finalAmount: Math.max(0, amount - discountAmount),
        discountAmount,
        bonusDays: 0,
        bonusTrafficGb: 0
      };
    }
    case "FREE_DAYS":
      return {
        finalAmount: amount,
        discountAmount: 0,
        bonusDays: value,
        bonusTrafficGb: 0
      };
    case "FREE_TRAFFIC_GB":
      return {
        finalAmount: amount,
        discountAmount: 0,
        bonusDays: 0,
        bonusTrafficGb: value
      };
  }
}

export async function registerPromoUsage(input: {
  promoCodeId: string;
  userId: string;
  paymentId: string;
}) {
  return prisma.promoUsage.create({
    data: input
  });
}

export async function markPromoUsageSucceeded(promoCodeId: string) {
  return prisma.promoCode.update({
    where: { id: promoCodeId },
    data: {
      currentUsages: {
        increment: 1
      }
    }
  });
}

export async function createPromo(input: {
  code: string;
  type: PromoCodeType;
  value: number;
  maxUsages?: number | null;
  maxUsagesPerUser: number;
  minAmount?: number | null;
  applicablePlanIds: string[];
  startsAt?: string;
  expiresAt?: string | null;
  isActive: boolean;
}) {
  return prisma.promoCode.create({
    data: {
      code: input.code,
      type: input.type,
      value: input.value,
      maxUsages: input.maxUsages ?? null,
      maxUsagesPerUser: input.maxUsagesPerUser,
      minAmount: input.minAmount ?? null,
      applicablePlanIds: input.applicablePlanIds,
      startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive
    }
  });
}

export async function updatePromo(
  id: string,
  input: {
    code: string;
    type: PromoCodeType;
    value: number;
    maxUsages?: number | null;
    maxUsagesPerUser: number;
    minAmount?: number | null;
    applicablePlanIds: string[];
    startsAt?: string;
    expiresAt?: string | null;
    isActive: boolean;
  }
) {
  return prisma.promoCode.update({
    where: { id },
    data: {
      code: input.code,
      type: input.type,
      value: input.value,
      maxUsages: input.maxUsages ?? null,
      maxUsagesPerUser: input.maxUsagesPerUser,
      minAmount: input.minAmount ?? null,
      applicablePlanIds: input.applicablePlanIds,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive
    }
  });
}

export async function deactivatePromo(id: string) {
  return prisma.promoCode.update({
    where: { id },
    data: { isActive: false }
  });
}

export const softDeletePromo = deactivatePromo;
