import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockEnv,
  mockPrisma,
  mockLogAdminAction,
  mockRegisterPromoUsage,
  mockValidatePromoCode,
  mockActivateSubscriptionFromPayment,
  mockCreatePlategaPayment,
  mockGetPlategaPaymentStatus,
  mockCreateYooKassaPayment,
  mockGetYooKassaPayment,
  mockVerifyYooKassaIp,
  mockIsPaymentProviderEnabledFromEnv
} = vi.hoisted(() => ({
  mockEnv: {
    NEXT_PUBLIC_SITE_URL: "https://vpn.example.com",
    plategaPaymentMethods: [2, 10, 13]
  },
  mockPrisma: {
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn()
    },
    plan: {
      findUnique: vi.fn()
    }
  },
  mockLogAdminAction: vi.fn(),
  mockRegisterPromoUsage: vi.fn(),
  mockValidatePromoCode: vi.fn(),
  mockActivateSubscriptionFromPayment: vi.fn(),
  mockCreatePlategaPayment: vi.fn(),
  mockGetPlategaPaymentStatus: vi.fn(),
  mockCreateYooKassaPayment: vi.fn(),
  mockGetYooKassaPayment: vi.fn(),
  mockVerifyYooKassaIp: vi.fn(),
  mockIsPaymentProviderEnabledFromEnv: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/services/promos", () => ({
  registerPromoUsage: mockRegisterPromoUsage,
  validatePromoCode: mockValidatePromoCode
}));

vi.mock("@/lib/services/subscriptions", () => ({
  activateSubscriptionFromPayment: mockActivateSubscriptionFromPayment
}));

vi.mock("@/lib/services/platega", () => ({
  createPlategaPayment: mockCreatePlategaPayment,
  getPlategaPaymentStatus: mockGetPlategaPaymentStatus
}));

vi.mock("@/lib/services/yookassa", () => ({
  createYooKassaPayment: mockCreateYooKassaPayment,
  getYooKassaPayment: mockGetYooKassaPayment,
  parseYooKassaAmountToMinorUnits: (value?: string | null) => {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
      return null;
    }

    const [wholePart, fractionPart = ""] = normalized.split(".");
    return Number(wholePart) * 100 + Number(fractionPart.padEnd(2, "0"));
  },
  verifyYooKassaIp: mockVerifyYooKassaIp
}));

vi.mock("@/lib/payments/provider-config", () => ({
  isPaymentProviderEnabledFromEnv: mockIsPaymentProviderEnabledFromEnv
}));

import { mapPlategaStatus, mapYooKassaStatus } from "@/lib/services/payment-status";

describe("payment status mapping", () => {
  it.each([
    ["succeeded", PaymentStatus.SUCCEEDED],
    ["canceled", PaymentStatus.CANCELED],
    ["pending", PaymentStatus.PENDING],
    ["waiting_for_capture", PaymentStatus.PENDING]
  ])("maps YooKassa status %s", (input, expected) => {
    expect(mapYooKassaStatus(input)).toBe(expected);
  });

  it.each([
    ["confirmed", PaymentStatus.SUCCEEDED],
    ["completed", PaymentStatus.SUCCEEDED],
    ["succeeded", PaymentStatus.SUCCEEDED],
    ["cancelled", PaymentStatus.CANCELED],
    ["canceled", PaymentStatus.CANCELED],
    ["failed", PaymentStatus.FAILED],
    ["expired", PaymentStatus.FAILED],
    ["declined", PaymentStatus.FAILED],
    ["error", PaymentStatus.FAILED],
    ["chargeback", PaymentStatus.FAILED],
    ["chargebacked", PaymentStatus.FAILED],
    ["processing", PaymentStatus.PENDING]
  ])("maps Platega status %s", (input, expected) => {
    expect(mapPlategaStatus(input)).toBe(expected);
  });
});

