import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockEnv,
  mockPrisma,
  mockLogAdminAction,
  mockRegisterPromoUsage,
  mockValidatePromoCode,
  mockActivateSubscriptionFromPayment,
  mockCreateYooKassaPayment,
  mockGetYooKassaPayment,
  mockVerifyYooKassaIp,
  mockIsPaymentProviderEnabledFromEnv,
  mockCreatePlategaPayment,
  mockGetPlategaTransaction
} = vi.hoisted(() => ({
  mockEnv: {
    NEXT_PUBLIC_SITE_URL: "https://vpn.example.com"
  },
  mockPrisma: {
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    plan: {
      findUnique: vi.fn()
    },
    user: {
      findUniqueOrThrow: vi.fn()
    }
  },
  mockLogAdminAction: vi.fn(),
  mockRegisterPromoUsage: vi.fn(),
  mockValidatePromoCode: vi.fn(),
  mockActivateSubscriptionFromPayment: vi.fn(),
  mockCreateYooKassaPayment: vi.fn(),
  mockGetYooKassaPayment: vi.fn(),
  mockVerifyYooKassaIp: vi.fn(),
  mockIsPaymentProviderEnabledFromEnv: vi.fn(),
  mockCreatePlategaPayment: vi.fn(),
  mockGetPlategaTransaction: vi.fn()
}));

vi.mock("@/lib/services/platega", () => ({
  createPlategaPayment: mockCreatePlategaPayment,
  getPlategaTransaction: mockGetPlategaTransaction
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma, toJsonValue: (value: unknown) => JSON.parse(JSON.stringify(value))
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/services/promos", () => ({
  registerPromoUsage: mockRegisterPromoUsage,
  validatePromoCode: mockValidatePromoCode
}));

vi.mock("@/lib/services/payment-activation", () => ({
  activateSubscriptionFromPayment: mockActivateSubscriptionFromPayment
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

import { mapYooKassaStatus } from "@/lib/services/payment-status";

describe("payment status mapping", () => {
  it.each([
    ["succeeded", PaymentStatus.SUCCEEDED],
    ["canceled", PaymentStatus.CANCELED],
    ["pending", PaymentStatus.PENDING],
    ["waiting_for_capture", PaymentStatus.PENDING]
  ])("maps YooKassa status %s", (input, expected) => {
    expect(mapYooKassaStatus(input)).toBe(expected);
  });
});

describe("createPaymentForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockIsPaymentProviderEnabledFromEnv.mockReturnValue(true);
    mockPrisma.plan.findUnique.mockResolvedValue({
      id: "plan-1",
      name: "Starter",
      price: 99000,
      isActive: true
    });
    mockValidatePromoCode.mockResolvedValue(null);
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ email: "buyer@example.com" });
    mockPrisma.payment.create.mockResolvedValue({
      id: "payment-1"
    });
    mockCreateYooKassaPayment.mockResolvedValue({
      id: "remote-1",
      confirmation: {
        confirmation_url: "https://pay.example.com/yookassa"
      }
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
        amount: 282150,
        customerEmail: "buyer@example.com"
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

  it("creates a Platega payment with the buyer's email and stores its payment url", async () => {
    const { createPaymentForUser } = await import("@/lib/services/payments");
    mockCreatePlategaPayment.mockResolvedValue({
      transactionId: "tx-1",
      url: "https://pay.platega.io/?id=tx-1"
    });

    await createPaymentForUser({
      userId: "user-1",
      planId: "plan-1",
      provider: PaymentProvider.PLATEGA
    });

    expect(mockCreatePlategaPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 99000,
        paymentId: "payment-1",
        userId: "user-1",
        userEmail: "buyer@example.com"
      })
    );
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({
        externalPaymentId: "tx-1",
        confirmationUrl: "https://pay.platega.io/?id=tx-1"
      })
    });
    expect(mockCreateYooKassaPayment).not.toHaveBeenCalled();
  });
});

describe("handlePlategaWebhook", () => {
  const confirmedTransaction = {
    id: "tx-1",
    status: "CONFIRMED",
    paymentDetails: { amount: 990, currency: "RUB" },
    payload: "payment-1"
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      provider: PaymentProvider.PLATEGA,
      status: PaymentStatus.PENDING,
      subscriptionId: null,
      externalPaymentId: "tx-1",
      amount: 99000,
      currency: "RUB"
    });
    mockPrisma.payment.findUniqueOrThrow.mockImplementation(() => mockPrisma.payment.findUnique());
    mockGetPlategaTransaction.mockResolvedValue(confirmedTransaction);
    mockActivateSubscriptionFromPayment.mockResolvedValue({ id: "payment-1", status: PaymentStatus.SUCCEEDED });
  });

  it("activates the subscription when the re-fetched transaction is confirmed", async () => {
    const { handlePlategaWebhook } = await import("@/lib/services/payments");

    await handlePlategaWebhook({ callback: { id: "tx-1", payload: "payment-1" } });

    expect(mockGetPlategaTransaction).toHaveBeenCalledWith("tx-1");
    expect(mockActivateSubscriptionFromPayment).toHaveBeenCalledWith(
      "payment-1",
      expect.objectContaining({ externalPaymentId: "tx-1" })
    );
  });

  it("throws WebhookIntegrityError when the re-fetched amount does not match", async () => {
    const { handlePlategaWebhook, WebhookIntegrityError } = await import("@/lib/services/payments");
    mockGetPlategaTransaction.mockResolvedValue({
      ...confirmedTransaction,
      paymentDetails: { amount: 1, currency: "RUB" }
    });

    await expect(
      handlePlategaWebhook({ callback: { id: "tx-1", payload: "payment-1" } })
    ).rejects.toBeInstanceOf(WebhookIntegrityError);
    expect(mockActivateSubscriptionFromPayment).not.toHaveBeenCalled();
  });

  it("drops callbacks that point at a payment from another provider", async () => {
    const { handlePlategaWebhook, WebhookDropSilentlyError } = await import("@/lib/services/payments");
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      provider: PaymentProvider.YOOKASSA,
      status: PaymentStatus.PENDING
    });

    await expect(
      handlePlategaWebhook({ callback: { id: "tx-1", payload: "payment-1" } })
    ).rejects.toBeInstanceOf(WebhookDropSilentlyError);
    expect(mockGetPlategaTransaction).not.toHaveBeenCalled();
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
    expect(mockActivateSubscriptionFromPayment).toHaveBeenCalledWith("payment-1", expect.objectContaining({
      externalPaymentId: "remote-payment-1",
      providerPayload: expect.objectContaining({
        id: "remote-payment-1",
        paid: true,
        lastProviderSync: expect.objectContaining({ status: "SUCCEEDED", source: "WEBHOOK" })
      })
    }));
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
