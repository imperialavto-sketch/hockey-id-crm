#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PHONE="${PHONE:-+79991234567}"
CODE="${CODE:-1234}"

echo "== request-code (${PHONE}) =="
curl -sS -X POST "${BASE_URL}/api/auth/request-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\"}" | python3 -m json.tool

echo
echo "== verify-code (${PHONE}, code=${CODE}) =="
curl -sS -X POST "${BASE_URL}/api/auth/verify-code" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\",\"code\":\"${CODE}\"}" | python3 -m json.tool

echo
echo "== fallback check hint =="
echo "Запустите с проблемным номером:"
echo "PHONE=+79634888885 BASE_URL=${BASE_URL} bash scripts/test-phone-auth.sh"
