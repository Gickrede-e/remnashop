import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findMany: vi.fn()
    },
    payment: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    subscription: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { exportEntity, exportEntityToCsv, listPaymentsForAdmin } from "@/lib/services/export";

describe("lib/services/export entity exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports users in batches and writes the CSV header once", async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: "user-1",
          email: "admin@example.com",
          role: "ADMIN",
          referralCode: "ADMIN",
          remnawaveUuid: "uuid-1",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          subscription: {
            status: "ACTIVE"
          }
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "user-2",
          email: "user@example.com",
          role: "USER",
          referralCode: "USER2",
          remnawaveUuid: null,
          createdAt: new Date("2024-01-02T00:00:00.000Z"),
          subscription: null
        }
      ])
      .mockResolvedValueOnce([]);

    const csv = await exportEntity("users");

    expect(csv).toBe(
      "\uFEFFid,email,role,referralCode,remnawaveUuid,createdAt,subscriptionStatus\n" +
        "user-1,admin@example.com,ADMIN,ADMIN,uuid-1,2024-01-01T00:00:00.000Z,ACTIVE\n" +
        "user-2,user@example.com,USER,USER2,,2024-01-02T00:00:00.000Z,"
    );
    expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(1, {
      take: 1000,
      include: {
        subscription: true
      },
      orderBy: { id: "asc" }
    });
    expect(mockPrisma.user.findMany).toHaveBeenNthCalledWith(
      2,
      {
        take: 1000,
        cursor: { id: "user-1" },
        skip: 1,
        include: {
          subscription: true
        },
        orderBy: { id: "asc" }
      }
    );
  });

  it("exports payments with joined plan and user data", async () => {
    mockPrisma.payment.findMany
      .mockResolvedValueOnce([
        {
          id: "payment-1",
          user: {
            email: "buyer@example.com"
          },
          plan: {
            name: "Pro"
          },
          provider: "YOOKASSA",
          status: "SUCCEEDED",
          amount: 19900,
          createdAt: new Date("2024-01-03T00:00:00.000Z"),
          paidAt: new Date("2024-01-03T00:05:00.000Z")
        }
      ])
      .mockResolvedValueOnce([]);

    const csv = await exportEntityToCsv("payments");

    expect(csv).toBe(
      "\uFEFFid,email,plan,provider,status,amountRub,createdAt,paidAt\n" +
        "payment-1,buyer@example.com,Pro,YOOKASSA,SUCCEEDED,199,2024-01-03T00:00:00.000Z,2024-01-03T00:05:00.000Z"
    );
    expect(mockPrisma.payment.findMany).toHaveBeenNthCalledWith(1, {
      take: 1000,
      include: {
        user: true,
        plan: true
      },
      orderBy: { id: "asc" }
    });
  });

  it("exports subscriptions and stringifies bigint traffic values", async () => {
    mockPrisma.subscription.findMany
      .mockResolvedValueOnce([
        {
          id: "sub-1",
          user: {
            email: "member@example.com"
          },
          plan: {
            name: "Unlimited"
          },
          status: "ACTIVE",
          startsAt: new Date("2024-02-01T00:00:00.000Z"),
          expiresAt: new Date("2024-03-01T00:00:00.000Z"),
          trafficLimitBytes: 1024n,
          trafficUsedBytes: 512n
        },
        {
          id: "sub-2",
          user: {
            email: "pending@example.com"
          },
          plan: {
            name: "Starter"
          },
          status: "PENDING",
          startsAt: null,
          expiresAt: null,
          trafficLimitBytes: null,
          trafficUsedBytes: null
        }
      ])
      .mockResolvedValueOnce([]);

    const csv = await exportEntityToCsv("subscriptions");

    expect(csv).toBe(
      "\uFEFFid,email,plan,status,startsAt,expiresAt,trafficLimitBytes,trafficUsedBytes\n" +
        "sub-1,member@example.com,Unlimited,ACTIVE,2024-02-01T00:00:00.000Z,2024-03-01T00:00:00.000Z,1024,512\n" +
        "sub-2,pending@example.com,Starter,PENDING,,,,"
    );
    expect(mockPrisma.subscription.findMany).toHaveBeenNthCalledWith(1, {
      take: 1000,
      include: {
        user: true,
        plan: true
      },
      orderBy: { id: "asc" }
    });
  });
});

describe("lib/services/export admin listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters and paginates payments for the admin table", async () => {
    mockPrisma.payment.findMany.mockResolvedValue([{ id: "payment-1" }]);
    mockPrisma.payment.count.mockResolvedValue(12);

    await expect(
      listPaymentsForAdmin({
        page: 2,
        limit: 5,
        status: "SUCCEEDED",
        provider: "YOOKASSA"
      })
    ).resolves.toEqual({
      items: [{ id: "payment-1" }],
      total: 12
    });

    expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
      where: {
        provider: "YOOKASSA",
        status: "SUCCEEDED"
      },
      include: {
        user: true,
        plan: true,
        promoCode: true
      },
      orderBy: { createdAt: "desc" },
      skip: 5,
      take: 5
    });
    expect(mockPrisma.payment.count).toHaveBeenCalledWith({
      where: {
        provider: "YOOKASSA",
        status: "SUCCEEDED"
      }
    });
  });
});
