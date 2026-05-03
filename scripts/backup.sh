#!/usr/bin/env bash
# pg_dump → AES256 GPG (passphrase from .env) → BACKUP_DIR. Same encryption format
# as the in-compose `backup` service so artifacts are interchangeable.
# Usage: ./scripts/backup.sh
# Restore: gpg -d --batch --passphrase "$BACKUP_GPG_PASSPHRASE" file.sql.gpg | psql ...
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/backups/postgres"}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_PATH="$BACKUP_DIR/postgres-$TIMESTAMP.sql.gpg"

mkdir -p "$BACKUP_DIR"
[ -f "$ROOT_DIR/.env" ] || { echo ".env not found at $ROOT_DIR/.env" >&2; exit 1; }

# shellcheck disable=SC1091
set -a; . "$ROOT_DIR/.env"; set +a

if [ -z "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  echo "BACKUP_GPG_PASSPHRASE is not set in .env" >&2
  exit 1
fi

cd "$ROOT_DIR"
docker compose exec -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gpg --symmetric --cipher-algo AES256 --batch --yes \
        --passphrase "$BACKUP_GPG_PASSPHRASE" --output "$DUMP_PATH"
find "$BACKUP_DIR" -type f -name 'postgres-*.sql.gpg' -mtime +"$RETENTION_DAYS" -delete
echo "Encrypted backup written to $DUMP_PATH"
