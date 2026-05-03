import { PromoCodeType, PromoUsageStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class PromoLimitExceededError extends Error {
  constructor(message = "Лимит использований промокода исчерпан") {
    super(message);
    this.name = "PromoLimitExceededError";
  }
}

type DbClient = typeof prisma | Parameters<Parameters<typeof prisma["$transaction"]>[0]>[0];

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

  if (promo.maxUsages != null) {
    const liveUsages = await prisma.promoUsage.count({
      where: {
        promoCodeId: promo.id,
        status: { not: PromoUsageStatus.FAILED }
      }
    });
    if (liveUsages >= promo.maxUsages) {
      throw new PromoLimitExceededError();
    }
  }

  if (promo.minAmount && input.amount < promo.minAmount) {
    throw new Error("Сумма заказа меньше минимальной для промокода");
  }

  if (promo.applicablePlanIds.length && !promo.applicablePlanIds.includes(input.planId)) {
    throw new Error("Промокод не применяется к выбранному тарифу");
  }

  if (input.userId) {
    const liveUserUsages = await prisma.promoUsage.count({
      where: {
        promoCodeId: promo.id,
        userId: input.userId,
        status: { not: PromoUsageStatus.FAILED }
      }
    });

    if (liveUserUsages >= promo.maxUsagesPerUser) {
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

// Atomically reserves a slot in the promo counter and creates a PENDING PromoUsage row.
// Throws PromoLimitExceededError if maxUsages is reached. Race-safe.
export async function registerPromoUsage(input: {
  promoCodeId: string;
  userId: string;
  paymentId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const reserved = await tx.$executeRaw`
      UPDATE "promo_codes"
      SET "currentUsages" = "currentUsages" + 1
      WHERE "id" = ${input.promoCodeId}
        AND ("maxUsages" IS NULL OR "currentUsages" < "maxUsages")
    `;
    if (reserved === 0) {
      throw new PromoLimitExceededError();
    }
    return tx.promoUsage.create({
      data: {
        promoCodeId: input.promoCodeId,
        userId: input.userId,
        paymentId: input.paymentId,
        status: PromoUsageStatus.PENDING
      }
    });
  });
}

// Promotes the PENDING PromoUsage row for this payment to SUCCEEDED.
// Idempotent: re-runs are no-ops. Counter NOT touched (already incremented at registration).
export async function markPromoUsageSucceeded(paymentId: string, db: DbClient = prisma) {
  return db.promoUsage.updateMany({
    where: { paymentId, status: PromoUsageStatus.PENDING },
    data: { status: PromoUsageStatus.SUCCEEDED }
  });
}

// Rolls back a reserved promo slot when activation ultimately failed.
// Marks PromoUsage as FAILED and decrements the counter atomically.
export async function failPromoUsage(paymentId: string, db: DbClient = prisma) {
  return db.$transaction(async (tx) => {
    const usages = await tx.promoUsage.findMany({
      where: { paymentId, status: PromoUsageStatus.PENDING },
      select: { id: true, promoCodeId: true }
    });
    if (!usages.length) {
      return { count: 0 };
    }
    for (const usage of usages) {
      await tx.promoUsage.update({
        where: { id: usage.id },
        data: { status: PromoUsageStatus.FAILED }
      });
      await tx.$executeRaw`
        UPDATE "promo_codes"
        SET "currentUsages" = GREATEST("currentUsages" - 1, 0)
        WHERE "id" = ${usage.promoCodeId}
      `;
    }
    return { count: usages.length };
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
