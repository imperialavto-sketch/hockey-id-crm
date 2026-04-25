# Phase 2 — Live Coach Session Backend Integration

## 1. DONE

## 2. PARTIAL

- **Reset session:** "Сбросить сессию" clears local draft only; server-backed active session is not abandoned. User will reconnect to the same session on next visit.
- **teamId:** Coach-app uses `DEFAULT_TEAM_ID = "u12"`. Real team IDs from teams API are not wired into the session flow yet.

## 3. NOT DONE

- Messages, reports, actions, parent drafts (out of scope)
- Server-side "abandon session" endpoint for reset flow
- Passing real `teamId` from coach teams into session start/resume

## 4. CHANGED FILES

### Backend (Next.js CRM)

- `prisma/schema.prisma` — added `teamId`, made `endedAt` nullable on CoachSession
- `prisma/migrations/20250323000000_add_live_session_fields/migration.sql` — new migration
- `src/app/api/coach/sessions/start/route.ts` — new
- `src/app/api/coach/sessions/active/route.ts` — new
- `src/app/api/coach/observations/route.ts` — new
- `src/app/api/coach/sessions/[sessionId]/observations/route.ts` — new
- `src/app/api/coach/sessions/[sessionId]/review/route.ts` — new
- `src/app/api/coach/sessions/sync/route.ts` — updated for existing live sessions (endedAt, replace observations/snapshots/drafts)

### Coach-App

- `coach-app/services/coachSessionLiveService.ts` — `CreateObservationPayload` updated (playerName, optional teamId); POST observations only when session is server-backed
- `coach-app/app/coach-input.tsx` — call `createCoachObservation` only when `!sessionId.startsWith("session_local_")`, pass `playerName`

## 5. LIVE SESSION MODEL USED

- **CoachSession:** `sessionId` (unique, e.g. `sess_xxx` or `session_local_xxx`), `teamId?`, `endedAt?` (null = active)
- **Active session:** `coachUserId` + `teamId` match, `endedAt = null`
- **Ownership:** All endpoints scope by `coachUserId` from auth
- **Local fallback:** When start/active 404 or network fails → `session_local_${Date.now()}`, observations local-only
- **Review source:** API when available; otherwise local state (sessionReviewCenterHelpers)

## 6. EXACT ENDPOINTS ADDED OR CHANGED

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/coach/sessions/start` | Start session (body: `{ teamId }`). Reuses existing active session if any. |
| GET | `/api/coach/sessions/active?teamId=` | Return active session for coach (optional team filter) |
| POST | `/api/coach/observations` | Add observation (body: `sessionId`, `playerId`, `skillKey?`, `score?`, `noteText?`, `playerName?`) |
| GET | `/api/coach/sessions/[sessionId]/observations` | List observations for session |
| GET | `/api/coach/sessions/[sessionId]/review` | Session review summary |
| POST | `/api/coach/sessions/sync` | **Changed:** when session exists (e.g. live-started), updates `endedAt`, replaces observations/snapshots/drafts from payload |

## 7. EXACT COACH-APP FLOWS NOW SERVER-BACKED

- **Start session:** `POST /api/coach/sessions/start` → `sessionId`, `startedAt`
- **Resume active session:** `GET /api/coach/sessions/active` → hydrate with `GET /api/coach/sessions/:id/observations`
- **Add observation:** `POST /api/coach/observations` when session id does not start with `session_local_`
- **Session review:** `GET /api/coach/sessions/:id/review` when loading review summary
- **Sync/end:** `POST /api/coach/sessions/sync` with full bundle; for server-started sessions, backend finalizes (endedAt, replace data)

## 8. WHAT STILL REMAINS LOCAL OR TEMPORARY

- **Local fallback:** Used when backend returns 404 or network fails (start → local session, observations local-only)
- **Reset session:** Clears local draft only; no server "abandon" call
- **teamId:** Uses `DEFAULT_TEAM_ID = "u12"`; real team IDs not wired
- **endpointAvailability:** 404 marks endpoints unavailable; local fallback until next app launch

## 9. RISKS

- Orphan active sessions if user resets locally without server abandon
- `DEFAULT_TEAM_ID` may not match any real team; active session lookup can fail
- Sync replace logic overwrites server observations with bundle; concurrent edits could be lost (low risk for single-coach flow)

## 10. EXACT MANUAL TEST CHECKLIST

1. **Migration:** `npx prisma migrate deploy` (DB must be running)
2. **Start session:** Login as coach → coach-input → tap "Начать тренировку" → verify session id starts with `sess_`
3. **Add observation:** Add observation → verify POST to `/api/coach/observations` (network tab)
4. **Resume:** Leave coach-input (do not finish) → close app → reopen → Home shows "Продолжить тренировку" → tap → verify session and observations restored
5. **Finish + sync:** Finish session → confirm → verify sync success, `sessionSyncStateMap` shows "synced"
6. **Review:** Session review screen shows counts and player summaries (from API when available)
7. **Offline fallback:** Disconnect network → start session → verify alert "Сессия создана локально"
8. **Sync existing:** Start session via API, add observations, finish → verify sync updates existing session (no duplicate CoachSession)
