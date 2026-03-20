import { PromoCodeType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { calculatePromoOutcome } from "@/lib/services/promos";

describe("calculatePromoOutcome", () => {
  it("applies percent discounts", () => {
    expect(calculatePromoOutcome(PromoCodeType.DISCOUNT_PERCENT, 10, 10000)).toEqual({
      finalAmount: 9000,
      discountAmount: 1000,
      bonusDays: 0,
      bonusTrafficGb: 0
    });
  });

  it("never makes percent discounts negative", () => {
    expect(calculatePromoOutcome(PromoCodeType.DISCOUNT_PERCENT, 100, 10000).finalAmount).toBe(0);
  });

  it("applies fixed discounts", () => {
    expect(calculatePromoOutcome(PromoCodeType.DISCOUNT_FIXED, 500, 10000)).toEqual({
      finalAmount: 9500,
      discountAmount: 500,
      bonusDays: 0,
      bonusTrafficGb: 0
    });
  });

  it("caps fixed discounts at zero", () => {
    expect(calculatePromoOutcome(PromoCodeType.DISCOUNT_FIXED, 15000, 10000).finalAmount).toBe(0);
  });

  it("keeps amount unchanged for free day promos", () => {
    expect(calculatePromoOutcome(PromoCodeType.FREE_DAYS, 7, 10000)).toEqual({
      finalAmount: 10000,
      discountAmount: 0,
      bonusDays: 7,
      bonusTrafficGb: 0
    });
  });

  it("keeps amount unchanged for free traffic promos", () => {
    expect(calculatePromoOutcome(PromoCodeType.FREE_TRAFFIC_GB, 25, 10000)).toEqual({
      finalAmount: 10000,
      discountAmount: 0,
      bonusDays: 0,
      bonusTrafficGb: 25
    });
  });
});
