import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "dialog-content" }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement("h2", null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children)
}));

import { ReissueSubscriptionButton } from "@/components/blocks/dashboard/reissue-subscription-button";

describe("reissue subscription button", () => {
  it("warns that devices disconnect and the subscription link changes", () => {
    const markup = renderToStaticMarkup(React.createElement(ReissueSubscriptionButton));

    expect(markup).toContain("Перевыпуск подписки");
    expect(markup).toContain("Все устройства будут отключены");
    expect(markup).toContain("ссылка на подписку изменится");
  });
});
