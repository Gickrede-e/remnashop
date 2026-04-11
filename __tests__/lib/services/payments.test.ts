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
    NEXT_PUBLIC_SITE_URL: "https://vpn.example.com",
    YOOKASSA_WEBHOOK_SECRET: "live-yookassa-webhook-secret"
  },
  mockPrisma: {
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

    mockEnv.YOOKASSA_WEBHOOK_SECRET = "live-yookassa-webhook-secret";
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
      status: PaymentStatus.SUCCEEDED,
      subscriptionId: "subscription-1"
    });
  });

  it("rejects a YooKassa webhook when the secret is missing", async () => {
    const { WebhookAuthorizationError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );
    const promise = handleYookassaWebhook({
      ip: "203.0.113.10",
      providedSecret: null,
      event: {
        object: {
          id: "remote-payment-1"
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookAuthorizationError);
    await expect(promise).rejects.toThrow("Webhook secret is required");
    expect(mockVerifyYooKassaIp).not.toHaveBeenCalled();
  });

  it("rejects a YooKassa webhook when the secret mismatches", async () => {
    const { WebhookAuthorizationError, handleYookassaWebhook } = await import(
      "@/lib/services/payments"
    );
    const promise = handleYookassaWebhook({
      ip: "203.0.113.10",
      providedSecret: "wrong-secret",
      event: {
        object: {
          id: "remote-payment-1"
        }
      }
    });

    await expect(promise).rejects.toThrow(WebhookAuthorizationError);
    await expect(promise).rejects.toThrow("Webhook secret mismatch");
    expect(mockVerifyYooKassaIp).not.toHaveBeenCalled();
  });

  it("returns the existing payment when the secret is valid", async () => {
    const { handleYookassaWebhook } = await import("@/lib/services/payments");

    const result = await handleYookassaWebhook({
      ip: "203.0.113.10",
      providedSecret: "live-yookassa-webhook-secret",
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
    expect(mockVerifyYooKassaIp).toHaveBeenCalledWith("203.0.113.10");
    expect(mockGetYooKassaPayment).toHaveBeenCalledWith("remote-payment-1");
    expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
      where: { id: "payment-1" }
    });
  });
});
