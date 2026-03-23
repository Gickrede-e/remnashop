import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiSession, mockGetUserById, mockDeleteUserDevice } = vi.hoisted(() => ({
  mockRequireApiSession: vi.fn(),
  mockGetUserById: vi.fn(),
  mockDeleteUserDevice: vi.fn()
}));

vi.mock("@/lib/api-session", () => ({
  requireApiSession: mockRequireApiSession
}));

vi.mock("@/lib/services/auth", () => ({
  getUserById: mockGetUserById
}));

vi.mock("@/lib/services/remnawave", () => ({
  deleteUserDevice: mockDeleteUserDevice
}));

import { POST } from "@/app/api/devices/delete/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/devices/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/devices/delete", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireApiSession.mockRejectedValue(
      Object.assign(new Error("Требуется авторизация"), { status: 401 })
    );

    const response = await POST(makeRequest({ hwid: "abc" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when hwid is missing", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });

    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 when hwid exceeds max length", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });

    const response = await POST(makeRequest({ hwid: "x".repeat(513) }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when user has no remnawaveUuid", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: null });

    const response = await POST(makeRequest({ hwid: "abc" }));
    expect(response.status).toBe(400);
  });

  it("deletes device and returns total on success", async () => {
    mockRequireApiSession.mockResolvedValue({ userId: "user-1", role: "USER" });
    mockGetUserById.mockResolvedValue({ id: "user-1", remnawaveUuid: "rw-1" });
    mockDeleteUserDevice.mockResolvedValue({ devices: [], total: 0 });

    const response = await POST(makeRequest({ hwid: "device-hwid-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.total).toBe(0);
    expect(mockDeleteUserDevice).toHaveBeenCalledWith("rw-1", "device-hwid-1");
  });
});
