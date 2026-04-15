import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn()
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { dynamic, GET } from "@/app/api/health/route";

describe("app/api/health/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forces dynamic execution", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("returns ok when the database probe succeeds", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$queryRaw.mock.calls[0]?.[0]?.[0]).toBe("SELECT 1");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns 503 when the database probe fails", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false });
  });
});
