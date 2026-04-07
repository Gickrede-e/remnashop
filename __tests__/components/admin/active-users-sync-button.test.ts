import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CapturedButtonProps = {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => unknown;
  type?: "button" | "submit" | "reset";
  variant?: string;
};

const { capturedButtonProps, mockAlert, mockFetch, mockRefresh } = vi.hoisted(() => ({
  capturedButtonProps: { current: null as CapturedButtonProps | null },
  mockAlert: vi.fn(),
  mockFetch: vi.fn(),
  mockRefresh: vi.fn()
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useTransition: () => [false, (action: () => unknown) => action()]
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}));

vi.mock("@/components/ui/button", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    Button: (props: CapturedButtonProps) => {
      capturedButtonProps.current = props;
      return actual.createElement("button", { type: props.type ?? "button" }, props.children);
    }
  };
});

import { ActiveUsersSyncButton } from "@/components/admin/active-users-sync-button";

function renderButton() {
  const markup = renderToStaticMarkup(React.createElement(ActiveUsersSyncButton));
  const props = capturedButtonProps.current;

  if (!props) {
    throw new Error("ActiveUsersSyncButton did not render the shared Button");
  }

  return { markup, props };
}

describe("ActiveUsersSyncButton", () => {
  beforeEach(() => {
    capturedButtonProps.current = null;
    mockAlert.mockReset();
    mockFetch.mockReset();
    mockRefresh.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("window", {
      alert: mockAlert
    });
  });

  it("posts to the bulk sync endpoint, alerts the summary counts, and refreshes on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          totalCandidates: 5,
          created: 2,
          attached: 1,
          alreadyLinked: 1,
          skipped: 1,
          failed: 0
        }
      })
    });

    const { markup, props } = renderButton();

    expect(markup).toContain("Синхронизировать активных");
    expect(props.type).toBe("button");
    expect(props.className).toContain("activeUsersSyncButton");

    await props.onClick?.();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/users/sync", { method: "POST" });
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledWith(
      "Активные подписки: 5; создано: 2; привязано: 1; уже связаны: 1; пропущено: 1; ошибки: 0"
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("alerts the compact error payload and does not refresh on failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: "sync exploded"
      })
    });

    const { props } = renderButton();

    await props.onClick?.();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/users/sync", { method: "POST" });
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledWith("sync exploded");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
