# Home RECENT_MESSAGES — Real Data Integration Report

## 1. DONE

## 2. PARTIAL

- unreadCount always 0 (backend fallback) — left as-is per requirements

## 3. NOT DONE

- mark-as-read, unreadCount logic, compose flow, push, realtime

## 4. CHANGED FILES

- `coach-app/app/(tabs)/index.tsx`

## 5. EXACT HOME RECENT_MESSAGES FLOW UPDATED

- **Before:** Static mock `RECENT_MESSAGES` array, each row navigated to `/messages`
- **After:** `getCoachMessages()` on focus, slice(0, 5), rows navigate to `/conversation/:id`
- **States:** loading (spinner), error (message + retry), empty (hint), success (list)
- **CTA:** "Все сообщения" → `/messages` (shown when not loading)

## 6. EXACT API/SERVICE INTEGRATION APPLIED

- `getCoachMessages()` from `@/services/coachMessagesService`
- `GET /api/coach/messages`
- No new endpoints or service logic
- Maps `ConversationCardData` → Home row shape: `name` (from), `preview`, `time`, `unreadCount`

## 7. EXACT FALLBACKS/STATES APPLIED

- **name:** `msg.name ?? 'Диалог'`
- **preview:** `msg.preview ?? '—'`
- **time:** `msg.time || '—'`
- **unread:** `(msg.unreadCount ?? 0) > 0` (bold when true)
- **Loading:** ActivityIndicator + "Загрузка…"
- **Error:** error text + retry button
- **401:** "Требуется авторизация"
- **Empty:** "Пока нет сообщений" + "Диалоги появятся, когда родители напишут"

## 8. REMAINING RISKS

- `getCoachMessages` throws on non-404 — caught, no crash
- On 404, returns [] and marks endpoint unavailable — block shows empty
- unreadCount = 0 — no unread styling until backend supports it
