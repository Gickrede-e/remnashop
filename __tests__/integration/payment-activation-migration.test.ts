import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../prisma/migrations/20260919120000_separate_payment_activation/migration.sql", import.meta.url), "utf8");
type MigrationConnection = {
  connect(): Promise<void>;
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end(): Promise<void>;
};
const { Client } = createRequire(import.meta.url)("pg") as {
  Client: new (options: { connectionString?: string }) => MigrationConnection;
};
let db: MigrationConnection;

describe("durable activation migration", () => {
  beforeEach(async () => {
    db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await db.connect();
    // Connection-local tables shadow public names. The real migrated schema is untouched.
    await db.query(`
      CREATE TEMP TABLE payments (
        id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, status TEXT NOT NULL,
        "subscriptionId" TEXT, "providerPayload" JSONB,
        "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) DEFAULT now()
      );
      CREATE TEMP TABLE promo_codes (id TEXT PRIMARY KEY, "currentUsages" INTEGER NOT NULL);
      CREATE TEMP TABLE promo_usages ("paymentId" TEXT, "promoCodeId" TEXT, status TEXT NOT NULL);
    `);
  });

  afterEach(async () => { await db.end(); });

  it("preserves saved calculations and restores only paid retry promo reservations", async () => {
    const meta = { startsAt: "2026-09-01T00:00:00.000Z", expiresAt: "2026-10-01T00:00:00.000Z", trafficLimitBytes: "1000", referralRewardIds: ["reward-1"] };
    await db.query(`INSERT INTO payments (id, "userId", status, "providerPayload") VALUES
      ('paid', 'u1', 'PENDING', $1), ('unpaid', 'u2', 'FAILED', '{}')`,
    [JSON.stringify({ activationState: "PROVISION_FAILED", activationMeta: meta })]);
    await db.query(`INSERT INTO promo_codes VALUES ('promo', 0);
      INSERT INTO promo_usages VALUES ('paid', 'promo', 'FAILED'), ('unpaid', 'promo', 'FAILED');`);

    await db.query(migration);

    const paid = (await db.query('SELECT * FROM payments WHERE id = $1', ["paid"])).rows[0];
    expect(paid.activationMeta).toEqual(meta);
    expect((paid.providerPayload as Record<string, unknown>).activationMeta).toEqual(meta);
    expect(paid.activationConfirmedAt).toBeInstanceOf(Date);
    expect(paid.activationAttemptedAt).toEqual(paid.activationConfirmedAt);
    const unpaid = (await db.query('SELECT * FROM payments WHERE id = $1', ["unpaid"])).rows[0];
    expect(unpaid.activationConfirmedAt).toBeNull();
    expect((await db.query('SELECT "currentUsages" FROM promo_codes')).rows[0].currentUsages).toBe(1);
    expect((await db.query('SELECT status FROM promo_usages WHERE "paymentId" = $1', ["paid"])).rows[0].status).toBe("PENDING");
    expect((await db.query('SELECT status FROM promo_usages WHERE "paymentId" = $1', ["unpaid"])).rows[0].status).toBe("FAILED");
  });

  it("rolls back all schema changes when legacy overlapping intents need reconciliation", async () => {
    await db.query(`INSERT INTO payments (id, "userId", status, "providerPayload") VALUES
      ('first', 'same-user', 'PENDING', '{"activationMeta":{}}'),
      ('second', 'same-user', 'PENDING', '{"activationMeta":{}}')`);

    await expect(db.query(migration)).rejects.toThrow("Multiple unfinished legacy activation intents");
    await db.query("ROLLBACK");

    const columns = await db.query(`SELECT attname FROM pg_attribute WHERE attrelid = 'pg_temp.payments'::regclass AND attnum > 0 AND NOT attisdropped`);
    expect(columns.rows.map((row) => row.attname)).not.toContain("activationConfirmedAt");
    expect((await db.query('SELECT count(*)::int AS count FROM payments')).rows[0].count).toBe(2);
  });
  it("refuses to guess a calculation when a confirmed legacy payment lost its intent", async () => {
    await db.query(`INSERT INTO payments (id, "userId", status, "providerPayload") VALUES
      ('lost', 'u1', 'PENDING', '{"lastProviderSync":{"status":"SUCCEEDED"}}')`);
    await expect(db.query(migration)).rejects.toThrow("Missing legacy activation intent");
    await db.query("ROLLBACK");
    expect((await db.query('SELECT "providerPayload" FROM payments')).rows[0].providerPayload)
      .toEqual({ lastProviderSync: { status: "SUCCEEDED" } });
  });

});
