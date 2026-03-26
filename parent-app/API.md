# Parent App API Integration

## Configuration

Set `EXPO_PUBLIC_API_URL` in `.env` (copy from `.env.example`). Phase 1: Next.js CRM.

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

- **Physical device / Expo Go**: Use your computer's LAN IP (e.g. `http://192.168.1.100:3000`)
- **iOS Simulator**: `http://localhost:3000`
- **Android Emulator**: `http://10.0.2.2:3000`

## Backend (Phase 1 — Next.js CRM)

The parent app calls the Next.js CRM backend. Auth: Bearer token (set via `setAuthToken`).

**Phase 1 aligned endpoints:**
- `GET /api/me` — current parent profile
- `GET /api/me/schedule` — parent's schedule
- `GET /api/me/players`, `GET /api/me/players/[id]`, `POST /api/me/players` — players
- `GET /api/me/subscription/status`, `GET /api/me/subscription/history` — subscription
- `POST /api/subscription`, `POST /api/subscription/cancel` — subscription actions
- `GET /api/notifications`, `POST /api/notifications/[id]/read` — notifications
- `GET /api/players/[id]/stats` — player stats
- `GET /api/ai-analysis/[id]` — AI analysis

Auth: Bearer token required. parentId from token (no x-parent-id).

## Fallback

When the API is unavailable (backend not running, no network), the app uses local mock data so it remains usable.
