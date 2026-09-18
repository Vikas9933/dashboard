#!/usr/bin/env bash
# Automated Supabase database backup script
# Requires: supabase CLI logged in, or DATABASE_URL env var with pg_dump
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

if command -v supabase &> /dev/null; then
  echo "Running supabase db dump..."
  supabase db dump -f "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
elif [ -n "${DATABASE_URL:-}" ]; then
  echo "Running pg_dump via DATABASE_URL..."
  pg_dump "$DATABASE_URL" -f "$BACKUP_DIR/backup_${TIMESTAMP}.sql"
else
  echo "Error: install Supabase CLI or set DATABASE_URL for pg_dump."
  exit 1
fi

echo "Backup saved to $BACKUP_DIR/backup_${TIMESTAMP}.sql"

# Optional: keep only last 7 backups
ls -t "$BACKUP_DIR"/backup_*.sql 2>/dev/null | tail -n +8 | xargs -r rm --
