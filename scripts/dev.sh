#!/usr/bin/env bash
# CRM dev server — listen on all interfaces (0.0.0.0) for LAN (mobile app on physical device)
# Command: npx next dev -H 0.0.0.0 -p 3000
ulimit -n 65536 2>/dev/null || true
export WATCHPACK_WATCHER_LIMIT=20
exec npx next dev -H 0.0.0.0 -p 3000
