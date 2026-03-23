import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiSession, mockGetUserById, mockRevokeRemnawaveSubscription, mockPrisma } = vi.hoisted(() => ({
  mockRequireApiSession: vi.fn(),
  mockGetUserById: vi.fn(),
  mockRevokeRemnawaveSubscription: vi.fn(),
  mockPrisma: {
    user: { update: vi.fn() }
  }
}));

vi.mock("@/lib/api-session", () => ({
  requireApiSession: mockRequireApiSession
}));

vi.mock("@/lib/services/auth", () => ({
  getUserById: mockGetUserById
}));

vi.mock("@/lib/services/remnawave", () => ({
  revokeRemnawaveSubscription: mockRevokeRemnawaveSubscription
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { POST } from "@/app/api/subscription/reissue/route";

describe("POST /api/subscription/reissue", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireApiSession.mockRejectedValue(
      Object.assign(new Error("Требуется авторизация"), { status: 401 })
    );

    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no remnawaveUuid", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: null });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it("revokes subscription and updates shortUuid on success", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-uuid-1" });
    mockRevokeRemnawaveSubscription.mockResolvedValue({
      uuid: "rw-uuid-1",
      shortUuid: "new-short",
      username: "user1",
      subscriptionUrl: "https://panel.example.com/api/sub/new-short"
    });
    mockPrisma.user.update.mockResolvedValue({});

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.subscriptionUrl).toContain("new-short");
    expect(mockRevokeRemnawaveSubscription).toHaveBeenCalledWith("rw-uuid-1");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { remnawaveShortUuid: "new-short" }
    });
  });
});
