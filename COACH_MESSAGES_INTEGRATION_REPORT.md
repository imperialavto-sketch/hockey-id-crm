# Coach Messages Integration + QA Pass — Report

## 1. DONE

## 2. PARTIAL

- **Scroll to bottom on load:** Added; may not fire reliably on very fast renders.
- **"Новое сообщение":** CTA removed; parent-initiated compose flow not implemented.

## 3. NOT DONE

- Mark-as-read, unreadCount logic
- Push rework
- New conversation compose flow (parent creates from their app)

## 4. CHANGED FILES

- `coach-app/lib/api.ts` — added `isApi401`
- `coach-app/services/coachMessagesService.ts` — metadata mapping (no cuid), send catch returns null
- `coach-app/app/(tabs)/messages.tsx` — 401 error message, removed "Новое сообщение" CTA, removed unused style
- `coach-app/app/conversation/[id].tsx` — fetchConversation with retry, loadError state, scroll to end on load, retry/back buttons on error

## 5. EXACT SCREENS/FLOWS UPDATED

- **Messages tab** (`app/(tabs)/messages.tsx`): List with loading, error (incl. 401), empty, retry; "Новое сообщение" removed
- **Conversation detail** (`app/conversation/[id].tsx`): Load error with retry and back, scroll to bottom on load, send flow unchanged

## 6. EXACT API INTEGRATION APPLIED

- Already wired: `getCoachMessages`, `getCoachConversation`, `sendCoachMessage` to `/api/coach/messages*`
- No new API calls; behavior clarified and error handling improved

## 7. EXACT UX/STATE FIXES APPLIED

- **401:** List shows "Требуется авторизация" instead of generic error
- **Metadata:** Parent chats show `groupName` only (no playerId/cuid)
- **New message CTA:** Removed (parent-initiated flow not supported)
- **Conversation load error:** Retry and Back buttons, `loadError` message
- **Scroll:** Scroll to end when conversation loads with messages
- **Send:** Existing protection (trim, sending flag, disabled button) retained

## 8. REMAINING RISKS

- Dev without token: 401 with "Требуется авторизация" (no crash)
- `isEndpointUnavailable` can stay set from prior 404 until app restart
- Scroll on load may race with layout on slow devices
