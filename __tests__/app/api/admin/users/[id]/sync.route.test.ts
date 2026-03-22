import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiAdminSession, mockLogAdminAction, mockSyncUserSubscription } = vi.hoisted(() => ({
  mockRequireApiAdminSession: vi.fn(),
  mockLogAdminAction: vi.fn(),
  mockSyncUserSubscription: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiAdminSession: mockRequireApiAdminSession
}));

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: mockLogAdminAction
}));

vi.mock("@/lib/services/subscriptions", () => ({
  syncUserSubscription: mockSyncUserSubscription
}));

import { POST } from "@/app/api/admin/users/[id]/sync/route";

describe("POST /api/admin/users/[id]/sync", () => {
  beforeEach(() => {
    mockRequireApiAdminSession.mockReset();
    mockLogAdminAction.mockReset();
    mockSyncUserSubscription.mockReset();
  });

  it("serializes bigint subscription fields in the sync payload", async () => {
    mockRequireApiAdminSession.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    mockSyncUserSubscription.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      remnawaveUuid: "rw-1",
      remnawaveUsername: "gs_user",
      remnawaveShortUuid: "short-1",
      subscription: {
        id: "sub-1",
        status: "ACTIVE",
        trafficLimitBytes: 161061273600n,
        trafficUsedBytes: 0n,
        plan: {
          id: "plan-1",
          slug: "pro",
          name: "Про"
        }
      }
    });

    const response = await POST(new Request("http://localhost/api/admin/users/user-1/sync"), {
      params: Promise.resolve({ id: "user-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "user-1",
        email: "user@example.com",
        remnawaveUuid: "rw-1",
        remnawaveUsername: "gs_user",
        remnawaveShortUuid: "short-1",
        subscription: {
          id: "sub-1",
          status: "ACTIVE",
          trafficLimitBytes: "161061273600",
          trafficUsedBytes: "0",
          plan: {
            id: "plan-1",
            slug: "pro",
            name: "Про"
          }
        }
      }
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      adminId: "admin-1",
      action: "SYNC_USER",
      targetType: "USER",
      targetId: "user-1"
    });
  });
});
