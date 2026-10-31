-- Repair the partially-applied 20260704120000 migration (Prisma does not wrap
-- migrations in a transaction, so its failure left a hybrid state on databases
-- that had PLATEGA rows):
--   * the original enum was renamed to "PaymentProvider_old" (still holding the
--     payments/webhook_deliveries columns and their PLATEGA data),
--   * an orphan single-value "PaymentProvider" enum was created but never bound
--     to any column, breaking every INSERT that casts to "PaymentProvider".
-- Restore the original enum under its original name. Guarded: databases that
-- never hit the partial failure (fresh installs, dev) have no
-- "PaymentProvider_old" and skip this entirely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PaymentProvider_old'
      AND n.nspname = current_schema()
  ) THEN
    -- The orphan enum has no dependents; DROP fails loudly if that assumption
    -- is ever wrong, leaving the database unchanged.
    DROP TYPE "PaymentProvider";
    ALTER TYPE "PaymentProvider_old" RENAME TO "PaymentProvider";
  END IF;
END $$;
