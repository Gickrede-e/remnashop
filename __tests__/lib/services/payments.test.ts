import { PaymentStatus } from "@prisma/client";
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
  mockVerifyPlategaSignature,
  mockCreateYooKassaPayment,
  mockGetYooKassaPayment,
  mockVerifyYooKassaIp
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
  mockVerifyPlategaSignature: vi.fn(),
  mockCreateYooKassaPayment: vi.fn(),
  mockGetYooKassaPayment: vi.fn(),
  mockVerifyYooKassaIp: vi.fn()
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
  getPlategaPaymentStatus: mockGetPlategaPaymentStatus,
  verifyPlategaSignature: mockVerifyPlategaSignature
}));

vi.mock("@/lib/services/yookassa", () => ({
  createYooKassaPayment: mockCreateYooKassaPayment,
  getYooKassaPayment: mockGetYooKassaPayment,
  verifyYooKassaIp: mockVerifyYooKassaIp
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
    ["processing", PaymentStatus.PENDING]
  ])("maps Platega status %s", (input, expected) => {
    expect(mapPlategaStatus(input)).toBe(expected);
  });
});

describe("handleYookassaWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockVerifyYooKassaIp.mockReturnValue(true);
    mockGetYooKassaPayment.mockResolvedValue({
      id: "remote-payment-1",
      status: "succeeded",
      metadata: {
        paymentId: "payment-1"
      }
    });
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      status: PaymentStatus.PENDING,
      subscriptionId: null,
      externalPaymentId: null,
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

  it("throws WebhookDropSilentlyError when metadata.paymentId is missing", async () => {
    const { WebhookDropSilentlyError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );

    const promise = handleYookassaWebhook({
      ip: "203.0.113.10",
      event: {
        object: {
          id: "remote-payment-1"
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookDropSilentlyError);
    await expect(promise).rejects.toThrow("local payment id missing in hint");
    expect(mockGetYooKassaPayment).not.toHaveBeenCalled();
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
      subscriptionId: null
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
        providerPayload: null
      })
      .mockResolvedValueOnce({
        id: "payment-1",
        status: PaymentStatus.PENDING,
        subscriptionId: null,
        externalPaymentId: null,
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
          status: PaymentStatus.SUCCEEDED,
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
});
