# Chat dedupe stabilization — Phase 7E

## A. Goal

Stop **noisy Prisma unique-constraint errors** on **expected** concurrent “ensure conversation” paths while **preserving** dedupe semantics (`messengerDedupeKey` and coach-parent composite unique), **without** redesigning chat product logic or changing API contracts.

## B. Root cause

1. **`messengerDedupeKey` (`@unique`)**  
   `getOrCreateTeamParentChannel`, `getOrCreateTeamAnnouncementChannel`, and `getOrCreateParentParentConversation` used **`findFirst` → `create`**. Under concurrent requests (e.g. coach opening inbox → `GET /api/chat/conversations` calling `getOrCreateTeamParentChannel`), two workers could both see “no row” and **`create` the same dedupe key**, producing **P2002** on `messengerDedupeKey`.

2. **Prisma logging**  
   `src/lib/prisma.ts` enables **`log: ["error"]` in production**. Failed queries are logged **even when application code catches the error**, so recovered races still produced **`prisma:error`** noise.

3. **Coach ↔ parent direct (composite unique)**  
   `getOrCreateConversation` in `src/lib/chat.ts` used **`findUnique` → `create`**. Parallel **`POST /api/chat/conversations`** with the same `(playerId, parentId, coachId)` could race on **`@@unique([playerId, parentId, coachId])`** (same class of issue; error metadata may name the constraint fields rather than `messengerDedupeKey`).

## C. Files changed

| File | Change |
|------|--------|
| `src/lib/messenger-service.ts` | Replaced try/catch `create` with **`createMany` + `skipDuplicates: true`** + **`findFirst`** for parent-parent (in transaction), team parent channel, and team announcement channel. |
| `src/lib/chat.ts` | Replaced bare **`create`** with **`createMany` + `skipDuplicates: true`** + **`findUnique`** on composite for coach-parent direct. |
| `docs/CHAT_DEDUPE_STABILIZATION_PHASE_7E.md` | This document. |

## D. Exact fix

- **`createMany({ skipDuplicates: true })`** inserts at most one row; concurrent duplicates on the relevant unique index are **skipped without throwing**, so Prisma does not emit an error-level query failure for that race.
- A follow-up **`findFirst` / `findUnique`** returns the row that exists after the ensure (whether we inserted or a peer did).
- **Dedupe keys and composite unique are unchanged**; no schema migration; no removal of protection.

## E. Remaining risks

| Risk | Note |
|------|------|
| **Other call sites** | Any remaining `chatConversation.create` paths (outside this scope) could still race if they duplicate a guarded key. |
| **`CREATE_*_FAILED`** | If `createMany` succeeds with `count: 0` (duplicate) but **`findFirst` returns null** (extremely unlikely: delete in same window), helpers still throw — same as before for “unexpected empty” semantics. |
| **hockey-server** | Legacy `hockey-server/server.js` chat routes use a different schema/shape; not updated here. |

## F. Recommended next phase

1. **Full product test** of parent POST conversation, coach inbox load, parent–parent messaging bootstrap, under light parallel load (e.g. double-tab / repeated navigation).  
2. **Optional:** add a small integration test that fires concurrent `getOrCreateTeamParentChannel` / `getOrCreateConversation` and asserts a single row and **200** responses.  
3. **Later:** consider `upsert`-style patterns where Prisma supports a single round-trip for a given unique selector (tradeoffs vs `createMany` + read).
