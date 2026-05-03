export type DurationPricing = {
  months: number;
  baseAmount: number;
  durationDiscountPercent: number;
  durationDiscountAmount: number;
  subtotalAmount: number;
  effectiveMonthlyAmount: number;
};

export function normalizePaymentMonths(months?: number) {
  return Math.max(1, Math.min(12, Math.floor(months ?? 1)));
}

export function getDurationDiscountPercent(months: number) {
  switch (normalizePaymentMonths(months)) {
    case 3:
      return 5;
    case 6:
      return 10;
    case 12:
      return 15;
    default:
      return 0;
  }
}

export function calculateEffectiveMonthlyAmount(totalAmount: number, months: number) {
  const normalizedMonths = normalizePaymentMonths(months);
  return totalAmount / normalizedMonths;
}

export function calculateDurationPricing(monthlyPrice: number, months: number): DurationPricing {
  const normalizedMonths = normalizePaymentMonths(months);
  const normalizedMonthlyPrice = Math.max(0, Math.floor(monthlyPrice));
  const baseAmount = normalizedMonthlyPrice * normalizedMonths;
  const durationDiscountPercent = getDurationDiscountPercent(normalizedMonths);
  const durationDiscountAmount = Math.floor((baseAmount * durationDiscountPercent) / 100);
  const subtotalAmount = Math.max(0, baseAmount - durationDiscountAmount);

  return {
    months: normalizedMonths,
    baseAmount,
    durationDiscountPercent,
    durationDiscountAmount,
    subtotalAmount,
    effectiveMonthlyAmount: calculateEffectiveMonthlyAmount(subtotalAmount, normalizedMonths)
  };
}
