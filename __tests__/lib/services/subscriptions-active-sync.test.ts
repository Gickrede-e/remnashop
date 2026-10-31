import { SubscriptionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockRemnawave } = vi.hoisted(() => {
  const prisma = {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      update: vi.fn(),
      findMany: vi.fn()
    },
    payment: { findFirst: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma))
  };
  return {
    mockPrisma: prisma,
    mockRemnawave: {
      createRemnawaveUser: vi.fn(),
      disableRemnawaveUser: vi.fn(),
      enableRemnawaveUser: vi.fn(),
      getRemnawaveUser: vi.fn(),
      getRemnawaveUserByUsername: vi.fn(),
      isRemnawaveNotFoundError: vi.fn(),
      isRemnawaveRecoverableIdentityError: vi.fn(),
      listRemnawaveUsersByEmail: vi.fn(),
      resetRemnawaveUserTraffic: vi.fn(),
      updateRemnawaveUser: vi.fn()
    }
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma, toJsonValue: (value: unknown) => JSON.parse(JSON.stringify(value))
}));

vi.mock("@/lib/services/remnawave", () => mockRemnawave);

vi.mock("@/lib/services/admin-logs", () => ({
  logAdminAction: vi.fn()
}));

vi.mock("@/lib/services/notifications", () => ({
  notifyPaymentSucceeded: vi.fn()
}));

vi.mock("@/lib/services/promos", () => ({
  markPromoUsageSucceeded: vi.fn()
}));

vi.mock("@/lib/services/referrals", () => ({
  createReferralRewardForFirstPayment: vi.fn()
}));

import { syncActiveSubscriptionsToRemnawave } from "@/lib/services/remnawave-active-sync";

function buildCandidate(input: {
  userId: string;
  email: string;
  remnawaveUuid?: string | null;
  remnawaveUsername?: string | null;
  remnawaveShortUuid?: string | null;
  expiresAt: Date | null;
  trafficLimitBytes?: bigint | null;
  internalSquads?: string[];
  externalSquadUuid?: string | null;
  hwidDeviceLimit?: number | null;
}) {
  return {
    id: `sub-${input.userId}`,
    status: SubscriptionStatus.ACTIVE,
    userId: input.userId,
    expiresAt: input.expiresAt,
    trafficLimitBytes: input.trafficLimitBytes ?? BigInt(0),
    user: {
      id: input.userId,
      email: input.email,
      remnawaveUuid: input.remnawaveUuid ?? null,
      remnawaveUsername: input.remnawaveUsername ?? null,
      remnawaveShortUuid: input.remnawaveShortUuid ?? null
    },
    plan: {
      id: `plan-${input.userId}`,
      name: "Pro",
      slug: "pro",
      remnawaveInternalSquadUuids: input.internalSquads ?? ["squad-1"],
      remnawaveExternalSquadUuid: input.externalSquadUuid ?? null,
      remnawaveHwidDeviceLimit: input.hwidDeviceLimit ?? null
    }
  };
}

