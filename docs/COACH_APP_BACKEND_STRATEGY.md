# Coach-App Backend Strategy — Audit & Implementation Plan

**Date:** 2025-03-23  
**Scope:** coach-app backend dependencies, auth, and canonical backend ownership  
**Status:** Audit / planning pass — no broad implementation

---

## 1. DONE

- Contract inventory of coach-app backend dependencies
- Auth analysis (coach-app vs hockey-server vs Next.js CRM)
- Backend strategy options evaluation (A, B, C)
- Recommended strategy with justification
- Critical path implementation plan (Phase 1–3)
- Canonical endpoint ownership plan
- Frontend impact analysis
- Risks and ambiguities documented

---

## 2. PARTIAL

- **Session sync response:** Next.js returns `{ ok, sessionId, syncedAt, savedCounts }`; coach-app expects `{ sessionId?, syncedAt? }`. Coach-app accepts extra fields (`res ?? {}`), so it works, but coach-app does not consume `ok` or `savedCounts`.
- **Messages/chat:** Next.js has `/api/chat/conversations` with different path, structure, and message detail flow. Coach-app expects `/api/coach/messages`. An adapter or proxy route is required to align them.
- **Players/teams:** Coach-app uses 100% mock data (PLAYER_DETAIL_MOCK, TEAM_DETAIL_MOCK, TEAMS). No API calls. Production requires a real coach-facing players/teams API.

---

## 3. NOT DONE

- `/api/coach/auth/dev-token` — Not implemented in either backend. Coach-app uses it only in dev when no Bearer token; falls back to `x-coach-id` header.
- All `/api/coach/*` routes except `/api/coach/sessions/sync` — Only sync exists in Next.js CRM.
- Coach login on hockey-server — hockey-server `/api/auth/login` is parent-only (JWT). No coach role.
- Hockey-server coach-app routes — hockey-server has no coach session, observations, reports, actions, messages, or parent-drafts endpoints.

---

## 4. CONTRACT INVENTORY TABLE

| Dependency | Path | Method | Request Shape | Response Shape | hockey-server | Next.js CRM | Mismatch / Missing |
|------------|------|--------|---------------|----------------|---------------|-------------|--------------------|
| **auth/login** | `/api/auth/login` | POST | `{ email, password }` | `{ user, role, mobileToken }` | Parent-only JWT `{ token, parent }` | ✓ `{ user, role, mobileToken }` | hockey-server: no coach login |
| **session restore** | SecureStore | — | — | Token + user JSON | N/A | N/A | Uses mobileToken as Bearer; no restore API |
| **notes** | `/api/players/[id]/notes` | GET | — | `PlayerNoteResponse[]` | ✗ | ✓ (Prisma PlayerNote) | Compatible |
| **notes** | `/api/players/[id]/notes` | POST | `{ note: string }` | `PlayerNoteResponse` | ✗ | ✓ | Compatible |
| **messages** | `/api/coach/messages` | GET | — | `ConversationApiItem[]` | ✗ | ✗ (has `/api/chat/conversations` diff shape) | Path + shape mismatch |
| **messages** | `/api/coach/messages/:id` | GET | — | `ConversationDetailApiItem` | ✗ | ✗ (has `/api/chat/conversations/:id` no messages) | Path + structure mismatch |
| **messages** | `/api/coach/messages/:id/send` | POST | `{ text }` | `SendMessageApiResponse` | ✗ | ✗ (has POST `/api/chat/conversations/:id/messages`) | Path mismatch |
| **reports** | `/api/coach/reports/weekly` | GET | — | `WeeklyReportApiItem[]` | ✗ | ✗ | Not implemented |
| **reports** | `/api/coach/reports/player/:id` | GET | — | `PlayerReportApiItem` | ✗ | ✗ | Not implemented |
| **parent drafts** | `/api/coach/parent-drafts` | GET | — | `ParentDraftApiItem[]` | ✗ | ✗ | Not implemented |
| **parent drafts** | `/api/coach/players/:id/share-report` | GET | — | `ShareReportApiItem` | ✗ | ✗ | Not implemented |
| **actions** | `/api/coach/actions` | GET | — | `CoachActionApiItem[]` | ✗ | ✗ | Not implemented |
| **live session start** | `/api/coach/sessions/start` | POST | `{ teamId }` | `StartSessionResponse` | ✗ | ✗ | Not implemented |
| **active session** | `/api/coach/sessions/active` | GET | `?teamId=` | `ActiveSessionResponse \| null` | ✗ | ✗ | Not implemented |
| **observations** | `/api/coach/observations` | POST | `CreateObservationPayload` | `ObservationResponse` | ✗ | ✗ | Not implemented |
| **observations** | `/api/coach/sessions/:id/observations` | GET | — | `ObservationResponse[]` | ✗ | ✗ | Not implemented |
| **session review** | `/api/coach/sessions/:id/review` | GET | — | `SessionReviewResponse` | ✗ | ✗ | Not implemented |
| **session sync** | `/api/coach/sessions/sync` | POST | `CoachSessionBundlePayload` | `{ sessionId?, syncedAt? }` | ✗ | ✓ | Compatible (Next.js adds ok, savedCounts) |
| **players** | — | — | — | — | `/api/players` exists (auth) | `/api/players` exists | Coach-app uses mock only |
| **teams** | — | — | — | — | `/api/teams` exists | `/api/teams` exists | Coach-app uses mock only |
| **dev-token** | `/api/coach/auth/dev-token` | POST | `{ coachId }` | `{ token }` | ✗ | ✗ | Dev-only; not critical |

