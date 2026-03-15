#!/usr/bin/env bash
# Backup PostgreSQL database for Hockey ID CRM.
# Uses DATABASE_URL from .env (or pass as first argument).
# Usage: ./scripts/backup-database.sh [optional_output_file]

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
mkdir -p "$BACKUP_DIR"

if [ -n "$1" ]; then
  OUT_FILE="$1"
else
  OUT_FILE="${BACKUP_DIR}/hockey_crm_$(date +%Y%m%d_%H%M%S).sql"
fi

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set. Add to .env or pass connection string." >&2
  exit 1
fi

# pg_dump compatible URL (postgresql://user:pass@host:port/dbname)
pg_dump "$DATABASE_URL" --no-owner --no-acl -F p -f "$OUT_FILE"
echo "Backup saved: $OUT_FILE"