describe("syncActiveSubscriptionsToRemnawave", () => {
  const now = new Date("2026-03-22T12:00:00.000Z");
  const linkedUuid = "11111111-1111-4111-8111-111111111111";
  const staleUuid = "22222222-2222-4222-8222-222222222222";
  const attachedUuid = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockPrisma.$executeRaw.mockReset().mockResolvedValue(1);
    mockPrisma.payment.findFirst.mockReset().mockResolvedValue(null);
    mockPrisma.subscription.findUnique.mockReset().mockImplementation(async ({ where }: { where: { id: string } }) => {
      const candidates = await mockPrisma.subscription.findMany.mock.results.at(-1)?.value as ReturnType<typeof buildCandidate>[];
      return candidates.find((candidate) => candidate.id === where.id) ?? null;
    });
    mockPrisma.subscription.findMany.mockReset();
    mockPrisma.subscription.update.mockReset();
    mockPrisma.user.findMany.mockReset();
    mockPrisma.user.update.mockReset();

    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);
    mockPrisma.subscription.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => data);

    mockRemnawave.createRemnawaveUser.mockReset();
    mockRemnawave.disableRemnawaveUser.mockReset();
    mockRemnawave.enableRemnawaveUser.mockReset();
    mockRemnawave.getRemnawaveUser.mockReset();
    mockRemnawave.getRemnawaveUserByUsername.mockReset();
    mockRemnawave.isRemnawaveNotFoundError.mockReset();
    mockRemnawave.isRemnawaveRecoverableIdentityError.mockReset();
    mockRemnawave.listRemnawaveUsersByEmail.mockReset();
    mockRemnawave.resetRemnawaveUserTraffic.mockReset();
    mockRemnawave.updateRemnawaveUser.mockReset();

    mockRemnawave.isRemnawaveNotFoundError.mockImplementation(
      (error: unknown) => error instanceof Error && error.message === "not-found"
    );
    mockRemnawave.isRemnawaveRecoverableIdentityError.mockImplementation(
      (error: unknown) => error instanceof Error && (
        error.message === "not-found" ||
        error.message === "invalid-uuid"
      )
    );
    mockRemnawave.updateRemnawaveUser.mockImplementation(async (uuid: string) => ({
      uuid,
      username: `gs_${uuid}`,
      shortUuid: `short-${uuid}`,
      status: "ACTIVE",
      expireAt: "2026-04-21T12:00:00.000Z",
      trafficLimitBytes: 1024
    }));
    mockRemnawave.enableRemnawaveUser.mockResolvedValue(undefined);
  });

  it("only targets still-valid ACTIVE subscriptions, aggregates counts, and includes per-user outcomes", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      buildCandidate({
        userId: "user-linked",
        email: "linked@example.com",
        remnawaveUuid: linkedUuid,
        remnawaveUsername: "gs_linked",
        expiresAt: new Date("2026-04-21T12:00:00.000Z")
      }),
      buildCandidate({
        userId: "user-recover",
        email: "recover@example.com",
        remnawaveUuid: staleUuid,
        remnawaveUsername: "gs_recover",
        expiresAt: new Date("2026-04-25T12:00:00.000Z")
      }),
      buildCandidate({
        userId: "user-created",
        email: "created@example.com",
        expiresAt: new Date("2026-05-01T12:00:00.000Z")
      }),
      buildCandidate({
        userId: "user-skipped",
        email: "skipped@example.com",
        expiresAt: new Date("2026-05-05T12:00:00.000Z")
      }),
      buildCandidate({
        userId: "user-failed",
        email: "failed@example.com",
        expiresAt: new Date("2026-05-09T12:00:00.000Z")
      })
    ]);

    mockRemnawave.getRemnawaveUser.mockImplementation(async (uuid: string) => {
      if (uuid === linkedUuid) {
        return {
          uuid,
          username: "gs_linked",
          shortUuid: "short-linked",
          status: "ACTIVE",
          expireAt: "2026-04-21T12:00:00.000Z",
          trafficLimitBytes: 2048
        };
      }

      if (uuid === staleUuid) {
        throw new Error("not-found");
      }

      throw new Error(`Unexpected getRemnawaveUser(${uuid})`);
    });

    mockRemnawave.getRemnawaveUserByUsername.mockImplementation(async (username: string) => {
      if (username === "gs_recover") {
        return {
          uuid: attachedUuid,
          username,
          email: "recover@example.com"
        };
      }

      throw new Error("not-found");
    });

    mockRemnawave.listRemnawaveUsersByEmail.mockImplementation(async (email: string) => {
      if (email === "recover@example.com") {
        return [
          {
            uuid: attachedUuid,
            username: "gs_recover",
            email
          }
        ];
      }

      if (email === "skipped@example.com") {
        return [
          {
            uuid: "foreign-user",
            username: "external_sync",
            email
          }
        ];
      }

      if (email === "failed@example.com") {
        throw new Error("Remnawave unavailable");
      }

      return [];
    });

    mockRemnawave.createRemnawaveUser.mockImplementation(async ({ email, username }: {
      email?: string | null;
      username: string;
    }) => ({
      uuid: `created-${email}`,
      username,
      shortUuid: `short-${email}`
    }));

    const summary = await syncActiveSubscriptionsToRemnawave();

    expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: SubscriptionStatus.ACTIVE,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      })
    );
    expect(summary).toMatchObject({
      totalCandidates: 5,
      created: 1,
      attached: 1,
      alreadyLinked: 1,
      skipped: 1,
      failed: 1
    });
    expect(mockRemnawave.resetRemnawaveUserTraffic).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-linked" },
      data: {
        remnawaveUuid: linkedUuid,
        remnawaveUsername: `gs_${linkedUuid}`,
        remnawaveShortUuid: `short-${linkedUuid}`
      }
    }));
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-recover" },
      data: {
        remnawaveUuid: attachedUuid,
        remnawaveUsername: `gs_${attachedUuid}`,
        remnawaveShortUuid: `short-${attachedUuid}`
      }
    }));
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "user-created" },
      data: {
        remnawaveUuid: "created-created@example.com",
        remnawaveUsername: "gs_created-created@example.com",
        remnawaveShortUuid: "short-created-created@example.com"
      }
    }));
    expect(summary.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        userId: "user-recover",
        email: "recover@example.com",
        outcome: "attached",
        message: expect.stringContaining("Recovered stale link")
      }),
      expect.objectContaining({
        userId: "user-created",
        email: "created@example.com",
        outcome: "created"
      }),
      expect.objectContaining({
        userId: "user-skipped",
        email: "skipped@example.com",
        outcome: "skipped"
      }),
      expect.objectContaining({
        userId: "user-failed",
        email: "failed@example.com",
        outcome: "failed",
        message: "Remnawave unavailable"
      })
    ]));
  });

  it("treats a stale remnawaveUuid recovery path as recovery instead of a hard failure", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      buildCandidate({
        userId: "user-recover",
        email: "recover@example.com",
        remnawaveUuid: staleUuid,
        remnawaveUsername: "gs_recover",
        expiresAt: new Date("2026-04-25T12:00:00.000Z")
      })
    ]);

    mockRemnawave.getRemnawaveUser.mockImplementation(async (uuid: string) => {
      if (uuid === staleUuid) {
        throw new Error("not-found");
      }

      throw new Error(`Unexpected getRemnawaveUser(${uuid})`);
    });

    mockRemnawave.getRemnawaveUserByUsername.mockResolvedValue({
      uuid: attachedUuid,
      username: "gs_recover",
      email: "recover@example.com"
    });
    mockRemnawave.listRemnawaveUsersByEmail.mockResolvedValue([
      {
        uuid: attachedUuid,
        username: "gs_recover",
        email: "recover@example.com"
      }
    ]);

    const summary = await syncActiveSubscriptionsToRemnawave();

    expect(summary.created + summary.attached).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.items).toContainEqual(expect.objectContaining({
      userId: "user-recover",
      outcome: "attached",
      message: expect.stringContaining("Recovered stale link")
    }));
  });

  it("preloads linked remote uuids once for the whole batch", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      buildCandidate({
        userId: "user-created-1",
        email: "created-1@example.com",
        expiresAt: new Date("2026-04-25T12:00:00.000Z")
      }),
      buildCandidate({
        userId: "user-created-2",
        email: "created-2@example.com",
        expiresAt: new Date("2026-04-26T12:00:00.000Z")
      })
    ]);
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "already-linked",
        remnawaveUuid: "remote-reserved"
      }
    ]);

    mockRemnawave.getRemnawaveUserByUsername.mockRejectedValue(new Error("not-found"));
    mockRemnawave.listRemnawaveUsersByEmail.mockResolvedValue([]);
    mockRemnawave.createRemnawaveUser.mockImplementation(async ({ email, username }: {
      email?: string | null;
      username: string;
    }) => ({
      uuid: `created-${email}`,
      username,
      shortUuid: `short-${email}`
    }));

    const summary = await syncActiveSubscriptionsToRemnawave();

    expect(summary.created).toBe(2);
    expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it("does not fail the bulk sync when the remote user is already active after update", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      buildCandidate({
        userId: "user-created",
        email: "created@example.com",
        expiresAt: new Date("2026-04-25T12:00:00.000Z")
      })
    ]);

    mockRemnawave.getRemnawaveUserByUsername.mockRejectedValue(new Error("not-found"));
    mockRemnawave.listRemnawaveUsersByEmail.mockResolvedValue([]);
    mockRemnawave.createRemnawaveUser.mockResolvedValue({
      uuid: "created-remote",
      username: "gs_created",
      shortUuid: "short-created"
    });
    mockRemnawave.enableRemnawaveUser.mockRejectedValue(new Error("User already enabled"));

    const summary = await syncActiveSubscriptionsToRemnawave();

    expect(summary.created).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.items).toContainEqual(expect.objectContaining({
      userId: "user-created",
      outcome: "created"
    }));
  });

  it("pushes a fresh expiry read after locking instead of the old batch snapshot", async () => {
    const candidate = buildCandidate({
      userId: "user-extended", email: "extended@example.com", remnawaveUuid: linkedUuid,
      expiresAt: new Date("2026-04-25T12:00:00.000Z")
    });
    const extendedExpiry = new Date("2026-05-25T12:00:00.000Z");
    mockPrisma.subscription.findMany.mockResolvedValue([candidate]);
    mockPrisma.$executeRaw.mockImplementationOnce(async () => {
      expect(mockPrisma.subscription.findUnique).not.toHaveBeenCalled();
      mockPrisma.subscription.findUnique.mockResolvedValue({ ...candidate, expiresAt: extendedExpiry });
      return 1;
    });
    mockRemnawave.getRemnawaveUser.mockResolvedValue({ uuid: linkedUuid, username: "gs_extended" });

    const summary = await syncActiveSubscriptionsToRemnawave();

    expect(summary.alreadyLinked).toBe(1);
    expect(mockRemnawave.updateRemnawaveUser).toHaveBeenCalledWith(linkedUuid,
      expect.objectContaining({ expireAt: extendedExpiry.toISOString() }));
  });

  it("skips pending activations before any remote lookup or update", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([buildCandidate({
      userId: "user-pending", email: "pending@example.com", remnawaveUuid: linkedUuid,
      expiresAt: new Date("2026-04-25T12:00:00.000Z")
    })]);
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "failed-payment" });

    const summary = await syncActiveSubscriptionsToRemnawave();

    expect(summary.skipped).toBe(1);
    expect(summary.items[0]?.message).toBe("Paid subscription activation is pending");
    expect(mockRemnawave.getRemnawaveUser).not.toHaveBeenCalled();
    expect(mockRemnawave.createRemnawaveUser).not.toHaveBeenCalled();
    expect(mockRemnawave.updateRemnawaveUser).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it("skips subscriptions that stopped being active after the batch was selected", async () => {
    const candidate = buildCandidate({
      userId: "user-expired", email: "expired@example.com", remnawaveUuid: linkedUuid,
      expiresAt: new Date("2026-04-25T12:00:00.000Z")
    });
    mockPrisma.subscription.findMany.mockResolvedValue([candidate]);
    mockPrisma.subscription.findUnique.mockResolvedValue({ ...candidate, status: SubscriptionStatus.EXPIRED });

    const summary = await syncActiveSubscriptionsToRemnawave();

    expect(summary.skipped).toBe(1);
    expect(mockRemnawave.getRemnawaveUser).not.toHaveBeenCalled();
    expect(mockRemnawave.updateRemnawaveUser).not.toHaveBeenCalled();
  });
});
