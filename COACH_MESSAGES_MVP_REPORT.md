# Coach Messages MVP Backend — Report

## 1. DONE

## 2. PARTIAL

- **unreadCount:** Always 0 (readAt not tracked). No mutation to mark as read.

## 3. NOT DONE

- Read/unread tracking and mutations
- "New message" flow (coach-app routes to /unavailable)

## 4. CHANGED FILES

- `src/app/api/coach/messages/route.ts` — new (GET list)
- `src/app/api/coach/messages/[id]/route.ts` — new (GET detail)
- `src/app/api/coach/messages/[id]/send/route.ts` — new (POST send)

## 5. EXACT COACH-APP ENDPOINTS EXPECTED

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/coach/messages` | List conversations |
| GET | `/api/coach/messages/:conversationId` | Conversation detail with messages |
| POST | `/api/coach/messages/:conversationId/send` | Send message (body: `{ text }`) |

No query params. Auth: Bearer (getCoachAuthHeaders).

## 6. EXACT RESPONSE SHAPE IMPLEMENTED

**GET /api/coach/messages** — `ConversationApiItem[]`:
```ts
{
  id: string;
  title: string;           // "${parentName} ↔ ${playerName}"
  playerId: string;
  groupName: string;       // playerName
  lastMessage?: string;    // last message text
  lastMessageAt: string;   // ISO or last msg createdAt
  unreadCount: number;     // 0 (fallback)
  participants?: string[]; // [parentName, coachName]
  kind: string;            // "parent"
}
```

**GET /api/coach/messages/:id** — `ConversationDetailApiItem`:
```ts
{
  id: string;
  title: string;
  playerId: string;
  groupName: string;
  participants?: string[];
  messages: Array<{
    id: string;
    senderName: string;
    senderRole: "parent" | "coach";
    text: string;
    createdAt: string;     // ISO
    isOwn: boolean;        // true when senderType === "coach"
  }>;
}
```

**POST /api/coach/messages/:id/send** — `SendMessageApiResponse`:
```ts
{
  id: string;
  senderName: string;
  senderRole: "coach";
  text: string;
  createdAt: string;       // ISO
  isOwn: true;
}
```

## 7. EXACT FIXES APPLIED

- Added 3 route files. No changes to existing code.

## 8. FALLBACKS USED

- **unreadCount:** 0 (no readAt tracking in MVP)
- **lastMessage:** undefined when no messages (client uses `?? '—'`)
- **lastMessageAt:** falls back to `conv.updatedAt` when no messages
- **senderName:** "Тренер" if Coach lookup fails

## 9. REMAINING RISKS

- Coach with `user.teamId` but team without `coachId` → empty list
- `x-coach-id` dev header not supported by getAuthFromRequest → 401 in dev without token
- Push notification (sendPushToParent) may fail silently
