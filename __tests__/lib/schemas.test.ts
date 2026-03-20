import { PaymentProvider, PromoCodeType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { grantSubscriptionSchema } from "@/lib/schemas/admin";
import { loginSchema, registerSchema, telegramAuthSchema } from "@/lib/schemas/auth";
import { paymentCreateSchema, promoCreateSchema, promoValidateSchema } from "@/lib/schemas/payments";
import { planSchema } from "@/lib/schemas/plans";

function expectIssuePath(result: { success: boolean; error?: { issues: Array<{ path: unknown[] }> } }, path: unknown[]) {
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error?.issues[0]?.path).toEqual(path);
  }
}

describe("lib/schemas", () => {
  it("validates registerSchema", () => {
    expect(registerSchema.parse({
      email: "user@example.com",
      password: "password123"
    })).toMatchObject({
      email: "user@example.com",
      password: "password123"
    });

    expectIssuePath(registerSchema.safeParse({
      email: "bad-email",
      password: "password123"
    }), ["email"]);
    expectIssuePath(registerSchema.safeParse({
      email: "user@example.com",
      password: "short"
    }), ["password"]);
  });

  it("validates loginSchema", () => {
    expect(loginSchema.parse({
      email: "user@example.com",
      password: "password123"
    })).toMatchObject({
      email: "user@example.com",
      password: "password123"
    });

    expectIssuePath(loginSchema.safeParse({
      email: "bad-email",
      password: "password123"
    }), ["email"]);
    expectIssuePath(loginSchema.safeParse({
      email: "user@example.com",
      password: "short"
    }), ["password"]);
  });

  it("validates and transforms telegramAuthSchema", () => {
    const parsed = telegramAuthSchema.parse({
      id: 123456,
      first_name: "Test",
      username: "tester",
      auth_date: 1710000000,
      hash: "hash-value"
    });

    expect(parsed.id).toBe("123456");
    expect(parsed.auth_date).toBe("1710000000");

    expectIssuePath(telegramAuthSchema.safeParse({
      id: 1,
      auth_date: 1,
      hash: ""
    }), ["hash"]);
  });

  it("validates paymentCreateSchema", () => {
    expect(paymentCreateSchema.parse({
      planId: "plan_1",
      provider: PaymentProvider.YOOKASSA
    })).toMatchObject({
      planId: "plan_1",
      provider: PaymentProvider.YOOKASSA
    });

    expectIssuePath(paymentCreateSchema.safeParse({
      planId: "plan_1",
      provider: "INVALID"
    }), ["provider"]);
  });

  it("validates and transforms promoValidateSchema", () => {
    const parsed = promoValidateSchema.parse({
      planId: "plan_1",
      code: " sale "
    });

    expect(parsed.code).toBe("SALE");
    expectIssuePath(promoValidateSchema.safeParse({
      planId: "plan_1",
      code: ""
    }), ["code"]);
  });

  it("validates planSchema boundaries", () => {
    expect(planSchema.parse({
      slug: "pro-plan",
      name: "Pro",
      description: "VPN plan",
      durationDays: 30,
      trafficGB: 100,
      priceRubles: 299,
      highlight: null,
      remnawaveExternalSquadUuid: null,
      remnawaveInternalSquadUuids: [],
      remnawaveHwidDeviceLimit: null,
      sortOrder: 1,
      isActive: true
    })).toMatchObject({
      slug: "pro-plan",
      trafficGB: 100,
      priceRubles: 299
    });

    expectIssuePath(planSchema.safeParse({
      slug: "BAD SLUG",
      name: "Pro",
      durationDays: 30,
      trafficGB: 100,
      priceRubles: 299,
      remnawaveInternalSquadUuids: []
    }), ["slug"]);
    expectIssuePath(planSchema.safeParse({
      slug: "pro-plan",
      name: "Pro",
      durationDays: 30,
      trafficGB: 0,
      priceRubles: 299,
      remnawaveInternalSquadUuids: []
    }), ["trafficGB"]);
    expectIssuePath(planSchema.safeParse({
      slug: "pro-plan",
      name: "Pro",
      durationDays: 30,
      trafficGB: 100,
      priceRubles: 0,
      remnawaveInternalSquadUuids: []
    }), ["priceRubles"]);
  });

  it("coerces optional numbers in grantSubscriptionSchema", () => {
    const parsed = grantSubscriptionSchema.parse({
      userId: "user_1",
      planId: "plan_1",
      durationDays: "30",
      trafficGB: "120"
    });

    expect(parsed.durationDays).toBe(30);
    expect(parsed.trafficGB).toBe(120);
    expectIssuePath(grantSubscriptionSchema.safeParse({
      userId: "user_1",
      planId: "plan_1",
      durationDays: "0"
    }), ["durationDays"]);
  });

  it("accepts all promoCreateSchema types and nullable fields", () => {
    for (const type of Object.values(PromoCodeType)) {
      const parsed = promoCreateSchema.parse({
        code: " sale ",
        type,
        value: 10,
        maxUsages: null,
        maxUsagesPerUser: 2,
        minAmount: null,
        applicablePlanIds: ["plan_1"],
        startsAt: "2024-01-01T00:00:00.000Z",
        expiresAt: null,
        isActive: true
      });

      expect(parsed.code).toBe("SALE");
      expect(parsed.type).toBe(type);
      expect(parsed.maxUsages).toBeNull();
      expect(parsed.minAmount).toBeNull();
    }
  });
});
