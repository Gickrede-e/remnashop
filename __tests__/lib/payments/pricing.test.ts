import { describe, expect, it } from "vitest";

import {
  calculateDurationPricing,
  getDurationDiscountPercent,
  normalizePaymentMonths
} from "@/lib/payments/pricing";

describe("payment pricing helpers", () => {
  it("normalizes months into the supported payment range", () => {
    expect(normalizePaymentMonths(undefined)).toBe(1);
    expect(normalizePaymentMonths(0)).toBe(1);
    expect(normalizePaymentMonths(13)).toBe(12);
    expect(normalizePaymentMonths(6.8)).toBe(6);
  });

  it("returns the configured automatic discount percent by duration", () => {
    expect(getDurationDiscountPercent(1)).toBe(0);
    expect(getDurationDiscountPercent(2)).toBe(0);
    expect(getDurationDiscountPercent(3)).toBe(5);
    expect(getDurationDiscountPercent(6)).toBe(10);
    expect(getDurationDiscountPercent(12)).toBe(15);
  });

  it("calculates discounted totals and monthly price for long durations", () => {
    expect(calculateDurationPricing(20000, 3)).toEqual({
      months: 3,
      baseAmount: 60000,
      durationDiscountPercent: 5,
      durationDiscountAmount: 3000,
      subtotalAmount: 57000,
      effectiveMonthlyAmount: 19000
    });

    expect(calculateDurationPricing(20000, 6)).toEqual({
      months: 6,
      baseAmount: 120000,
      durationDiscountPercent: 10,
      durationDiscountAmount: 12000,
      subtotalAmount: 108000,
      effectiveMonthlyAmount: 18000
    });

    expect(calculateDurationPricing(20000, 12)).toEqual({
      months: 12,
      baseAmount: 240000,
      durationDiscountPercent: 15,
      durationDiscountAmount: 36000,
      subtotalAmount: 204000,
      effectiveMonthlyAmount: 17000
    });
  });

  it("leaves unsupported durations without an automatic discount", () => {
    expect(calculateDurationPricing(20000, 4)).toEqual({
      months: 4,
      baseAmount: 80000,
      durationDiscountPercent: 0,
      durationDiscountAmount: 0,
      subtotalAmount: 80000,
      effectiveMonthlyAmount: 20000
    });
  });
});
