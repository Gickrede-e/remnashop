-- Atomic promo counter: track per-usage state so failed activations can be rolled back
CREATE TYPE "PromoUsageStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
ALTER TABLE "promo_usages" ADD COLUMN "status" "PromoUsageStatus" NOT NULL DEFAULT 'PENDING';
UPDATE "promo_usages" SET "status" = 'SUCCEEDED';
CREATE INDEX "promo_usages_promoCodeId_status_idx" ON "promo_usages"("promoCodeId", "status");
CREATE INDEX "promo_usages_userId_idx" ON "promo_usages"("userId");

-- Verification token brute-force counter
ALTER TABLE "verification_tokens" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "verification_tokens" ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5;

-- FK indexes for query performance
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_planId_idx" ON "payments"("planId");
CREATE INDEX "payments_promoCodeId_idx" ON "payments"("promoCodeId");
CREATE INDEX "referral_rewards_referredUserId_idx" ON "referral_rewards"("referredUserId");
CREATE INDEX "subscriptions_status_expiresAt_idx" ON "subscriptions"("status", "expiresAt");

-- Webhook delivery deduplication
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "webhook_deliveries_provider_externalEventId_key" ON "webhook_deliveries"("provider", "externalEventId");
