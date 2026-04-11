# Runbook

## First deploy

### Prerequisites

- Linux host with Docker Engine and the Docker Compose plugin installed
- DNS for `SITE_ADDRESS` pointed at the host before enabling public traffic
- A populated [`.env.example`](../.env.example) copied to `.env`

### `.env` checklist

- Replace every `REPLACE_WITH_...` secret before starting the stack
- Set `SITE_ADDRESS` and `NEXT_PUBLIC_SITE_URL` to the real public hostname
- Set `ADMIN_EMAILS` and `ADMIN_INITIAL_PASSWORD` before the first `db:seed`
- Confirm payment, SMTP, and Remnawave credentials against the live providers

### Bring the stack up

```bash
docker compose up -d
docker compose ps
```

### Health verification

```bash
curl -I https://<host>/api/health
docker compose logs migrate --tail=50
docker compose logs app --tail=50
```

Expected result:

- `migrate` exits successfully after `npx prisma migrate deploy`
- `/api/health` returns `200`
- Response headers include `Strict-Transport-Security`, `Permissions-Policy`, and `Content-Security-Policy-Report-Only`

### GitHub merge gate

- In GitHub repository settings, enable branch protection for `main`
- Mark the `CI` workflow as a required status check so failed lint or test runs block merges

## Schema change workflow

1. Make the Prisma schema change locally.
2. Generate a migration with `npx prisma migrate dev --name <slug>`.
3. Review the generated SQL in `prisma/migrations/<timestamp>_<slug>/migration.sql`.
4. Commit both the schema change and the generated migration files.
5. Run `npm run lint` and `npm run test` before pushing.
6. Deploy normally with `docker compose up -d`; the `migrate` service applies the committed migration automatically.

Never run `prisma db push` against production. If a migration is missing, treat that as a release blocker and fix the branch before deploying.

## Postgres backup

The repository includes [scripts/backup.sh](../scripts/backup.sh), which runs `pg_dump` inside the `postgres` container and deletes dumps older than 7 days.

Example nightly cron job:

```cron
0 2 * * * cd /opt/remnashop && BACKUP_DIR=/var/backups/remnashop ./scripts/backup.sh >> /var/log/remnashop-backup.log 2>&1
```

Recommended host directory:

- `/var/backups/remnashop` with root-only write access

## Restore drill

1. Stop public traffic: `docker compose stop app worker caddy`
2. If needed, recreate the Postgres volume:

```bash
docker compose down
docker volume ls | grep postgres_data
docker volume rm <project>_postgres_data
docker compose up -d postgres
```

3. Restore the dump into the fresh Postgres container:

```bash
cat /var/backups/remnashop/postgres-YYYYMMDD-HHMMSS.sql | \
  docker compose exec -T postgres \
    sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

4. Start the full stack again:

```bash
docker compose up -d
docker compose ps
```

5. Verify login, dashboard access, and payment webhooks on the restored instance before reopening public traffic.

## Rotating secrets

Rotate these values together when credentials are suspected to be stale or exposed:

- `JWT_SECRET`
- `CRON_SECRET`
- `REMNAWAVE_API_TOKEN`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_WEBHOOK_SECRET`
- `PLATEGA_API_KEY`
- `PLATEGA_WEBHOOK_SECRET`
- `SMTP_PASS`

Recommended order:

1. Update the provider-side secret first if the provider requires an exact shared secret.
2. Edit `.env` on the host.
3. Restart the application services with `docker compose up -d migrate app worker`.
4. Verify login, cron endpoints, email delivery, and payment webhooks.
5. Rotate `ADMIN_INITIAL_PASSWORD` immediately after the first admin login or any manual reseed; it should never remain a long-lived shared password.

## Reading webhook errors

Webhook failures are emitted as JSON lines to stdout from the `app` container.

```bash
docker compose logs app | grep webhook.failed
```

Each line includes:

- `provider`
- `paymentId`
- `error.message`

Use these log lines together with the admin log entry `PAYMENT_WEBHOOK_ERROR` to trace failed payment callbacks.