---

## 5. AUTH MISMATCH ANALYSIS

### Coach-app expects (from `authService.ts`, `AuthContext.tsx`)

- **Login:** `POST /api/auth/login` with `{ email, password }`
- **Response:** `{ user: { id, email?, name?, role }, role, mobileToken }`
- **Session restore:** Token stored in SecureStore; used as `Authorization: Bearer <token>`
- **User shape:** `CoachUser`: `{ id, email?, name?, role }`

### Hockey-server `/api/auth/login` (authController.js)

- **Returns:** `{ token, parent }` (JWT for parents only)
- **No coach support:** Looks up `prisma.parent`, not coach/user
- **Mismatch:** Different response shape; no coach role

### Next.js CRM `/api/auth/login` (src/app/api/auth/login/route.ts)

- **Returns:** `{ user, role, mobileToken }` — matches coach-app
- **User:** Demo users include `coach@hockey.edu`, `maincoach@hockey.edu` with roles COACH, MAIN_COACH
- **Token:** Base64url-encoded session (`setSessionCookie`); validated by `parseSessionToken` in api-auth
- **Bearer support:** `getAuthFromRequest` accepts `Authorization: Bearer <token>` (api-auth.ts:62–66)

### Adapter / Normalization

- **Adapter in coach-app:** Not needed for Next.js — response shape already matches.
- **hockey-server:** Would require a new coach login flow and a different response shape. Not recommended as primary.
- **Fix location:** Normalizing hockey-server to coach-app is a larger change; Next.js is already aligned.

### Least risky production solution

- Use **Next.js CRM** as the coach-app auth backend.
- Set `EXPO_PUBLIC_API_URL` to the Next.js CRM base URL.
- hockey-server remains for parent-app; coach-app does not use it for auth.

---

## 6. BACKEND STRATEGY OPTIONS

### Option A — Single backend on hockey-server

| Criterion | Assessment |
|-----------|------------|
| Complexity | High — hockey-server has no coach login, no coach endpoints, different schema (Parent, CoachProfile vs User, Team, Player) |
| Operational risk | High — would require new auth flow, many new routes, schema changes |
| Env/config | Simple — one `EXPO_PUBLIC_API_URL` |
| Auth/session | Would need new coach auth and session model |
| Data ownership | hockey-server has parent/player; coach session data would need to be added |
| Developer velocity | Low — large implementation effort |
| Maintainability | Unknown — two distinct domains (parent + coach) in one server |

**Conclusion:** Not recommended. hockey-server is parent-focused; coach domain is absent.

---

### Option B — Split backend (coach-app → hockey-server + Next.js)

| Criterion | Assessment |
|-----------|------------|
| Complexity | High — two base URLs, two auth systems, CORS, routing decisions per endpoint |
| Operational risk | High — two deployments, two failure modes, split session consistency |
| Env/config | Complex — `EXPO_PUBLIC_API_URL` plus a second URL or per-endpoint routing |
| Auth/session | Inconsistent — hockey-server has no coach auth; Next.js has it |
| Data ownership | Unclear — coach sessions live in Next.js; players/teams in both with different schemas |
| Developer velocity | Low — maintenance overhead and duplicated logic |
| Maintainability | Poor — split contracts and multiple auth flows |

**Conclusion:** Not recommended. No benefit; hockey-server does not provide coach endpoints.

---

### Option C — Single backend on Next.js CRM (recommended)

