# Architecture Usage Alignment — Phase 3

**Scope:** Safe **usage alignment** only (no route/model removal, no Prisma/schema changes, no public API contract changes).  
**Inputs:** `ARCHITECTURE_FREEZE_PHASE_0.md`, `ARCHITECTURE_DATA_AUDIT_PHASE_1.md`, `ARCHITECTURE_API_AUDIT_PHASE_2.md`.

**Code markers:** search `ARCHITECTURE PHASE 3:`.

---

## ALIGNMENT GOALS

1. Parent targeting for **new training** notifications matches **canonical access graph** (`Player.parentId` ∪ `ParentPlayer`).
2. Coach-app **resume/active session** summary prefers **`/api/live-training/sessions/active`** before **`CoachSession`** parallel path.
3. **Product messaging** explicitly documented on **`/api/chat/conversations/*`**; legacy **`/api/messages`** marked **do not extend**.
4. **Arena** parent client explicitly bound to **subpath** APIs only (not root stub GET).
5. **Parent auth** entry points in repo documented as **`/api/auth/*`** + logout on **`/api/parent/mobile/auth/logout`**.
6. **CRM** mixed/legacy surfaces marked **legacy fallback only** or **do not add new usage** without rewriting pages.

---

## CHANGES MADE

| Area | Old behavior / risk | New behavior |
|------|---------------------|--------------|
| `notifyParentsAboutCreatedSchedule` | Only `Player.parentId` | Same OR rule as access helpers: `parentId` + `parentPlayers` per player, deduped |
| `getResumeSessionSummary` API order | `getActiveCoachSession` only after local draft | **`getActiveLiveTrainingSession` first**, then **`getActiveCoachSession`** on failure/absence |
| `trainings/route.ts` imports | Unused `sendPushToParents`, `getParentIdsForTeam` | Removed (dead wiring) |
| Docs/comments | — | Phase 3 markers on load-bearing files |

---

## TRAINING USAGE ALIGNMENT

- **Implemented:** `POST /api/trainings` notification path now uses **`parentId` ∪ `parentPlayers`** per team player (`src/app/api/trainings/route.ts`).
- **Not changed (unsafe without UI/data migration):** `ScheduleDetailPage` still **session-first + legacy fallback**; only **comment** `ARCHITECTURE PHASE 3: LEGACY FALLBACK ONLY`.
- **Not changed:** Coach detail page still loads **`/api/legacy/coaches/[id]/trainings`** because **TrainingJournal** and list shape are tied to legacy `Training`; **comment** `DO NOT ADD NEW USAGE HERE`.

---

## LIVE USAGE ALIGNMENT

- **Implemented:** `coach-app/lib/resumeSessionHelpers.ts` — after local coach-input draft check, **`getActiveLiveTrainingSession()`** (SSOT) then **`getActiveCoachSession`** (parallel / dev).
- **Unchanged:** All **`/api/coach/sessions/*`** routes and **`coachSessionLiveService`** remain for coach-input, sync, and fallback.

---

## PARENT ACCESS ALIGNMENT

- **Implemented:** Training schedule create → **in-app notifications** for all linked parents (`notifyParentsAboutCreatedSchedule`).
- **Reinforced:** `getParentsForPlayer.ts` header documents SSOT graph (already matched implementation).

---

## MESSAGING USAGE ALIGNMENT

- **Comments only (no route changes):** `parent-app/services/chatService.ts`, `coach-app/services/coachMessagesService.ts`, `src/app/(dashboard)/communications/page.tsx`, `src/app/api/messages/route.ts` — **chat/conversations** vs **do not add** legacy messages API.

---

## ARENA USAGE ALIGNMENT

- **Comment:** `parent-app/services/arenaExternalTrainingService.ts` — active flows use **subpaths**; **do not** call root **`GET /api/arena/external-training`** from product (no code callers found in Phase 2; policy fixed in client header).

---

## AUTH ENTRY ALIGNMENT

- **Comment:** `parent-app/services/authService.ts` — canonical OTP **`/api/auth/request-code`** + **`/api/auth/verify-code`**; logout **`/api/parent/mobile/auth/logout`**.
- **Not changed:** `hockey-server` or alternate deploy paths (out of repo scope).

---

## CRM ALIGNMENT NOTES

- **Communications:** explicit marker — inbox **`GET /api/chat/conversations`**.
- **Schedule detail:** legacy branches **fallback only**; no new legacy features (comment).
- **Coach detail:** legacy trainings list **frozen for extension** (comment).

---

## REMAINING PARALLEL PATHS

- **`/api/coach/sessions/*`** + **`CoachSession`** — still required for **dev coach-input**, **sync**, **resume fallback** when live-training active check fails or returns null.
- **`/api/legacy/trainings/*`** — still required for **CRM detail** fallback and **coach** page **Training** + **training-journal**.
- **`GET /api/messages`** — route retained; **no product client** in repo.
- **`GET /api/parent/mobile/schedule`** — server route retained; **parent-app** uses **`/api/me/schedule`**.
- **CRM duplicate player surfaces** (`player/[id]` vs `players/[id]`) — **not merged** this phase.

---

## RISKS NOT RESOLVED IN THIS PHASE

- **`ScheduleDetailPage`** still **mixed** session/legacy (behavior preserved).
- **Coach detail** still **legacy-first** for trainings list (journal coupling).
- **Dashboard** training metrics scope mismatch (Phase 1) — **not** addressed.
- **Dual RBAC** (code vs DB `Role`) — **not** addressed.
- **Notification volume:** more parents may now receive **TRAINING_NEW** per player when both `parentId` and `ParentPlayer` pointed to different parents — **intended**; same parent still **deduped** per player.

---

## PHASE 4 INPUTS

1. Migrate **coach detail** trainings list to **`TrainingSession`** + attach journal or retire journal model.
2. Unify **CRM schedule detail** onto **session ids only** with explicit legacy read-only mode.
3. Optional: **push** for `TRAINING_NEW` if product wants parity with in-app notification graph.
4. Retire or wire **GET `/api/arena/external-training`** if product needs agent slot UI.
5. Remove **dead imports** / **dead routes** only after **contract + client** audit (separate cleanup phase).
