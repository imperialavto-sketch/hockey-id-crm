# Parent App API Integration

## Configuration

Set `EXPO_PUBLIC_API_URL` in `.env` (copy from `.env.example`):

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

- **Physical device / Expo Go**: Use your computer's LAN IP (e.g. `http://192.168.1.100:3000`)
- **iOS Simulator**: `http://localhost:3000`
- **Android Emulator**: `http://10.0.2.2:3000`

## Backend

The parent app calls the Hockey ID CRM backend:

- `GET /api/parent/mobile/players` — players list
- `GET /api/parent/mobile/player/[id]` — player details
- `GET /api/parent/mobile/player/[id]/stats` — player stats
- `GET /api/parent/mobile/player/[id]/schedule` — player trainings
- `GET /api/parent/mobile/player/[id]/recommendations` — coach recommendations
- `GET /api/parent/mobile/schedule` — weekly schedule (uses first team in dev)

In development, these routes work without auth. In production, PARENT role auth is required.

## Fallback

When the API is unavailable (backend not running, no network), the app uses local mock data so it remains usable.