| Criterion | Assessment |
|-----------|------------|
| Complexity | Low — one base URL, one auth, existing coach session sync and notes |
| Operational risk | Low — one deployment, known auth and RBAC |
| Env/config | Simple — `EXPO_PUBLIC_API_URL` → Next.js CRM |
| Auth/session | Already aligned — mobileToken, Bearer, coach roles |
| Data ownership | Clear — CRM has User, Team, Player, CoachSession, PlayerNote, ChatConversation |
| Developer velocity | High — extend existing routes, shared Prisma schema |
| Maintainability | Good — single backend, consistent patterns |

**Conclusion:** Recommended. Next.js CRM already supports auth, notes, sync; other coach routes can be added there.

---

## 7. RECOMMENDED STRATEGY

**Option C — Single backend on Next.js CRM**

**Evidence:**

1. Next.js `/api/auth/login` returns `{ user, role, mobileToken }` as coach-app expects.
2. Next.js `/api/players/[id]/notes` GET/POST and `/api/coach/sessions/sync` exist and match coach-app contracts.
3. Next.js has CoachSession, CoachSessionObservation, CoachSessionPlayerSnapshot, CoachSessionParentDraft in Prisma.
4. Next.js has RBAC and data-scope for coaches (teamId-based access).
5. hockey-server has no coach login and no coach-app endpoints.
6. Coach-app `lib/config.ts` fallback is hockey-server, but `.env.example` points to Next.js CRM for notes.

**Action:** Make Next.js CRM the canonical coach-app backend; point `EXPO_PUBLIC_API_URL` at it.

---

## 8. CRITICAL PATH IMPLEMENTATION PLAN

### PHASE 1 — Must-have for production

1. **Env and auth**
   - Set `EXPO_PUBLIC_API_URL` to Next.js CRM in production.
   - Update `lib/config.ts` FALLBACK_URL to Next.js CRM (or remove hockey-server fallback for coach-app).
   - Ensure coach login (`coach@hockey.edu`, etc.) works; no changes needed if demo users exist.

2. **Players and teams**
   - Add coach-scoped APIs:
     - `GET /api/coach/players` — players for coach’s team(s) (teamId from session)
     - `GET /api/coach/teams` — teams for coach
   - Replace mock data in coach-app with these APIs (`getCoachSessionPlayers`, tabs, etc.).

3. **Notes**
   - Already working. Verify `checkPlayerAccess` allows coach for their team’s players.

4. **Session sync**
   - Already working. No changes.

### PHASE 2 — Next product value

5. **Messages**
   - Add `/api/coach/messages` proxy or adapter that maps to `/api/chat/conversations`:
     - Map list response to `ConversationApiItem` (title, lastMessageAt, kind, etc.).
     - Map detail + messages to `ConversationDetailApiItem`.
     - Map send to `POST /api/chat/conversations/:id/messages`.

6. **Session live**
   - Add `POST /api/coach/sessions/start`, `GET /api/coach/sessions/active`.
   - Add `POST /api/coach/observations`, `GET /api/coach/sessions/:id/observations`, `GET /api/coach/sessions/:id/review`.
   - Implement using CoachSession and CoachSessionObservation.

7. **Reports and parent drafts**
   - Add `GET /api/coach/reports/weekly`, `GET /api/coach/reports/player/:id`.
   - Add `GET /api/coach/parent-drafts`, `GET /api/coach/players/:id/share-report`.
   - Derive from CoachSession, CoachSessionObservation, CoachSessionParentDraft.

### PHASE 3 — Nice-to-have

8. **Actions**
   - Add `GET /api/coach/actions` (e.g. players needing attention from observations).

9. **Dev-token**
   - Add `POST /api/coach/auth/dev-token` in Next.js for local dev without full login.

---

## 9. CANONICAL ENDPOINT OWNERSHIP PLAN

