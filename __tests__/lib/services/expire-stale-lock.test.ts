import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTx, mockPrisma, mockNotifySubscriptionExpired } = vi.hoisted(() => {
  const mockTx = {
    $queryRaw: vi.fn(),
    subscription: {
      findMany: vi.fn(),
      updateMany: vi.fn()
    }
  };
  return {
    mockTx,
    mockPrisma: {
      $transaction: vi.fn(async (fn: (tx: typeof mockTx) => unknown) => fn(mockTx))
    },
    mockNotifySubscriptionExpired: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma, toJsonValue: (value: unknown) => JSON.parse(JSON.stringify(value)) }));

vi.mock("@/lib/services/subscriptions", () => ({ activateSubscriptionFromPayment: vi.fn() }));

vi.mock("@/lib/services/notifications", () => ({
  notifySubscriptionExpired: mockNotifySubscriptionExpired
}));

import { expireStaleSubscriptions } from "@/lib/services/subscription-cron";

function lockSql() {
  return mockTx.$queryRaw.mock.calls.map((call) => String(call[0]));
}

describe("expireStaleSubscriptions advisory lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.subscription.findMany.mockResolvedValue([]);
    mockTx.subscription.updateMany.mockResolvedValue({ count: 0 });
  });

  it("takes a transaction-scoped lock and runs the tick inside that transaction", async () => {
    mockTx.$queryRaw.mockResolvedValue([{ acquired: true }]);

    const count = await expireStaleSubscriptions();

    expect(count).toBe(0);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    // xact-scoped lock: released with the transaction, so no explicit unlock exists.
    expect(lockSql().some((sql) => sql.includes("pg_try_advisory_xact_lock"))).toBe(true);
    expect(lockSql().some((sql) => sql.includes("pg_advisory_unlock"))).toBe(false);
    expect(mockTx.subscription.findMany).toHaveBeenCalledTimes(1);
  });

  it("skips the tick when the lock is busy", async () => {
    mockTx.$queryRaw.mockResolvedValue([{ acquired: false }]);

    const count = await expireStaleSubscriptions();

    expect(count).toBe(0);
    expect(mockTx.subscription.findMany).not.toHaveBeenCalled();
    expect(mockNotifySubscriptionExpired).not.toHaveBeenCalled();
  });

  it("propagates a failure from inside the tick", async () => {
    mockTx.$queryRaw.mockResolvedValue([{ acquired: true }]);
    mockTx.subscription.findMany.mockRejectedValue(new Error("db down"));

    await expect(expireStaleSubscriptions()).rejects.toThrow("db down");
    expect(mockNotifySubscriptionExpired).not.toHaveBeenCalled();
  });

  it("expires stale subscriptions and notifies users when the lock is held", async () => {
    mockTx.$queryRaw.mockResolvedValue([{ acquired: true }]);
    mockTx.subscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        user: { email: "user@example.com" },
        plan: { name: "Geek 1m" }
      }
    ]);
    mockTx.subscription.updateMany.mockResolvedValue({ count: 1 });

    const count = await expireStaleSubscriptions();

    expect(count).toBe(1);
    // The write re-checks expiry/status so a just-renewed row isn't flipped back.
    const updateArg = mockTx.subscription.updateMany.mock.calls[0]?.[0] as {
      where: { id: { in: string[] }; expiresAt: unknown; status: unknown };
    };
    expect(updateArg.where.id).toEqual({ in: ["sub-1"] });
    expect(updateArg.where.expiresAt).toBeDefined();
    expect(updateArg.where.status).toBeDefined();
    expect(mockNotifySubscriptionExpired).toHaveBeenCalledWith({
      email: "user@example.com",
      planName: "Geek 1m"
    });
  });
});
