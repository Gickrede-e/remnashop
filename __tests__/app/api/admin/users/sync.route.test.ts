import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiAdminSession, mockLogAdminAction, mockSyncActiveSubscriptionsToRemnawave } = vi.hoisted(() => ({
  mockRequireApiAdminSession: vi.fn(),
  mockLogAdminAction: vi.fn(),
  mockSyncActiveSubscriptionsToRemnawave: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiAdminSession: mockRequireApiAdminSession
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/services/subscriptions", () => ({
  syncActiveSubscriptionsToRemnawave: mockSyncActiveSubscriptionsToRemnawave
}));

import { POST } from "@/app/api/admin/users/sync/route";

describe("POST /api/admin/users/sync", () => {
  beforeEach(() => {
    mockRequireApiAdminSession.mockReset();
    mockLogAdminAction.mockReset();
    mockSyncActiveSubscriptionsToRemnawave.mockReset();
  });

  it("requires an admin session", async () => {
    mockRequireApiAdminSession.mockRejectedValue(new Error("Требуется авторизация"));

    const response = await POST(new Request("http://localhost/api/admin/users/sync"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      error: "Требуется авторизация",
      details: undefined
    });
    expect(mockSyncActiveSubscriptionsToRemnawave).not.toHaveBeenCalled();
  });

  it("returns the bulk sync summary payload", async () => {
    mockRequireApiAdminSession.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    mockSyncActiveSubscriptionsToRemnawave.mockResolvedValue({
      totalCandidates: 2,
      created: 1,
      attached: 0,
      alreadyLinked: 1,
      skipped: 1,
      failed: 0,
      items: [
        {
          userId: "user-1",
          email: "user-1@example.com",
          outcome: "created",
          message: "Created Remnawave user"
        },
        {
          userId: "user-2",
          email: "user-2@example.com",
          outcome: "skipped",
          message: "Unsafe remote matches"
        }
      ]
    });

    const response = await POST(new Request("http://localhost/api/admin/users/sync"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        totalCandidates: 2,
        created: 1,
        attached: 0,
        alreadyLinked: 1,
        skipped: 1,
        failed: 0,
        items: [
          {
            userId: "user-1",
            email: "user-1@example.com",
            outcome: "created",
            message: "Created Remnawave user"
          },
          {
            userId: "user-2",
            email: "user-2@example.com",
            outcome: "skipped",
            message: "Unsafe remote matches"
          }
        ]
      }
    });
  });
});
