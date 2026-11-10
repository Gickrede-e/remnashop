# Validation and debugging

## Choose checks for the change

- For code, schema or build configuration, run lint and the unit tests listed in [AGENTS.md](../../AGENTS.md).
  Add the integration tests when the change touches the database, payments or activations, and the browser
  tests when it changes pages or client behaviour. CI (`.github/workflows/ci.yml`) runs all of them.
- For documentation-only changes, check whitespace, local links/references and instruction consistency.
  Tests and builds do not validate prose.
- Every behavioral bug fix ships with a regression test. Plant the fault and watch the new test fail, then
  restore the fix and confirm it passes. A first green run alone does not establish that a test can detect
  the fault.

## Integration tests

`vitest.integration.config.ts` refuses to run unless `TEST_DATABASE_URL` is a PostgreSQL URL whose database
name contains `test` and not `prod`. Apply migrations to that database first (`npx prisma migrate deploy`
with `DATABASE_URL` set to it). Never point it at a real database.

## Schema changes

Create migrations with `npm run db:migrate` and commit them under `prisma/migrations/`. Production applies them
automatically before the app starts (see [DELIVERY.md](DELIVERY.md)), so a migration must work against
existing data.

## Visual changes

Run the dev server through the `.claude/launch.json` preview and check the page in the browser.
