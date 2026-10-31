BEGIN;

-- Provider snapshots must never replace durable activation intent.
ALTER TABLE "payments"
  ADD COLUMN "activationConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "activationMeta" JSONB,
  ADD COLUMN "activationAttemptedAt" TIMESTAMP(3);

-- Old overlapping intents have no trustworthy baseline for stacking durations.
-- Refuse an automatic conversion rather than silently lose a paid extension.
DO $$
BEGIN
  IF EXISTS (
    SELECT "userId" FROM "payments"
    WHERE ("status" <> 'SUCCEEDED' OR "subscriptionId" IS NULL)
      AND jsonb_typeof("providerPayload"->'activationMeta') = 'object'
    GROUP BY "userId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple unfinished legacy activation intents for one user; reconcile before migrating';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "payments"
    WHERE ("status" <> 'SUCCEEDED' OR "subscriptionId" IS NULL)
      AND ("status" = 'SUCCEEDED'
        OR "providerPayload"->>'activationState' IN ('PROCESSING', 'PROVISION_FAILED', 'DONE')
        OR "providerPayload"->'lastProviderSync'->>'status' = 'SUCCEEDED')
      AND jsonb_typeof("providerPayload"->'activationMeta') IS DISTINCT FROM 'object'
  ) THEN
    RAISE EXCEPTION 'Missing legacy activation intent for a confirmed payment; reconcile before migrating';
  END IF;
END $$;

UPDATE "payments"
SET "activationConfirmedAt" = COALESCE("paidAt", "createdAt"),
    "activationMeta" = CASE
      WHEN jsonb_typeof("providerPayload"->'activationMeta') = 'object'
      THEN "providerPayload"->'activationMeta'
    END
WHERE "status" = 'SUCCEEDED'
   OR "providerPayload"->>'activationState' IN ('PROCESSING', 'PROVISION_FAILED', 'DONE')
   OR "providerPayload"->'lastProviderSync'->>'status' = 'SUCCEEDED';

-- A prepared legacy head must stay ahead of unprepared purchases.
UPDATE "payments" SET "activationAttemptedAt" = "activationConfirmedAt"
WHERE "activationMeta" IS NOT NULL;

-- The old failure handler released promo reservations for already-paid retries.
-- Restore only those reservations; the payment still owes its original benefit.
WITH restored AS (
  UPDATE "promo_usages" AS usage SET "status" = 'PENDING'
  FROM "payments" AS payment
  WHERE usage."paymentId" = payment."id"
    AND usage."status" = 'FAILED'
    AND payment."activationConfirmedAt" IS NOT NULL
    AND (payment."status" <> 'SUCCEEDED' OR payment."subscriptionId" IS NULL)
  RETURNING usage."promoCodeId"
), totals AS (
  SELECT "promoCodeId", count(*) AS count FROM restored GROUP BY "promoCodeId"
)
UPDATE "promo_codes" AS promo
SET "currentUsages" = promo."currentUsages" + totals.count
FROM totals WHERE promo."id" = totals."promoCodeId";

CREATE INDEX "payments_userId_activationConfirmedAt_idx"
  ON "payments"("userId", "activationConfirmedAt");

COMMIT;
