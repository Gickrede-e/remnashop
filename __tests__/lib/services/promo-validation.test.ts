import { PromoCodeType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    promoCode: {
      findUnique: vi.fn()
    },
    payment: {
      count: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { validatePromoCode } from "@/lib/services/promos";

function createPromo(overrides: Partial<{
  id: string;
  code: string;
  type: typeof PromoCodeType[keyof typeof PromoCodeType];
  value: number;
  maxUsages: number | null;
  currentUsages: number;
  maxUsagesPerUser: number;
  minAmount: number | null;
  applicablePlanIds: string[];
  startsAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
}>) {
  return {
    id: "promo_1",
    code: "SALE10",
    type: PromoCodeType.DISCOUNT_PERCENT,
    value: 10,
    maxUsages: null,
    currentUsages: 0,
    maxUsagesPerUser: 1,
    minAmount: null,
    applicablePlanIds: [],
    startsAt: new Date("2024-01-01T00:00:00.000Z"),
    expiresAt: null,
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides
  };
}

describe("validatePromoCode", () => {
  beforeEach(() => {
    mockPrisma.promoCode.findUnique.mockReset();
    mockPrisma.payment.count.mockReset();
    mockPrisma.payment.count.mockResolvedValue(0);
  });

  it("throws when the promo code does not exist", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(null);

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      amount: 10000
    })).rejects.toThrow("Промокод не найден или выключен");
  });

  it("throws when the promo code is inactive", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(createPromo({ isActive: false }));

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      amount: 10000
    })).rejects.toThrow("Промокод не найден или выключен");
  });

  it("throws when the promo code has not started yet", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(createPromo({
      startsAt: new Date(Date.now() + 60_000)
    }));

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      amount: 10000
    })).rejects.toThrow("Промокод ещё не активен");
  });

  it("throws when the promo code is expired", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(createPromo({
      expiresAt: new Date(Date.now() - 60_000)
    }));

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      amount: 10000
    })).rejects.toThrow("Срок действия промокода истёк");
  });

  it("throws when max usages are exhausted", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(createPromo({
      maxUsages: 5,
      currentUsages: 5
    }));

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      amount: 10000
    })).rejects.toThrow("Лимит использований промокода исчерпан");
  });

  it("throws when the per-user limit is exhausted", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(createPromo({
      maxUsagesPerUser: 1
    }));
    mockPrisma.payment.count.mockResolvedValue(1);

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      userId: "user_1",
      amount: 10000
    })).rejects.toThrow("Промокод уже использован максимальное число раз");
  });

  it("throws when the promo code is not applicable to the selected plan", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(createPromo({
      applicablePlanIds: ["plan_2"]
    }));

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      amount: 10000
    })).rejects.toThrow("Промокод не применяется к выбранному тарифу");
  });

  it("throws when the minimum amount is not met", async () => {
    mockPrisma.promoCode.findUnique.mockResolvedValue(createPromo({
      minAmount: 15000
    }));

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      amount: 10000
    })).rejects.toThrow("Сумма заказа меньше минимальной для промокода");
  });

  it("returns promo data and the calculated outcome on success", async () => {
    const promo = createPromo({
      applicablePlanIds: ["plan_1"]
    });
    mockPrisma.promoCode.findUnique.mockResolvedValue(promo);

    await expect(validatePromoCode({
      code: "sale10",
      planId: "plan_1",
      userId: "user_1",
      amount: 10000
    })).resolves.toMatchObject({
      promo,
      finalAmount: 9000,
      discountAmount: 1000,
      bonusDays: 0,
      bonusTrafficGb: 0
    });

    expect(mockPrisma.promoCode.findUnique).toHaveBeenCalledWith({
      where: {
        code: "SALE10"
      }
    });
  });
});
