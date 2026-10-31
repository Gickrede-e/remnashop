-- Remove Telegram authentication: drop User.telegramId and its unique index.
-- (Telegram login-auth code was removed; the column is now unused.)
DROP INDEX IF EXISTS "users_telegramId_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "telegramId";

-- Platega: the provider CODE (routes, service, webhook) is removed, but the
-- "PLATEGA" value is intentionally KEPT in the PaymentProvider enum. Existing
-- databases have historical payment / webhook_delivery rows that reference it,
-- and Postgres cannot drop an enum value still in use (and we must not rewrite
-- or delete those historical records). The application simply never writes
-- PLATEGA again — it is permanently disabled in provider-config. No enum change.
