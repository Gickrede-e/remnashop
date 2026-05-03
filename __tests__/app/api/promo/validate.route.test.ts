import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiSession, mockPrisma, mockValidatePromoCode } = vi.hoisted(() => ({
  mockRequireApiSession: vi.fn(),
  mockPrisma: {
    plan: {
      findUnique: vi.fn()
    }
  },
  mockValidatePromoCode: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiSession: mockRequireApiSession
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("@/lib/services/promos", () => ({
  validatePromoCode: mockValidatePromoCode
}));

import { POST } from "@/app/api/promo/validate/route";

describe("POST /api/promo/validate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("validates promo codes against the subtotal after the duration discount", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: "plan-1",
      price: 20000
    });
    mockValidatePromoCode.mockResolvedValue({
      promo: {
        code: "SALE10",
        type: "DISCOUNT_PERCENT",
        value: 10
      },
      finalAmount: 51300,
      discountAmount: 5700,
      bonusDays: 0,
      bonusTrafficGb: 0
    });

    const response = await POST(
      new Request("http://localhost/api/promo/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: "sale10",
          planId: "plan-1",
          months: 3
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.finalAmount).toBe(51300);
    expect(mockValidatePromoCode).toHaveBeenCalledWith({
      code: "SALE10",
      planId: "plan-1",
      userId: "user-1",
      amount: 57000
    });
  });
});
