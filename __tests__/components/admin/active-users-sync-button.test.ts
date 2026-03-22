import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { mockRefresh } = vi.hoisted(() => ({
  mockRefresh: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}));

import { ActiveUsersSyncButton } from "@/components/admin/active-users-sync-button";

describe("ActiveUsersSyncButton", () => {
  it("renders the compact bulk sync action in a button shell", () => {
    const markup = renderToStaticMarkup(React.createElement(ActiveUsersSyncButton));

    expect(markup).toContain("Синхронизировать активных");
    expect(markup).toContain("type=\"button\"");
  });
});