| Endpoint | Owner | Action | Compatibility |
|----------|-------|--------|---------------|
| `POST /api/auth/login` | Next.js | keep | Coach-app expects this shape |
| `GET /api/players/[id]/notes` | Next.js | keep | Match |
| `POST /api/players/[id]/notes` | Next.js | keep | Match |
| `POST /api/coach/sessions/sync` | Next.js | keep | Match |
| `GET /api/coach/players` | Next.js | add | Coach-scoped players list |
| `GET /api/coach/teams` | Next.js | add | Coach-scoped teams |
| `POST /api/coach/sessions/start` | Next.js | add | Create active session |
| `GET /api/coach/sessions/active` | Next.js | add | Resume session |
| `POST /api/coach/observations` | Next.js | add | Create observation |
| `GET /api/coach/sessions/:id/observations` | Next.js | add | List observations |
| `GET /api/coach/sessions/:id/review` | Next.js | add | Session review summary |
| `GET /api/coach/messages` | Next.js | add (proxy/adapter) | Map from /api/chat/conversations |
| `GET /api/coach/messages/:id` | Next.js | add (proxy) | Map conversation + messages |
| `POST /api/coach/messages/:id/send` | Next.js | add (proxy) | Map to POST conversations/:id/messages |
| `GET /api/coach/reports/weekly` | Next.js | add | From CoachSession data |
| `GET /api/coach/reports/player/:id` | Next.js | add | From CoachSession data |
| `GET /api/coach/parent-drafts` | Next.js | add | From CoachSessionParentDraft |
| `GET /api/coach/players/:id/share-report` | Next.js | add | From CoachSessionParentDraft |
| `GET /api/coach/actions` | Next.js | add | Later phase |
| `POST /api/coach/auth/dev-token` | Next.js | add (optional) | Dev only |

---

## 10. FRONTEND IMPACT

### Env changes

- `EXPO_PUBLIC_API_URL` → Next.js CRM base URL (e.g. `https://your-crm.vercel.app` or production domain).
- Update `coach-app/lib/config.ts` FALLBACK_URL from hockey-server to Next.js CRM, or document that coach-app must not use hockey-server.

### API client changes

- None. `apiFetch` already uses `API_BASE_URL` and Bearer token from config.

### Response adapters

- **Session sync:** None; coach-app ignores extra fields.
- **Messages:** Two choices:
  1. **Backend adapter:** Next.js `/api/coach/messages` routes that call chat APIs and reshape responses.
  2. **Frontend adapter:** coach-app `coachMessagesService` switches to `/api/chat/conversations` and maps responses to `ConversationApiItem` / `ConversationDetailApiItem`.
- Prefer backend adapter for consistency and to keep coach-app contract stable.

### Migration risks

- Wrong `EXPO_PUBLIC_API_URL` → 404s for coach routes if pointed at hockey-server.
- Demo users must exist in Next.js (or DB) for coach login.
- Players/teams: coach-app currently uses mocks; swapping to API can surface empty lists until coach’s teamId is set correctly.

### Temporary compatibility layer

- Not required if Next.js CRM is the only backend. If a split were ever needed, a BFF or proxy could sit in front of both, but that adds complexity without clear benefit.

---

## 11. RISKS / AMBIGUITIES

1. **Demo vs production auth:** Next.js login uses hardcoded demo users. Production needs real User records and password verification (or OAuth).
2. **Coach teamId:** Next.js chat and data-scope rely on `user.teamId`. Demo users may have null teamId; coach login should resolve teamId from DB (e.g. first team for school).
3. **Player ID format:** Next.js Prisma uses `cuid`; hockey-server uses `int`. Coach-app mocks use string IDs. Coach-scoped players API must return IDs compatible with coach-app (string).
4. **ChatConversation model:** Next.js chat uses ChatConversation (playerId, coachId, parentId). Coach-app expects “conversations” with title, kind, participants. Mapping may need conventions (e.g. title = playerName, kind = “parent”).
5. **Schedule:** Coach-app does not currently call schedule API; team detail mocks include nextSession. If schedule is needed, Next.js has `/api/schedule`; coach-scoped version may be required.

---

## 12. OPTIONAL SMALL CHANGES APPLIED

One small documentation fix is applied to clarify the plan:

- **coach-app/lib/config.ts:** Update the comment to state that the production backend is Next.js CRM, and that hockey-server is not used by coach-app. (See below.)

### Applied change

```diff
--- a/coach-app/lib/config.ts
+++ b/coach-app/lib/config.ts
@@ -1,8 +1,9 @@
 /**
  * API config for Hockey ID Coach App.
- * EXPO_PUBLIC_API_URL — backend base URL (Next.js CRM with /api/players/[id]/notes).
- * Coach notes API: POST /api/players/[id]/notes
- * (Next.js CRM: src/app/api/players/[id]/notes/route.ts)
+ * EXPO_PUBLIC_API_URL — canonical backend: Next.js CRM.
+ * hockey-server is NOT used by coach-app (parent-app only).
+ * Coach routes: /api/auth/login, /api/players/[id]/notes, /api/coach/sessions/sync, etc.
  */
```

This is a comment-only change to align config with the recommended strategy.
