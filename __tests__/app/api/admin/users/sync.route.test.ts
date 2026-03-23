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

    const response = await POST();
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

    const response = await POST();
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
    expect(mockLogAdminAction).toHaveBeenCalledTimes(1);
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      adminId: "admin-1",
      action: "SYNC_ACTIVE_USERS",
      targetType: "USER",
      targetId: "active-subscriptions",
      details: {
        counts: {
          totalCandidates: 2,
          created: 1,
          attached: 0,
          alreadyLinked: 1,
          skipped: 1,
          failed: 0
        },
        skippedUserIds: ["user-2"],
        failedUserIds: []
      }
    });
  });

  it("converts bulk sync failures into apiError responses", async () => {
    mockRequireApiAdminSession.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    mockSyncActiveSubscriptionsToRemnawave.mockRejectedValue(new Error("sync exploded"));

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      ok: false,
      error: "sync exploded",
      details: undefined
    });
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("returns the sync summary even if the admin log write fails", async () => {
    mockRequireApiAdminSession.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    mockSyncActiveSubscriptionsToRemnawave.mockResolvedValue({
      totalCandidates: 1,
      created: 1,
      attached: 0,
      alreadyLinked: 0,
      skipped: 0,
      failed: 0,
      items: [
        {
          userId: "user-1",
          email: "user-1@example.com",
          outcome: "created",
          message: "Created Remnawave user"
        }
      ]
    });
    mockLogAdminAction.mockRejectedValue(new Error("log exploded"));

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        totalCandidates: 1,
        created: 1,
        attached: 0,
        alreadyLinked: 0,
        skipped: 0,
        failed: 0,
        items: [
          {
            userId: "user-1",
            email: "user-1@example.com",
            outcome: "created",
            message: "Created Remnawave user"
          }
        ]
      }
    });
    expect(mockLogAdminAction).toHaveBeenCalledTimes(1);
  });
});
