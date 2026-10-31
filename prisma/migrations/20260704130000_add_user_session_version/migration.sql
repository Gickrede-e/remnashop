-- Session revocation: bump this on password change/reset to invalidate all
-- previously-issued session JWTs (they embed the value and are rejected when it
-- no longer matches).
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
