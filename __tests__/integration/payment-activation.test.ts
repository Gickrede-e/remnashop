import { randomUUID } from "node:crypto";

import { type Payment, type Plan, type User, PaymentStatus } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RemnawaveUserSnapshot } from "@/lib/services/remnawave";

const { getRemote, updateRemote, resetTraffic, getProviderPayment, notify } = vi.hoisted(() => ({
  getRemote: vi.fn(),
  updateRemote: vi.fn(),
  resetTraffic: vi.fn(),
  getProviderPayment: vi.fn(),
  notify: vi.fn()
}));

vi.mock("@/lib/services/remnawave", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/services/remnawave")>(),
  getRemnawaveUser: getRemote,
  updateRemnawaveUser: updateRemote,
  resetRemnawaveUserTraffic: resetTraffic
}));
vi.mock("@/lib/services/yookassa", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/services/yookassa")>(),
  getYooKassaPayment: getProviderPayment
}));
vi.mock("@/lib/services/notifications", () => ({ notifyPaymentSucceeded: notify }));
vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  serializeError: (error: unknown) => String(error)
}));

import { prisma } from "@/lib/prisma";
import { hasPendingActivation, retryPendingActivations } from "@/lib/services/payment-activation";
import { handleYookassaWebhook, refreshPaymentStatus } from "@/lib/services/payments";
import { registerPromoUsage } from "@/lib/services/promos";
import { syncActiveSubscriptionsToRemnawave } from "@/lib/services/remnawave-active-sync";
import { grantSubscriptionByAdmin } from "@/lib/services/subscriptions";

const DAY = 86_400_000;
const GB = 1024n ** 3n;
const baselineExpiry = new Date("2050-01-01T00:00:00.000Z");
const userIds: string[] = [];
const planIds: string[] = [];
const paymentIds: string[] = [];
const promoIds: string[] = [];
const remotes = new Map<string, RemnawaveUserSnapshot>();
const providerPayments = new Map<string, object>();
let plan: Plan;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function makePlan(trafficGB = 100, durationDays = 30) {
  const result = await prisma.plan.create({
    data: { slug: `integration-${randomUUID()}`, name: "Integration plan", price: 99000, trafficGB, durationDays }
  });
  planIds.push(result.id);
  return result;
}

async function makeUser(referredById?: string) {
  const uuid = randomUUID();
  const user = await prisma.user.create({
    data: {
      email: `activation-${uuid}@example.test`, passwordHash: "unused-integration-password-hash",
      remnawaveUuid: uuid, remnawaveUsername: `integration_${uuid}`, referredById,
      subscription: { create: {
        planId: plan.id, status: "ACTIVE", startsAt: new Date("2049-01-01T00:00:00.000Z"),
        expiresAt: baselineExpiry, trafficLimitBytes: 500n * GB
      } }
    }
  });
  userIds.push(user.id);
  remotes.set(uuid, { uuid, username: user.remnawaveUsername!, expireAt: baselineExpiry.toISOString(), trafficLimitBytes: Number(500n * GB) });
  return user;
}

async function makePayment(user: User, options: { plan?: Plan; promoCodeId?: string; months?: number } = {}) {
  const payment = await prisma.payment.create({
    data: {
      userId: user.id, planId: (options.plan ?? plan).id, provider: "YOOKASSA", amount: 99000,
      externalPaymentId: randomUUID(), promoCodeId: options.promoCodeId, months: options.months ?? 1
    }
  });
  paymentIds.push(payment.id);
  providerPayments.set(payment.externalPaymentId!, {
    id: payment.externalPaymentId, status: "succeeded", paid: true,
    amount: { value: "990.00", currency: "RUB" }, metadata: { paymentId: payment.id }
  });
  return payment;
}

function webhook(payment: Payment) {
  return handleYookassaWebhook({
    ip: "185.71.76.1",
    event: { object: { id: payment.externalPaymentId!, metadata: { paymentId: payment.id } } }
  });
}

