# Debug iPhone → Backend Reachability

## 1. Health endpoints (no auth)

Test from iPhone Safari or the app:

- **Ping:** `http://<YOUR_MAC_IP>:3000/api/ping` → `{ ok: true, message: "pong" }`
- **Health:** `http://<YOUR_MAC_IP>:3000/api/health` → `{ ok: true, env, timestamp }`

## 2. Server must listen on all interfaces

Use:

```bash
npx next dev -H 0.0.0.0 -p 3000
```

`scripts/dev.sh` already does this when you run `npm run dev`.

## 3. Use mock mode to bypass Prisma

Add to `.env`:

```
PARENT_API_USE_MOCK=1
```

Restart the server. Then `/api/parent/mobile/players` and `/api/parent/mobile/player/[id]/full-profile` return lightweight mock JSON immediately (no DB).

## 4. Check logs

When a request hits the server you'll see:

- `[parent/mobile/players] request started` + timestamp
- `[parent/mobile/player/[id]/full-profile] request started` + timestamp

If you never see these, the request is not reaching the server (network/firewall).

## 5. Verify same network + correct IP

iPhone and Mac must be on the same WiFi.

Get your Mac IP and the exact line for `.env`:

```bash
npm run ip
```

Put the output into `parent-app/.env`. Restart Expo after changing.

## 6. Если iPhone не видит Mac (timeout) — используй Tunnel

Когда LAN IP недоступен (разные WiFi, firewall):

1. Установи ngrok: `brew install ngrok` или скачай с ngrok.com
2. Запусти backend: `npm run dev`
3. В **отдельном терминале**: `ngrok http 3000`
4. Скопируй HTTPS URL (например `https://abc123.ngrok.io`)
5. В parent-app `.env` задай: `EXPO_PUBLIC_API_URL=https://abc123.ngrok.io`
6. Перезапусти Expo в parent-app

Теперь приложение обратится к backend через публичный URL.