describe("createPaymentForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEnv.plategaPaymentMethods = [2, 10, 13];
    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(true);
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: "plan-1",
      name: "Starter",
      price: 99000,
      isActive: true
    });
    mockValidatePromoCode.mockResolvedValue(null);
    mockPrisma.payment.create.mockResolvedValue({
      id: "payment-1"
    });
    mockCreateYooKassaPayment.mockResolvedValue({
      id: "remote-1",
      confirmation: {
        confirmation_url: "https://pay.example.com/yookassa"
      }
    });
    mockCreatePlategaPayment.mockResolvedValue({
      id: "remote-platega-1",
      redirect: "https://pay.example.com/platega"
    });
    mockPrisma.payment.update.mockResolvedValue({
      id: "payment-1",
      confirmationUrl: "https://pay.example.com/yookassa"
    });
  });

  it("rejects disabled providers before creating a payment", async () => {
    const { createPaymentForUser } = await import("@/lib/services/payments");
    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(false);

    await expect(
      createPaymentForUser({
        userId: "user-1",
        planId: "plan-1",
        provider: PaymentProvider.YOOKASSA
      })
    ).rejects.toThrow("Способ оплаты недоступен");

    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(mockCreateYooKassaPayment).not.toHaveBeenCalled();
  });

  it("applies the automatic duration discount before creating a payment", async () => {
    const { createPaymentForUser } = await import("@/lib/services/payments");

    await createPaymentForUser({
      userId: "user-1",
      planId: "plan-1",
      provider: PaymentProvider.YOOKASSA,
      months: 3
    });

    expect(mockPrisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        planId: "plan-1",
        provider: PaymentProvider.YOOKASSA,
        months: 3,
        originalAmount: 297000,
        amount: 282150
      })
    });
    expect(mockCreateYooKassaPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 282150
      })
    );
  });

  it("applies promo codes after the duration discount subtotal", async () => {
    const { createPaymentForUser } = await import("@/lib/services/payments");
    mockValidatePromoCode.mockResolvedValue({
      promo: {
        id: "promo-1"
      },
      finalAmount: 250000,
      discountAmount: 32150,
      bonusDays: 0,
      bonusTrafficGb: 0
    });

    await createPaymentForUser({
      userId: "user-1",
      planId: "plan-1",
      provider: PaymentProvider.YOOKASSA,
      months: 3,
      promoCode: "sale10"
    });

    expect(mockValidatePromoCode).toHaveBeenCalledWith({
      code: "sale10",
      planId: "plan-1",
      userId: "user-1",
      amount: 282150
    });
    expect(mockPrisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        months: 3,
        originalAmount: 297000,
        amount: 250000,
        promoCodeId: "promo-1"
      })
    });
    expect(mockRegisterPromoUsage).toHaveBeenCalledWith({
      promoCodeId: "promo-1",
      userId: "user-1",
      paymentId: "payment-1"
    });
  });

  it("passes the selected Platega payment method to the provider", async () => {
    const { createPaymentForUser } = await import("@/lib/services/payments");

    await createPaymentForUser({
      userId: "user-1",
      planId: "plan-1",
      provider: PaymentProvider.PLATEGA,
      paymentMethod: 10
    });

    expect(mockCreatePlategaPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 99000,
        paymentMethod: 10
      })
    );
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({
        externalPaymentId: "remote-platega-1",
        confirmationUrl: "https://pay.example.com/platega"
      })
    });
  });

  it("falls back to the first allowed Platega method when none is selected", async () => {
    const { createPaymentForUser } = await import("@/lib/services/payments");
    mockEnv.plategaPaymentMethods = [13, 2];

    await createPaymentForUser({
      userId: "user-1",
      planId: "plan-1",
      provider: PaymentProvider.PLATEGA
    });

    expect(mockCreatePlategaPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 13
      })
    );
  });

  it("rejects Platega methods outside the configured allowlist", async () => {
    const { createPaymentForUser } = await import("@/lib/services/payments");
    mockEnv.plategaPaymentMethods = [2, 10];

    await expect(
      createPaymentForUser({
        userId: "user-1",
        planId: "plan-1",
        provider: PaymentProvider.PLATEGA,
        paymentMethod: 13
      })
    ).rejects.toMatchObject({
      message: "Недоступный метод оплаты Platega",
      status: 400
    });

    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(mockCreatePlategaPayment).not.toHaveBeenCalled();
  });
});

