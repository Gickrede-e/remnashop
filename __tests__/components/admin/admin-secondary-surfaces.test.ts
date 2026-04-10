import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PromoCodeType } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

import { AsyncActionButton } from "@/components/admin/async-action-button";
import { AdminUserActions } from "@/components/admin/user-actions";
import { PlanForm } from "@/components/admin/plan-form";
import { PromoForm } from "@/components/admin/promo-form";
import { GrantSubscriptionForm } from "@/components/forms/grant-subscription-form";
import { FormSection } from "@/components/blocks/forms/form-section";
import AdminExportPage from "@/app/admin/export/page";

describe("admin secondary surfaces", () => {
  it("renders form primitives with semantic control-form hooks", () => {
    const formSectionMarkup = renderToStaticMarkup(
      React.createElement(
        FormSection,
        {
          title: "Секция формы",
          description: "Описание"
        },
        React.createElement("div", null, "Body")
      )
    );

    const planFormMarkup = renderToStaticMarkup(
      React.createElement(PlanForm, {
        mode: "create"
      })
    );

    const promoFormMarkup = renderToStaticMarkup(
      React.createElement(PromoForm, {
        mode: "create",
        plans: [
          {
            id: "plan-1",
            slug: "starter",
            name: "Starter",
            description: "Базовый доступ",
            durationDays: 30,
            trafficGB: 100,
            price: 99000,
            isActive: true,
            highlight: null,
            sortOrder: 1,
            remnawaveExternalSquadUuid: null,
            remnawaveInternalSquadUuids: [],
            remnawaveHwidDeviceLimit: 3,
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-01T00:00:00.000Z")
          }
        ],
        initialValues: {
          code: "WELCOME",
          type: PromoCodeType.DISCOUNT_PERCENT,
          value: 10,
          maxUsagesPerUser: 1,
          applicablePlanIds: []
        }
      })
    );

    const grantMarkup = renderToStaticMarkup(
      React.createElement(GrantSubscriptionForm, {
        users: [{ id: "user-1", email: "test@example.com" }],
        plans: [{ id: "plan-1", name: "Starter" }]
      })
    );

    expect(formSectionMarkup).toMatch(/class="[^"]*\bformSection\b[^"]*"/);
    expect(formSectionMarkup).toMatch(/class="[^"]*\bformSectionHeader\b[^"]*"/);
    expect(planFormMarkup).toMatch(/class="[^"]*\bcontrolForm\b[^"]*"/);
    expect(planFormMarkup).toMatch(/class="[^"]*\bcontrolFormActions\b[^"]*"/);
    expect(promoFormMarkup).toMatch(/class="[^"]*\bcontrolForm\b[^"]*"/);
    expect(grantMarkup).toMatch(/class="[^"]*\bcontrolForm\b[^"]*"/);
    expect(grantMarkup).toMatch(/class="[^"]*\bcontrolFieldGrid\b[^"]*"/);
  });

  it("renders admin action controls with semantic action and command hooks", () => {
    const asyncButtonMarkup = renderToStaticMarkup(
      React.createElement(AsyncActionButton, {
        label: "Проверить статус",
        pendingLabel: "Проверяем...",
        endpoint: "/api/admin/payments/payment-1/refresh"
      })
    );

    const userActionsMarkup = renderToStaticMarkup(
      React.createElement(AdminUserActions, {
        userId: "user-1",
        subscriptionId: "subscription-1",
        currentlyEnabled: true,
        plans: [{ id: "plan-1", name: "Starter" }]
      })
    );

    expect(asyncButtonMarkup).toMatch(/class="[^"]*\bcommandButton\b[^"]*"/);
    expect(userActionsMarkup).toMatch(/class="[^"]*\badminUserActions\b[^"]*"/);
    expect(userActionsMarkup).toMatch(/class="[^"]*\badminUserActionGrid\b[^"]*"/);
    expect(userActionsMarkup).toMatch(/class="[^"]*\bgrantFormSurface\b[^"]*"/);
    expect(userActionsMarkup).toMatch(/class="[^"]*\bcontrolSelect\b[^"]*"/);
  });

  it("renders admin page shells with semantic export and surface hooks", () => {
    const exportMarkup = renderToStaticMarkup(React.createElement(AdminExportPage));

    expect(exportMarkup).toMatch(/class="[^"]*\badminWorkspace\b[^"]*"/);
    expect(exportMarkup).toMatch(/class="[^"]*\badminSurfacePage\b[^"]*"/);
    expect(exportMarkup).toMatch(/class="[^"]*\brecordWorkspace\b[^"]*"/);
    expect(exportMarkup).toMatch(/class="[^"]*\badminExportGrid\b[^"]*"/);
  });
});