async function allowRetry(...payments: Payment[]) {
  await prisma.payment.updateMany({
    where: { id: { in: payments.map((payment) => payment.id) } },
    data: { activationAttemptedAt: new Date(Date.now() - 180_000) }
  });
}

function applyRemote(uuid: string, values: Partial<RemnawaveUserSnapshot>) {
  const snapshot = { ...remotes.get(uuid)!, ...values };
  remotes.set(uuid, snapshot);
  return snapshot;
}

beforeEach(async () => {
  vi.resetAllMocks();
  // An unexpected network operation must fail locally, even if the caller catches it.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected network operation in integration test")));
  getRemote.mockImplementation(async (uuid: string) => remotes.get(uuid));
  updateRemote.mockImplementation(async (uuid: string, values: Partial<RemnawaveUserSnapshot>) => applyRemote(uuid, values));
  getProviderPayment.mockImplementation(async (id: string) => providerPayments.get(id));
  resetTraffic.mockResolvedValue(undefined);
  notify.mockResolvedValue(undefined);
  plan = await makePlan();
});

afterEach(async () => {
  await prisma.adminLog.deleteMany({ where: { OR: [
    { targetId: { in: paymentIds } }, { adminId: { in: userIds } }
  ] } });
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.promoCode.deleteMany({ where: { id: { in: promoIds } } });
  await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  userIds.length = planIds.length = paymentIds.length = promoIds.length = 0;
  remotes.clear();
  providerPayments.clear();
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

afterAll(() => prisma.$disconnect());

describe("payment activation with PostgreSQL", () => {
  it("recognizes only confirmed unfinished payments as pending activations", async () => {
    const user = await makeUser();
    const payment = await makePayment(user);
    await prisma.$transaction(async (tx) => {
      const pending = () => hasPendingActivation(user.id, tx);

      await expect(pending()).resolves.toBe(false);

      // These uncommitted changes must be read through the supplied transaction.
      await tx.payment.update({ where: { id: payment.id }, data: { activationConfirmedAt: new Date() } });
      await expect(pending()).resolves.toBe(true);
      await expect(hasPendingActivation("other-user", tx)).resolves.toBe(false);

      await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
      await expect(pending()).resolves.toBe(true);

      await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.SUCCEEDED } });
      await expect(pending()).resolves.toBe(true);

      const subscription = await tx.subscription.findUniqueOrThrow({ where: { userId: user.id } });
      await tx.payment.update({ where: { id: payment.id }, data: { subscriptionId: subscription.id } });
      await expect(pending()).resolves.toBe(false);
    });
  });

  it("keeps the calculation and promo reservation through provider refreshes, then applies bonuses once on Cron retry", async () => {
    const user = await makeUser();
    const source = await makeUser();
    const reward = await prisma.referralReward.create({ data: {
      ownerId: user.id, referredUserId: source.id, rewardType: "FREE_DAYS", rewardValue: 3
    } });
    const promo = await prisma.promoCode.create({ data: {
      code: `INTEGRATION-${randomUUID()}`, type: "FREE_DAYS", value: 5, maxUsages: 1
    } });
    promoIds.push(promo.id);
    const payment = await makePayment(user, { promoCodeId: promo.id, months: 3 });
    await registerPromoUsage({ promoCodeId: promo.id, userId: user.id, paymentId: payment.id });

    updateRemote.mockRejectedValue(new Error("Remote unavailable"));
    await webhook(payment);
    const failed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(failed.activationConfirmedAt).not.toBeNull();
    expect(failed.activationMeta).toMatchObject({
      expiresAt: new Date(baselineExpiry.getTime() + 98 * DAY).toISOString(),
      trafficLimitBytes: String(100n * GB), referralRewardIds: [reward.id]
    });
    expect(await prisma.promoUsage.findFirst({ where: { paymentId: payment.id } })).toMatchObject({ status: "PENDING" });
    expect(await prisma.promoCode.findUnique({ where: { id: promo.id } })).toMatchObject({ currentUsages: 1 });

    const laterReward = await prisma.referralReward.create({ data: {
      ownerId: user.id, referredUserId: source.id, rewardType: "FREE_DAYS", rewardValue: 7
    } });
    await refreshPaymentStatus(payment.id);
    const refreshed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(refreshed.providerPayload).toMatchObject({ lastProviderSync: { source: "ADMIN_REFRESH" } });
    expect(refreshed.activationMeta).toEqual(failed.activationMeta);
    expect(refreshed.activationConfirmedAt).toEqual(failed.activationConfirmedAt);

    updateRemote.mockImplementation(async (uuid: string, values: Partial<RemnawaveUserSnapshot>) => applyRemote(uuid, values));
    await allowRetry(payment);
    await retryPendingActivations();
    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { userId: user.id } });
    expect(subscription.expiresAt).toEqual(new Date(baselineExpiry.getTime() + 98 * DAY));
    expect(await prisma.promoUsage.findFirst({ where: { paymentId: payment.id } })).toMatchObject({ status: "SUCCEEDED" });
    expect(await prisma.referralReward.findUnique({ where: { id: reward.id } })).toMatchObject({ applied: true });
    expect(await prisma.referralReward.findUnique({ where: { id: laterReward.id } })).toMatchObject({ applied: false });

    await Promise.all([webhook(payment), refreshPaymentStatus(payment.id)]);
    await retryPendingActivations();
    expect(await prisma.subscription.findUnique({ where: { userId: user.id } })).toMatchObject({ expiresAt: subscription.expiresAt });
    expect(await prisma.promoCode.findUnique({ where: { id: promo.id } })).toMatchObject({ currentUsages: 1 });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("serializes two overlapping payments, adds both durations, replaces traffic and creates one first-payment reward", async () => {
    const referrer = await makeUser();
    const user = await makeUser(referrer.id);
    const pendingReward = await prisma.referralReward.create({ data: {
      ownerId: user.id, referredUserId: referrer.id, rewardType: "FREE_DAYS", rewardValue: 4
    } });
    const secondPlan = await makePlan(40, 15);
    const first = await makePayment(user);
    const second = await makePayment(user, { plan: secondPlan, months: 2 });
    const entered = deferred();
    const release = deferred();
    updateRemote.mockImplementationOnce(async (uuid: string, values: Partial<RemnawaveUserSnapshot>) => {
      entered.resolve();
      await release.promise;
      return applyRemote(uuid, values);
    });

    const firstCall = webhook(first);
    await entered.promise;
    const duplicateCall = webhook(first);
    try {
      await refreshPaymentStatus(second.id);
      expect(await prisma.payment.findUnique({ where: { id: second.id } })).toMatchObject({
        status: "PENDING", activationMeta: null, activationAttemptedAt: null
      });
    } finally {
      release.resolve();
      await Promise.all([firstCall, duplicateCall]);
    }
    await retryPendingActivations();

    expect(await prisma.payment.count({ where: { id: { in: [first.id, second.id] }, status: "SUCCEEDED" } })).toBe(2);
    const subscription = await prisma.subscription.findUniqueOrThrow({ where: { userId: user.id } });
    expect(subscription).toMatchObject({
      planId: secondPlan.id, expiresAt: new Date(baselineExpiry.getTime() + 64 * DAY), trafficLimitBytes: 40n * GB
    });
    expect(remotes.get(user.remnawaveUuid!)).toMatchObject({ expireAt: subscription.expiresAt!.toISOString(), trafficLimitBytes: Number(40n * GB) });
    expect(await prisma.referralReward.findMany({ where: { referredUserId: user.id } })).toMatchObject([
      { ownerId: referrer.id, paymentId: first.id, rewardType: "FREE_DAYS", rewardValue: 3 }
    ]);
    expect(await prisma.referralReward.findUnique({ where: { id: pendingReward.id } })).toMatchObject({ applied: true });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(resetTraffic).toHaveBeenCalledTimes(2);
  });

  it("holds later purchases behind a failed head while another user progresses, then drains the saved order", async () => {
    const blockedUser = await makeUser();
    const otherUser = await makeUser();
    const first = await makePayment(blockedUser);
    const second = await makePayment(blockedUser);
    const independent = await makePayment(otherUser);
    updateRemote.mockImplementation(async (uuid: string, values: Partial<RemnawaveUserSnapshot>) => {
      if (uuid === blockedUser.remnawaveUuid) throw new Error("This remote user is unavailable");
      return applyRemote(uuid, values);
    });
    await webhook(first);
    await Promise.all([webhook(second), refreshPaymentStatus(independent.id)]);
    expect(await prisma.payment.findUnique({ where: { id: second.id } })).toMatchObject({
      status: "PENDING", activationMeta: null, activationAttemptedAt: null
    });
    expect(await prisma.payment.findUnique({ where: { id: independent.id } })).toMatchObject({ status: "SUCCEEDED" });
    expect(await prisma.subscription.findUnique({ where: { userId: blockedUser.id } })).toMatchObject({ expiresAt: baselineExpiry });

    updateRemote.mockImplementation(async (uuid: string, values: Partial<RemnawaveUserSnapshot>) => applyRemote(uuid, values));
    await allowRetry(first);
    await retryPendingActivations();
    expect(await prisma.payment.count({ where: { id: { in: [first.id, second.id] }, status: "SUCCEEDED" } })).toBe(2);
    expect(await prisma.subscription.findUnique({ where: { userId: blockedUser.id } })).toMatchObject({
      expiresAt: new Date(baselineExpiry.getTime() + 60 * DAY)
    });
  });

  it("blocks grants and bulk sync behind a failed payment, then keeps the granted expiry and usage", async () => {
    const user = await makeUser();
    const payment = await makePayment(user);
    updateRemote.mockRejectedValueOnce(new Error("Remote unavailable"));

    await webhook(payment);
    await expect(grantSubscriptionByAdmin({
      adminId: user.id, userId: user.id, planId: plan.id, durationDays: 7, trafficGB: 77
    })).rejects.toThrow("Сначала завершите активацию");
    expect(await syncActiveSubscriptionsToRemnawave()).toMatchObject({ skipped: 1, failed: 0 });
    expect(updateRemote).toHaveBeenCalledTimes(1);

    await allowRetry(payment);
    await retryPendingActivations();
    const activated = await prisma.subscription.findUniqueOrThrow({ where: { userId: user.id } });
    expect(activated.expiresAt).toEqual(new Date(baselineExpiry.getTime() + 30 * DAY));

    const granted = await grantSubscriptionByAdmin({
      adminId: user.id, userId: user.id, planId: plan.id, durationDays: 7, trafficGB: 77
    });
    const usage = 17n * GB;
    await prisma.subscription.update({ where: { id: granted.id }, data: { trafficUsedBytes: usage } });
    resetTraffic.mockClear();

    expect(await syncActiveSubscriptionsToRemnawave()).toMatchObject({ alreadyLinked: 1, failed: 0 });
    expect(resetTraffic).not.toHaveBeenCalled();
    const final = await prisma.subscription.findUniqueOrThrow({ where: { id: granted.id } });
    expect(final).toMatchObject({
      expiresAt: new Date(baselineExpiry.getTime() + 37 * DAY), trafficLimitBytes: 77n * GB, trafficUsedBytes: usage
    });
    expect(remotes.get(user.remnawaveUuid!)).toMatchObject({
      expireAt: final.expiresAt!.toISOString(), trafficLimitBytes: Number(77n * GB)
    });
  });

  it("serializes a held payment update with concurrent grant and bulk sync", async () => {
    const user = await makeUser();
    const payment = await makePayment(user);
    const entered = deferred();
    const release = deferred();
    updateRemote.mockImplementationOnce(async (uuid: string, values: Partial<RemnawaveUserSnapshot>) => {
      entered.resolve();
      await release.promise;
      return applyRemote(uuid, values);
    });

    const paymentCall = webhook(payment);
    await entered.promise;
    const grantCall = grantSubscriptionByAdmin({
      adminId: user.id, userId: user.id, planId: plan.id, durationDays: 7, trafficGB: 77
    });
    const bulkCall = syncActiveSubscriptionsToRemnawave();
    const concurrent = Promise.allSettled([paymentCall, grantCall, bulkCall] as const);
    try {
      await expect.poll(async () => {
        const [activity] = await prisma.$queryRaw<Array<{ waiting: number }>>`
          SELECT count(*)::int AS waiting
          FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event = 'advisory'
        `;
        return activity?.waiting ?? 0;
      }, { timeout: 5_000 }).toBeGreaterThanOrEqual(2);
    } finally {
      release.resolve();
      await concurrent;
    }
    const results = await concurrent;
    expect(results.map(({ status }) => status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
    if (results[1]?.status !== "fulfilled" || results[2]?.status !== "fulfilled") throw new Error("Concurrent provisioning failed");
    const granted = results[1].value;
    const bulk = results[2].value;

    expect(bulk).toMatchObject({ alreadyLinked: 1, failed: 0 });
    const final = await prisma.subscription.findUniqueOrThrow({ where: { id: granted.id } });
    expect(final.expiresAt).toEqual(new Date(baselineExpiry.getTime() + 37 * DAY));
    expect(remotes.get(user.remnawaveUuid!)).toMatchObject({ expireAt: final.expiresAt!.toISOString() });
  });

  it("recovers a persisted prepared head after interruption without a recorded failure", async () => {
    const user = await makeUser();
    const payment = await makePayment(user);
    const expiresAt = new Date(baselineExpiry.getTime() + 30 * DAY);
    const intent = { startsAt: "2049-01-01T00:00:00.000Z", expiresAt: expiresAt.toISOString(), trafficLimitBytes: String(100n * GB), referralRewardIds: [] };
    await prisma.payment.update({ where: { id: payment.id }, data: {
      activationConfirmedAt: new Date(), activationMeta: intent, activationAttemptedAt: new Date(Date.now() - 180_000)
    } });
    await retryPendingActivations();
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: "SUCCEEDED", activationMeta: intent });
    expect(await prisma.subscription.findUnique({ where: { userId: user.id } })).toMatchObject({ expiresAt });
    expect(getProviderPayment).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("commits provider confirmation together with queue admission so Cron can recover after interruption", async () => {
    const user = await makeUser();
    const payment = await makePayment(user);
    const trigger = `activation_atomic_${randomUUID().replaceAll("-", "")}`;
    await prisma.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Provider confirmation committed without queue admission'; END; $$`);
    try {
      await prisma.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER ${trigger} AFTER UPDATE ON payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.id = '${payment.id}' AND NEW."providerPayload" ->> 'status' = 'succeeded' AND NEW."activationConfirmedAt" IS NULL) EXECUTE FUNCTION ${trigger}()`);
      updateRemote.mockRejectedValueOnce(new Error("Process interrupted after confirmation"));
      await webhook(payment);
      const confirmed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(confirmed).toMatchObject({ status: "PENDING", providerPayload: { status: "succeeded" } });
      expect(confirmed.activationConfirmedAt).not.toBeNull();
      expect(confirmed.activationMeta).not.toBeNull();

      await allowRetry(payment);
      await retryPendingActivations();
      expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: "SUCCEEDED" });
      expect(getProviderPayment).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledTimes(1);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON payments`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`);
    }
  });

  it("rejects the webhook if queue admission cannot commit, then activates once on redelivery", async () => {
    const user = await makeUser();
    const payment = await makePayment(user);
    const trigger = `activation_admission_${randomUUID().replaceAll("-", "")}`;
    await prisma.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Queue admission unavailable'; END; $$`);
    try {
      await prisma.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER ${trigger} AFTER UPDATE ON payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.id = '${payment.id}' AND OLD."activationConfirmedAt" IS NULL AND NEW."activationConfirmedAt" IS NOT NULL) EXECUTE FUNCTION ${trigger}()`);
      await expect(webhook(payment)).rejects.toThrow();
      expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toMatchObject({
        status: "PENDING", activationConfirmedAt: null, activationMeta: null, providerPayload: null
      });
      expect(updateRemote).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();

      await prisma.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON payments`);
      await webhook(payment);
      expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: "SUCCEEDED" });
      expect(notify).toHaveBeenCalledTimes(1);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON payments`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`);
    }
  });

  it("does not let unprepared tails starve an older eligible user's head when the Cron batch is limited", async () => {
    const blockedUsers = [await makeUser(), await makeUser()];
    const independentUser = await makeUser();
    const independent = await makePayment(independentUser);
    const tails: Payment[] = [];
    const heads: Payment[] = [];
    updateRemote.mockRejectedValue(new Error("Remote unavailable"));
    for (const user of blockedUsers) {
      const head = await makePayment(user);
      const tail = await makePayment(user);
      heads.push(head);
      tails.push(tail);
      await webhook(head);
      await webhook(tail);
    }
    await webhook(independent);
    const now = Date.now();
    await prisma.payment.updateMany({ where: { id: { in: heads.map(({ id }) => id) } }, data: {
      activationAttemptedAt: new Date(now - 180_000)
    } });
    await prisma.payment.updateMany({ where: { id: { in: tails.map(({ id }) => id) } }, data: {
      activationConfirmedAt: new Date(now - 240_000)
    } });
    await prisma.payment.update({ where: { id: independent.id }, data: {
      activationAttemptedAt: new Date(now - 600_000)
    } });
    updateRemote.mockImplementation(async (uuid: string, values: Partial<RemnawaveUserSnapshot>) => {
      if (uuid !== independentUser.remnawaveUuid) throw new Error("Blocked user remains unavailable");
      return applyRemote(uuid, values);
    });

    const result = await retryPendingActivations({ limit: 2 });
    expect(result).toEqual({ attempted: 2, recovered: 1 });
    expect(await prisma.payment.findUnique({ where: { id: independent.id } })).toMatchObject({ status: "SUCCEEDED" });
    expect(await prisma.payment.findMany({ where: { id: { in: tails.map(({ id }) => id) } } })).toMatchObject([
      { status: "PENDING", activationMeta: null, activationAttemptedAt: null },
      { status: "PENDING", activationMeta: null, activationAttemptedAt: null }
    ]);
    expect(await prisma.payment.count({ where: { id: { in: heads.map(({ id }) => id) }, status: "SUCCEEDED" } })).toBe(0);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("replays the saved intent after the remote update succeeds but the database commit fails", async () => {
    const user = await makeUser();
    const payment = await makePayment(user);
    const trigger = `activation_test_${randomUUID().replaceAll("-", "")}`;
    await prisma.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Integration test injected commit failure'; END; $$`);
    try {
      await prisma.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER ${trigger} AFTER UPDATE ON payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.id = '${payment.id}' AND NEW.status = 'SUCCEEDED') EXECUTE FUNCTION ${trigger}()`);
      await webhook(payment);
      const failed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(failed.status).toBe(PaymentStatus.PENDING);
      expect(failed.activationMeta).not.toBeNull();
      expect(await prisma.subscription.findUnique({ where: { userId: user.id } })).toMatchObject({ expiresAt: baselineExpiry });
      const remoteExpiry = new Date(baselineExpiry.getTime() + 30 * DAY).toISOString();
      expect(remotes.get(user.remnawaveUuid!)).toMatchObject({ expireAt: remoteExpiry });
      expect(notify).not.toHaveBeenCalled();

      await prisma.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON payments`);
      await allowRetry(payment);
      await retryPendingActivations();
      expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: "SUCCEEDED", activationMeta: failed.activationMeta });
      expect(await prisma.subscription.findUnique({ where: { userId: user.id } })).toMatchObject({ expiresAt: new Date(remoteExpiry) });
      expect(updateRemote.mock.calls.map(([, values]) => values.expireAt)).toEqual([remoteExpiry, remoteExpiry]);
      expect(notify).toHaveBeenCalledTimes(1);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${trigger} ON payments`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`);
    }
  });
});
