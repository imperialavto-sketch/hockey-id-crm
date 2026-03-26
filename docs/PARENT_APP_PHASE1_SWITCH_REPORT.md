# Parent-App Backend Switch (Phase 1) Report

## DONE

- Обновлён конфиг parent-app для использования Next.js CRM по умолчанию.
- `.env.example`: `EXPO_PUBLIC_API_URL` по умолчанию указывает на `http://localhost:3000` (Next.js CRM).
- `config/api.ts`: комментарии обновлены — Phase 1 = Next.js CRM; fallback на legacy hockey-server оставлен для совместимости.
- `API.md`: описание выровненных endpoint'ов и Bearer auth.
- `README.md`: рекомендация использовать URL Next.js CRM для production.

Сервисы parent-app не изменялись — они уже используют `apiFetch` с единым `API_BASE_URL` и Bearer token. Переключение backend выполняется через env.

---

## CHANGED FILES

| File | Change |
|------|--------|
| parent-app/config/api.ts | Комментарии: Phase 1 = CRM, fallback = legacy |
| parent-app/.env.example | EXPO_PUBLIC_API_URL=http://localhost:3000, EXPO_PUBLIC_DEVICE_API_URL закомментирован |
| parent-app/API.md | Список Phase 1 endpoint'ов, Bearer auth |
| parent-app/README.md | Рекомендация CRM URL для production |
| docs/PARENT_APP_PHASE1_SWITCH_REPORT.md | NEW — отчёт |

---

## NOW USING NEXT.JS CRM

При `EXPO_PUBLIC_API_URL=http://localhost:3000` (или URL CRM) parent-app использует:

| Сценарий | Сервис | Endpoints |
|----------|--------|-----------|
| Auth | authService | /api/auth/login, register; /api/parent/mobile/auth/request-code, verify, logout |
| Profile | subscriptionService | GET /api/me |
| Schedule | scheduleService | GET /api/me/schedule |
| Players | playerService | GET /api/me/players, GET /api/me/players/:id, POST /api/me/players |
| Subscription | subscriptionService | GET /api/me/subscription/status, history; POST /api/subscription, /api/subscription/cancel; GET /api/subscription/plans |
| Notifications | notificationService | GET /api/notifications, POST /api/notifications/:id/read |
| Player stats | playerService | GET /api/players/:id/stats |
| AI analysis | playerService | GET /api/ai-analysis/:id |

Auth: Bearer token (setAuthToken). parentId берётся из токена на сервере.

---

## STILL LEGACY

Не трогались (P2/P3):

| Сценарий | Сервис | Backend |
|----------|--------|---------|
| Bookings | bookingService | /api/bookings, create-payment-intent, confirm, my — hockey-server / CRM (частично) |
| Team posts/messages | teamService | /api/team/posts, /api/team/members, /api/team/messages |
| Marketplace slots | marketplaceService | /api/marketplace/coaches, slots, booking-request |
| Chat / AI history | chatService | /api/chat/conversations, /api/chat/ai/* |
| Video analysis | videoAnalysisService | /api/video-analysis, /api/video/upload |
| Feed | feedService | /api/feed |
| Recommendations | playerService | GET /api/parent/mobile/player/:id/recommendations |

---

## RISKS

- **Fallback:** при отсутствии `EXPO_PUBLIC_API_URL` используется `https://hockey-server-api.onrender.com` — старый backend.
- **Auth contract:** Next.js CRM auth/login возвращает `{ user, role, mobileToken }`; parent-app ожидает `{ token, parent }` для email+password. Основной flow (phone+code) идёт через verify — нужно проверить формат ответа CRM.
- **EXPO_PUBLIC_DEVICE_API_URL:** закомментирован в .env.example; при тестах на устройстве нужно задать LAN IP вручную.

---

## NEXT RECOMMENDED STEP

Проверить end-to-end: parent-app (EXPO_PUBLIC_API_URL=http://localhost:3000) + Next.js CRM + phone verify flow. Убедиться, что auth и Phase 1 endpoints работают с Bearer token.