describe("handlePlategaWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.payment.findUnique
      .mockResolvedValueOnce({
        id: "payment-1",
        status: PaymentStatus.PENDING,
        subscriptionId: null,
        externalPaymentId: "remote-platega-1",
        providerPayload: { merchantId: "merchant-1" }
      })
      .mockResolvedValueOnce({
        id: "payment-1",
        status: PaymentStatus.PENDING,
        subscriptionId: null,
        externalPaymentId: "remote-platega-1",
        providerPayload: { merchantId: "merchant-1" }
      });
    mockPrisma.payment.update.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
    mockActivateSubscriptionFromPayment.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
  });

  it("re-fetches authoritative status from Platega API regardless of webhook body status", async () => {
    mockGetPlategaPaymentStatus.mockResolvedValue({
      id: "remote-platega-1",
      status: "CONFIRMED",
      merchantId: "merchant-1"
    });
    const { handlePlategaWebhook } = await import("@/lib/services/payments");

    const result = await handlePlategaWebhook({
      payload: {
        id: "remote-platega-1",
        status: "PENDING"
      }
    });

    expect(mockGetPlategaPaymentStatus).toHaveBeenCalledWith({
      transactionId: "remote-platega-1",
      merchantId: "merchant-1"
    });
    expect(result).toMatchObject({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
    expect(mockPrisma.payment.findUnique).toHaveBeenNthCalledWith(1, {
      where: { externalPaymentId: "remote-platega-1" }
    });
    expect(mockActivateSubscriptionFromPayment).toHaveBeenCalledWith("payment-1");
  });

  it("ignores webhook body status when API still reports pending", async () => {
    mockGetPlategaPaymentStatus.mockResolvedValue({
      id: "remote-platega-1",
      status: "PENDING",
      merchantId: "merchant-1"
    });
    const { handlePlategaWebhook } = await import("@/lib/services/payments");

    await handlePlategaWebhook({
      payload: {
        id: "remote-platega-1",
        status: "CONFIRMED" // attacker tries to forge success
      }
    });

    expect(mockActivateSubscriptionFromPayment).not.toHaveBeenCalled();
  });

  it("throws when no transaction id can be resolved", async () => {
    mockPrisma.payment.findUnique.mockReset();
    const { handlePlategaWebhook } = await import("@/lib/services/payments");

    await expect(
      handlePlategaWebhook({
        payload: {}
      })
    ).rejects.toThrow("Local payment not found");
  });
});

