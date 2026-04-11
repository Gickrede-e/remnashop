#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BACKUP_DIR=${BACKUP_DIR:-"$ROOT_DIR/backups/postgres"}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_PATH="$BACKUP_DIR/postgres-$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"
[ -f "$ROOT_DIR/.env" ] || { echo ".env not found at $ROOT_DIR/.env" >&2; exit 1; }

cd "$ROOT_DIR"
docker compose exec -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$DUMP_PATH"
find "$BACKUP_DIR" -type f -name 'postgres-*.sql' -mtime +"$RETENTION_DAYS" -delete
echo "Backup written to $DUMP_PATH"
