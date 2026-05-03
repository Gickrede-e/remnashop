import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentProvider } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const getActivePlansMock = vi.hoisted(() => vi.fn());
const getEnabledPaymentProvidersFromEnvMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const paymentCheckoutPropsMock = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    redirect: redirectMock
  };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: getSessionMock
}));

vi.mock("@/lib/services/plans", () => ({
  getActivePlans: getActivePlansMock
}));

vi.mock("@/lib/payments/provider-config", () => ({
  getEnabledPaymentProvidersFromEnv: getEnabledPaymentProvidersFromEnvMock
}));

vi.mock("@/lib/env", () => ({
  env: {
    plategaPaymentMethods: [2, 10, 13]
  }
}));

vi.mock("@/components/dashboard/payment-checkout", () => ({
  PaymentCheckout: (props: unknown) => {
    paymentCheckoutPropsMock(props);
    return React.createElement("div", { "data-testid": "payment-checkout" });
  }
}));

import DashboardBuyPage from "@/app/dashboard/buy/page";

describe("dashboard buy page", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getActivePlansMock.mockReset();
    getEnabledPaymentProvidersFromEnvMock.mockReset();
    redirectMock.mockReset();
    paymentCheckoutPropsMock.mockReset();
  });

  it("passes the configured Platega payment methods into checkout", async () => {
    getSessionMock.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "USER"
    });
    getEnabledPaymentProvidersFromEnvMock.mockReturnValue([
      PaymentProvider.YOOKASSA,
      PaymentProvider.PLATEGA
    ]);
    getActivePlansMock.mockResolvedValue([
      {
        id: "plan-1",
        slug: "starter",
        name: "Starter",
        description: "Базовый доступ",
        price: 99000,
        durationDays: 30,
        trafficGB: 100,
        highlight: null,
        isActive: true,
        sortOrder: 1,
        remnawaveExternalSquadUuid: null,
        remnawaveInternalSquadUuids: [],
        remnawaveHwidDeviceLimit: 3,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-01T00:00:00.000Z")
      }
    ]);

    renderToStaticMarkup(await DashboardBuyPage());

    expect(paymentCheckoutPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabledProviders: [PaymentProvider.YOOKASSA, PaymentProvider.PLATEGA],
        plategaPaymentMethods: [2, 10, 13]
      })
    );
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", async () => {
    getSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(DashboardBuyPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=%2Fdashboard%2Fbuy");
  });
});
