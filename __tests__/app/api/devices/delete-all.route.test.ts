import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiSession, mockGetUserById, mockDeleteAllUserDevices } = vi.hoisted(() => ({
  mockRequireApiSession: vi.fn(),
  mockGetUserById: vi.fn(),
  mockDeleteAllUserDevices: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiSession: mockRequireApiSession
}));

vi.mock("@/lib/services/auth", () => ({
  getUserById: mockGetUserById
}));

vi.mock("@/lib/services/remnawave", () => ({
  deleteAllUserDevices: mockDeleteAllUserDevices
}));

import { POST } from "@/app/api/devices/delete-all/route";

describe("POST /api/devices/delete-all", () => {
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
    expect(response.status).toBe(400);
  });

  it("deletes all devices on success", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });
    mockDeleteAllUserDevices.mockResolvedValue({ total: 0 });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.total).toBe(0);
    expect(mockDeleteAllUserDevices).toHaveBeenCalledWith("rw-1");
  });
});
