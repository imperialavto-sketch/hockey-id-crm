# Chat Integration Audit

## 1. DONE

Chat layer (ChatConversation / ChatMessage) is wired end-to-end for parent ↔ coach flows. Schema matches migration, API routes use correct Prisma models, dashboard and parent-app consume the chat API.

## 2. PARTIAL

- **Read flow:** `ChatMessage.readAt` exists and is returned by the API, but there is no endpoint or UI to mark messages as read.
- **Coach-app messages tab:** Uses `/api/coach/messages`, which does not exist in Next.js CRM. Coach-app messages are not wired to the chat backend.

## 3. NOT DONE

- PATCH/PUT to mark messages as read
- Coach-app messages backend (separate from parent–coach chat)
- Migration from old `Message` model to `ChatMessage`

## 4. CHANGED FILES

None. No edits were made.

## 5. EXACT CHAT ENTRY POINTS FOUND

| Layer | Path / Location | Purpose |
|-------|-----------------|---------|
| **API** | `GET /api/chat/conversations` | List conversations (parent/coach/admin) |
| **API** | `POST /api/chat/conversations` | Create or get conversation (parent, body: `{ playerId }`) |
| **API** | `GET /api/chat/conversations/[id]` | Get one conversation |
| **API** | `GET /api/chat/conversations/[id]/messages` | List messages |
| **API** | `POST /api/chat/conversations/[id]/messages` | Send message (body: `{ text }`) |
| **API** | `POST /api/chat/ai/message` | Coach Mark AI (parent, separate from human chat) |
| **Lib** | `src/lib/chat.ts` | `getOrCreateConversation(parentId, coachId, playerId)` |
| **Seed** | `prisma/seed.ts` | Creates `chatConversation` + `chatMessage` |
| **Dashboard** | `src/app/(dashboard)/communications/page.tsx` | List chats → `fetch /api/chat/conversations` |
| **Dashboard** | `src/app/(dashboard)/communications/chat/[id]/page.tsx` | Chat thread → fetch conversation + messages, POST message |
| **Parent-app** | `parent-app/services/chatService.ts` | `getConversations`, `getOrCreateConversation`, `getConversationMessages`, `sendMessage` → `/api/chat/conversations*` |

## 6. EXACT ISSUES FOUND

1. **Legacy Message model**
   - `src/app/api/messages/route.ts` uses `prisma.message` (old model: `parentId`, `playerId`, `fromParent`, `body`, `read`).
   - This route is separate from chat; it is not used by the communications UI (which uses `/api/chat/conversations`).
   - Risk: dead or duplicate “messages” path; possible confusion.

2. **Coach-app messages**
   - `coach-app/services/coachMessagesService.ts` calls `GET /api/coach/messages` and `GET /api/coach/messages/:id`.
   - These endpoints do not exist in Next.js CRM.
   - Coach-app messages tab will 404; this is a known gap in `COACH_APP_BACKEND_STRATEGY.md`.

3. **No read/update flow**
   - `ChatMessage.readAt` is stored and returned by the API but never updated.
   - No PATCH/PUT or “mark as read” logic.

4. **`/api/messages` Prisma usage**
   - Uses `new PrismaClient()` instead of shared `prisma` from `@/lib/prisma`.
   - Outside chat scope; left unchanged per audit rules.

## 7. EXACT FIXES APPLIED

None. Only read-only audit was performed.

## 8. REMAINING RISKS

- **Legacy `/api/messages`:** May be linked from other parts of the app or docs; consider deprecating or migrating to chat.
- **Coach-app messages:** Users may see errors or empty state until `/api/coach/messages` (or equivalent) is implemented.
- **Read flow:** Unread indicators or “mark as read” will not work until a backend update is added.