describe("handleYookassaWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(true);
    mockVerifyYooKassaIp.mockReturnValue(true);
    mockGetYooKassaPayment.mockResolvedValue({
      id: "remote-payment-1",
      status: "succeeded",
      paid: true,
      amount: {
        value: "990.00",
        currency: "RUB"
      },
      metadata: {
        paymentId: "payment-1"
      }
    });
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.PENDING,
      subscriptionId: null,
      externalPaymentId: null,
      amount: 99000,
      currency: "RUB",
      providerPayload: null
    });
    mockPrisma.payment.update.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
    mockActivateSubscriptionFromPayment.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
  });

  it("throws WebhookIpForbiddenError when IP is not allowlisted", async () => {
    const { WebhookIpForbiddenError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );
    mockVerifyYooKassaIp.mockReturnValue(false);

    const promise = handleYookassaWebhook({
      ip: "198.51.100.10",
      event: {
        object: {
          id: "remote-payment-1",
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookIpForbiddenError);
    await expect(promise).rejects.toThrow("Webhook source IP is not allowlisted");
    expect(mockGetYooKassaPayment).not.toHaveBeenCalled();
    expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it("throws WebhookDropSilentlyError when remoteId is missing", async () => {
    const { WebhookDropSilentlyError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );

    const promise = handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookDropSilentlyError);
    await expect(promise).rejects.toThrow("remote id missing");
    expect(mockGetYooKassaPayment).not.toHaveBeenCalled();
  });

  it("falls back to externalPaymentId when metadata.paymentId is missing", async () => {
    const { handleYookassaWebhook } = await import("@/lib/services/payments");
    mockPrisma.payment.findUnique
      .mockResolvedValueOnce({
        id: "payment-1",
        status: PaymentStatus.PENDING,
        subscriptionId: null,
        externalPaymentId: "remote-payment-1",
        amount: 99000,
        currency: "RUB",
        providerPayload: null
      })
      .mockResolvedValueOnce({
        id: "payment-1",
        status: PaymentStatus.PENDING,
        subscriptionId: null,
        externalPaymentId: "remote-payment-1",
        amount: 99000,
        currency: "RUB",
        providerPayload: null
      });

    const result = await handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1"
        }
      }
    });

    expect(result).toMatchObject({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
    expect(mockPrisma.payment.findUnique).toHaveBeenNthCalledWith(1, {
      where: { externalPaymentId: "remote-payment-1" }
    });
    expect(mockGetYooKassaPayment).toHaveBeenCalledWith("remote-payment-1");
  });

  it("throws WebhookDropSilentlyError when local payment is not found", async () => {
    const { WebhookDropSilentlyError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );
    mockPrisma.payment.findUnique.mockResolvedValue(null);

    const promise = handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1",
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookDropSilentlyError);
    await expect(promise).rejects.toThrow("local payment not found");
    expect(mockGetYooKassaPayment).not.toHaveBeenCalled();
  });

  it("returns existing payment without remote call when it is already SUCCEEDED with subscription", async () => {
    const { handleYookassaWebhook } = await import("@/lib/services/payments");
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });

    const result = await handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1",
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });

    expect(result).toMatchObject({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
    expect(mockGetYooKassaPayment).not.toHaveBeenCalled();
  });

  it("throws WebhookIntegrityError when remote metadata.paymentId does not match local payment id", async () => {
    const { WebhookIntegrityError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.PENDING,
      subscriptionId: null,
      amount: 99000,
      currency: "RUB"
    });
    mockGetYooKassaPayment.mockResolvedValue({
      id: "remote-payment-1",
      status: "succeeded",
      metadata: {
        paymentId: "payment-SOMETHING-ELSE"
      }
    });

    const promise = handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1",
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookIntegrityError);
    await expect(promise).rejects.toThrow("metadata paymentId mismatch");
    expect(mockActivateSubscriptionFromPayment).not.toHaveBeenCalled();
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });

  it("processes the payment when all checks pass", async () => {
    const { handleYookassaWebhook } = await import("@/lib/services/payments");
    mockPrisma.payment.findUnique
      .mockResolvedValueOnce({
        id: "payment-1",
        status: PaymentStatus.PENDING,
        subscriptionId: null,
        externalPaymentId: null,
        amount: 99000,
        currency: "RUB",
        providerPayload: null
      })
      .mockResolvedValueOnce({
        id: "payment-1",
        status: PaymentStatus.PENDING,
        subscriptionId: null,
        externalPaymentId: null,
        amount: 99000,
        currency: "RUB",
        providerPayload: null
      });

    const result = await handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1",
          status: "succeeded",
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });

    expect(result).toMatchObject({
      id: "payment-1",
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
    expect(mockVerifyYooKassaIp).toHaveBeenCalledWith("203.0.113.10");
    expect(mockPrisma.payment.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: "payment-1" }
    });
    expect(mockGetYooKassaPayment).toHaveBeenCalledWith("remote-payment-1");
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment-1" },
        data: expect.objectContaining({
          externalPaymentId: "remote-payment-1"
        })
      })
    );
    expect(mockActivateSubscriptionFromPayment).toHaveBeenCalledWith("payment-1");
    expect(
      mockPrisma.payment.findUnique.mock.invocationCallOrder[0]
    ).toBeLessThan(mockGetYooKassaPayment.mock.invocationCallOrder[0]);
    expect(
      mockGetYooKassaPayment.mock.invocationCallOrder[0]
    ).toBeLessThan(mockPrisma.payment.update.mock.invocationCallOrder[0]);
    expect(
      mockPrisma.payment.update.mock.invocationCallOrder[0]
    ).toBeLessThan(mockActivateSubscriptionFromPayment.mock.invocationCallOrder[0]);
  });

  it("throws WebhookIntegrityError when remote amount does not match local payment amount", async () => {
    const { WebhookIntegrityError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.PENDING,
      subscriptionId: null,
      externalPaymentId: "remote-payment-1",
      amount: 99000,
      currency: "RUB"
    });
    mockGetYooKassaPayment.mockResolvedValue({
      id: "remote-payment-1",
      status: "succeeded",
      paid: true,
      amount: {
        value: "1090.00",
        currency: "RUB"
      },
      metadata: {
        paymentId: "payment-1"
      }
    });

    const promise = handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1",
          metadata: {
            paymentId: "payment-1"
          }
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookIntegrityError);
    await expect(promise).rejects.toThrow("amount mismatch");
    expect(mockActivateSubscriptionFromPayment).not.toHaveBeenCalled();
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });
});
