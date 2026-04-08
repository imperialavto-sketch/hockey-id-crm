# Architecture API Audit — Phase 2 (Consolidation Inventory)

**Scope:** Inventory of **HTTP route families** and **verified client callers** (grep across `parent-app/`, `coach-app/`, `src/` CRM pages, `scripts/`). No code moves, no contract changes.  
**Related:** `docs/ARCHITECTURE_FREEZE_PHASE_0.md`, `docs/ARCHITECTURE_DATA_AUDIT_PHASE_1.md`.

**Marker convention in code:** search `ARCHITECTURE AUDIT PHASE 2:`.

---

## TRAINING API INVENTORY

### Canonical family — `TrainingSession` (non-legacy)

| Route family | Role | Verified clients |
|--------------|------|------------------|
| **`GET/POST /api/trainings`** (list + create week sessions) | CRM team schedule, notifications on create | `src/app/(dashboard)/teams/[id]/schedule/page.tsx` (GET/POST/DELETE); `src/app/(dashboard)/trainings/page.tsx` (GET); `src/features/schedule/ScheduleCreatePage.tsx` (batch + create); `scripts/crm-e2e-sanity.ts` |
| **`GET/PATCH/DELETE /api/trainings/[id]`** | Session detail / edit | `coach-app/services/coachScheduleService.ts`; `ScheduleDetailPage.tsx` (tries this **first**); e2e script |
| **`/api/trainings/[id]/attendance`** (+ bulk) | Per-session attendance (`TrainingAttendance`) | `coach-app/services/coachScheduleService.ts`; `ScheduleDetailPage.tsx` (session branch); `coach-app/app/schedule/[id].tsx` via service |
| **`/api/trainings/[id]/evaluations`**, **`.../report`**, **`.../structured-metrics`**, **`.../voice-*`** | Session enrichments | `coachScheduleService.ts`, `trainingVoiceDraftService.ts`, schedule section components; CRM `ScheduleDetailPage` fetches report + evaluations |
| **`GET/POST /api/coach/schedule`** | Coach-app **weekly** grid + create | `coach-app/services/coachScheduleService.ts` (`COACH_SCHEDULE_PATH`) |
| **`GET /api/me/schedule`** | Parent-app schedule | `parent-app/services/scheduleService.ts` |
| **`GET /api/schedule`** | CRM **global** week picker (cookie auth) | `src/app/(dashboard)/schedule/page.tsx` |
| **`GET/POST /api/coach/trainings`** | CRM **coach dashboard** list + quick create `TrainingSession` | `src/app/(dashboard)/coach/page.tsx`; `src/components/CoachCard.tsx` |
| **`GET /api/player/[id]/trainings`** | Team session history for CRM player | `src/app/(dashboard)/players/[id]/page.tsx`; `scripts/crm-e2e-sanity.ts` |

### Legacy family — `Training` + `Attendance` (legacy model)

| Route family | Verified clients |
|--------------|------------------|
| **`/api/legacy/trainings/[id]`** (+ attendance, bulk) | `src/features/schedule/ScheduleDetailPage.tsx` **fallback** when session GET not OK; legacy attendance when `isLegacyTraining` |
| **`/api/legacy/player/[id]/trainings`** | `src/app/(dashboard)/players/[id]/edit/page.tsx`; e2e script |
| **`/api/legacy/coaches/[id]/trainings`**, **`/api/legacy/coach/trainings`** | `src/app/(dashboard)/coaches/[id]/page.tsx`; e2e script |

### Global legacy attendance aggregate

| Route | Model | Client usage |
|-------|-------|--------------|
| **`GET /api/attendance`** | `prisma.attendance` (legacy `Attendance`) | **No** `fetch` / `apiFetch` in `parent-app/`, `coach-app/`, or CRM `src/app/(dashboard)/**` found by grep. **DEV/SCRIPT ONLY:** not referenced in `scripts/crm-e2e-sanity.ts` for this path in sampled scripts. |

### Parallel / overlapping product paths (same domain, different URLs)

- **Coach mobile week:** `/api/coach/schedule` (not `/api/trainings?teamId&week` for primary list — coach-app uses coach/schedule).
- **CRM team week:** `/api/trainings?teamId&weekStartDate` (+ readiness flag).
- **CRM “all trainings” hub:** `/api/trainings` without team filter (`trainings/page.tsx`).
- **CRM coach hub:** `/api/coach/trainings` — **also** `TrainingSession`, but **different** UX from team schedule pages.
- **CRM week overview:** `/api/schedule` — same underlying session DTO pattern as coach week, **third** list entry point.
- **Detail screen mix:** `ScheduleDetailPage` = **session first**, **legacy fallback** for body + **dual** attendance URL (session vs legacy).

### Training-adjacent (narrow)

| Route | Clients |
|-------|---------|
| **`/api/training-journal`**, **`/api/training-journal/[id]`** | CRM `src/app/(dashboard)/coaches/[id]/page.tsx` (POST list); **no** coach-app/parent-app match |

### Dashboard training metrics

| Route | Notes |
|-------|-------|
| **`GET /api/dashboard/summary`** | `trainingSession.count` + `trainingAttendance` aggregate (see Phase 1 doc) — CRM `dashboard/page.tsx` |
| **`GET /api/dashboard/upcoming-trainings`** | CRM `dashboard/page.tsx` |

---

## LIVE API INVENTORY

### Operational canonical (coach-app product path)

| Family | Entry | Clients |
|--------|-------|---------|
| **`/api/live-training/sessions`** (+ `[id]/*`, events, finish, cancel, drafts, report-draft, action-candidates, …) | `src/app/api/live-training/**` | `coach-app/services/liveTrainingService.ts` (`BASE`); `GET .../start-planning` from `liveTrainingService.ts`; screens under `coach-app/app/live-training/**`, `(tabs)/home.tsx`, `arena.tsx`, `schedule/[id].tsx`; dev-only `coach-app/app/dev/arena-review-prototype.tsx` (no HTTP arena-review API) |

### Parallel path — `CoachSession` (do not expand per Phase 0 freeze)

| Family | Clients |
|--------|---------|
| **`POST /api/coach/sessions/start`**, **`GET .../active`**, **`POST .../sync`**, **`.../[sessionId]/observations`**, **`.../review`** | `coach-app/services/coachSessionLiveService.ts`; `coach-app/services/coachSessionSyncService.ts`; **`coach-app/app/dev/coach-input.tsx`** (sync); **`coach-app/lib/resumeSessionHelpers.ts`** falls back to `getActiveCoachSession` |

### Server-only / CRM-adjacent live links

| Area | Notes |
|------|-------|
| **`/api/coach/reports/*`**, **`/api/coach/parent-drafts`**, **`/api/coach/actions`** | Use `CoachSession` / observations in handlers; consumed from **coach-app** services (`coachReportsService`, `coachParentDraftsService`, `coachActionsService`, `voiceCreateService`) — **parallel** data plane to `LiveTrainingSession` |

### Intersection on one device

- **`resumeSessionHelpers`:** local coach-input draft **or** `GET /api/coach/sessions/active` — **not** `live-training` active check in the same helper.
- **Schedule → live CTA:** `liveTrainingScheduleRouteContext.ts` / hero pushes **`/live-training/*`** (live-training API), not coach/sessions start.

---

## MESSAGING API INVENTORY

### Active core

| Family | Write-critical / read | Clients |
|--------|------------------------|---------|
| **`GET /api/chat/conversations`**, **`.../[id]/messages`**, **`POST ...`**, **`.../read`** | CRM + parent + coach | CRM `communications/page.tsx`, `communications/chat/[id]/page.tsx`; `parent-app/services/chatService.ts`; `coach-app/services/coachMessagesService.ts` (inbox + **POST read** to `chat/conversations/:id/read`) |
| **`GET /api/coach/messages`**, **`.../[id]`**, **`.../[id]/send`** | Coach mobile inbox / thread | `coachMessagesService.ts` |
| **`POST /api/parent/messages/direct`**, **`/api/parent/messages/report`**, **`/api/parent/messaging/peer-block`** | Parent flows | `parentMessengerService.ts`, `parentModerationService.ts` |

### Auxiliary / feed / team channel

| Family | Clients |
|--------|---------|
| **`/api/feed`**, **`/api/feed/[id]`** | `parent-app/services/feedService.ts` |
| **`/api/team/posts`**, **`/api/team/messages`**, **`/api/team/members`** | `parent-app/services/teamService.ts` |
| **`/api/notifications`**, **`.../unread-count`**, **`.../[id]/read`** | `parent-app/services/notificationService.ts` |

### AI chat (parent)

| Family | Clients |
|--------|---------|
| **`POST /api/chat/ai/conversation`**, **`POST /api/chat/ai/message`** | `parent-app/services/chatService.ts`, `coachMarkMemory.ts` |

### Legacy / stub / no client

| Route | Behavior | Client grep result |
|-------|----------|-------------------|
| **`GET /api/messages`** | `prisma.message` list | **No** `fetch`/`apiFetch` to `/api/messages` in `src`, `parent-app`, `coach-app`. CRM communications uses **`/api/chat/conversations`**. |
| **`GET /api/chat/messages`** | Static empty payload | **No** client usage in apps (only mentioned in old docs). |

---

## ARENA API INVENTORY

### Parent-app SSOT client (`arenaExternalTrainingService.ts`)

| Method | Path |
|--------|------|
| Request | `GET/POST` patterns on `/api/arena/external-training/request` |
| Report | `/api/arena/external-training/report` |
| Autonomous / confirm / narrative / follow-up / follow-up-create | `autonomous-match`, `confirm-match`, `narrative`, `follow-up`, `follow-up-create` |
| Surfaces | `/api/arena/summary-surface`, `/api/arena/development-overview` |
| Demo | `POST .../report/mock-submit` |

### Stub / agent (no matching parent service path string)

| Route | Notes |
|-------|-------|
| **`GET /api/arena/external-training`** | `runExternalTrainingAgent` — **no** `arena/external-training?` fetch in `parent-app`/`coach-app`/`src` dashboard grep. **NO CLIENT USAGE FOUND** in repo clients. |

### External coach (CRM pages, not parent-app)

| Family | Clients |
|--------|---------|
| **`/api/external-coach/requests`**, **`.../[id]`**, **`.../complete-quick`**, **`.../report`** | `src/app/external-coach/requests/page.tsx`, `requests/[id]/page.tsx` |

---

## AUTH / ACCESS API INVENTORY

| Entry | Role | Clients |
|-------|------|---------|
| **`POST /api/auth/login`** | Coach CRM user (phone + password + intent) | `coach-app/services/authService.ts`; `coach-app/context/AuthContext.tsx` |
| **`POST /api/auth/request-code`**, **`POST /api/auth/verify-code`** | Parent OTP | `parent-app/services/authService.ts` |
| **`POST /api/parent/mobile/auth/logout`** | Parent logout | `parent-app/services/authService.ts` |
| **`POST /api/parent/mobile/auth/request-code`**, **`verify`** | Documented in `hockey-server/server.js` and various **docs**; **current `parent-app/services/authService.ts` uses `/api/auth/*`**, not `parent/mobile/auth/*` for login. **UNCERTAIN:** other deploys or older builds may still call `parent/mobile/auth/*`. |

CRM session: cookie / Bearer via `getAuthFromRequest` on dashboard fetches (`credentials: "include"`).

---

## CRM API INVENTORY (selected surfaces)

| Surface | Primary APIs | Legacy / mixed |
|---------|--------------|----------------|
| **Dashboard** | `/api/dashboard/summary`, `upcoming-trainings`, `recent-activity` | — |
| **Communications** | `/api/chat/conversations` (+ thread messages) | `/api/messages` exists but **unused** by UI |
| **Schedule hub** | `/api/schedule` | — |
| **Team schedule** | `/api/trainings?teamId&week` | — |
| **Training detail** | `ScheduleDetailPage`: `/api/trainings/[id]` + session attendance | **Fallback** `/api/legacy/trainings/*` |
| **Trainings list** | `/api/trainings` | — |
| **Coach dashboard** | `/api/coach/trainings` | Same session model; **parallel** URL to team schedule |
| **Player profile** | `/api/player/[id]`, `/api/player/[id]/trainings` (sessions) | Edit page: `/api/legacy/player/[id]/trainings` |
| **Coaches** | legacy trainings + training-journal | `/api/legacy/coaches/...`, `/api/training-journal` |
| **External coach** | `/api/external-coach/*` | — |

---

## DEAD / NO-CLIENT-FOUND ROUTES

**Method:** grep for path string in `parent-app/`, `coach-app/`, `src/app/(dashboard)`, `src/features` (and spot-check `scripts/`).

| Route / family | Finding |
|----------------|---------|
| **`GET /api/messages`** | **NO CLIENT USAGE FOUND** in CRM UI or mobile apps (only route implementation + docs). |
| **`GET /api/chat/messages`** | **NO CLIENT USAGE FOUND**. |
| **`GET /api/attendance`** | **NO CLIENT USAGE FOUND** in dashboard/mobile sources searched. |
| **`GET /api/arena/external-training`** (root GET, agent) | **NO CLIENT USAGE FOUND** in `arenaExternalTrainingService` or other app services. |
| **`GET /api/parent/mobile/schedule`** | **NO CLIENT USAGE FOUND** in `parent-app` code (service uses **`/api/me/schedule`**). Route **exists** on server (`src/app/api/parent/mobile/schedule/route.ts`) for parity / other clients. |

**DEV / SCRIPT ONLY (examples):** `scripts/crm-e2e-sanity.ts` exercises `/api/trainings`, `/api/legacy/*`, `/api/chat/conversations`, auth, marketplace, etc. — not exhaustive for every route.

---

## CANONICAL API FAMILIES (Phase 2 verdict)

- **Training (session SSOT):** **`TrainingSession`** exposed via **`/api/trainings/*`**, **`/api/coach/schedule`**, **`/api/me/schedule`**, **`/api/schedule`**, **`/api/coach/trainings`**, **`/api/player/[id]/trainings`**.
- **Live (operational):** **`/api/live-training/sessions/*`** + coach-app `liveTrainingService`.
- **Messaging (product):** **`/api/chat/conversations/*`** + coach **`/api/coach/messages/*`** + parent messenger/moderation routes.
- **Parent schedule (app):** **`GET /api/me/schedule`**.
- **Arena external flow (parent):** **`/api/arena/*`** paths listed in `arenaExternalTrainingService.ts`.

---

## PARALLEL / LEGACY / DO NOT EXPAND API FAMILIES

- **Legacy training:** **`/api/legacy/trainings/*`**, **`/api/legacy/player/*`**, **`/api/legacy/coach/*`**, **`/api/legacy/coaches/*`** — **DO NOT EXPAND**; CRM detail still **falls back** here.
- **Parallel live:** **`/api/coach/sessions/*`**, **`/api/coach/observations`** — **DO NOT EXPAND** (Phase 0); still used by **dev coach-input**, **sync**, **resume** fallback, **reports/actions** chain.
- **Parallel CRM training lists:** **`/api/coach/trainings`** vs team **`/api/trainings`** vs **`/api/schedule`** — three list entry points for overlapping “coach/schedule” semantics; **avoid new features** without picking one family per scenario.
- **Legacy message store:** **`GET /api/messages`** — **DO NOT EXPAND** until consolidated with chat stack.

---

## CLEANUP TARGETS FOR LATER

1. **Remove or merge** **`GET /api/messages`** and **`GET /api/chat/messages`** after client audit in production.
2. **Retire or document** **`GET /api/attendance`** if intentionally admin-only or unused.
3. **Align CRM `ScheduleDetailPage`** to a **single** training id space (session vs legacy) or explicit migration.
4. **Choose** one **coach** list source for CRM: **`/api/coach/schedule`** vs **`/api/coach/trainings`** vs team page.
5. **Consolidate live:** migrate **coach-input / resume / reports** off **`CoachSession`** **or** formally document two supported lifecycles.
6. **Parent auth paths:** document single OTP canonical (`/api/auth/*` vs `parent/mobile/auth/*`) per deployment.
7. **`GET /api/arena/external-training`:** remove or wire to product if agent slot-matching is still desired.

---

## OPEN QUESTIONS FOR PHASE 3

1. Is **`GET /api/attendance`** used by any **external** tool, admin bookmark, or **non-repo** client?
2. Does **`GET /api/parent/mobile/schedule`** serve **Expo web**, **old app builds**, or **hockey-server** proxies?
3. Production **telemetry** split: **`live-training`** vs **`coach/sessions`** session starts.
4. Any **CRM navigation** still linking to a **messages** page that called **`/api/messages`** (removed UI?) — grep **navigation** config.
5. Full **`src/app/api/**`** route list vs grep pass: **UNCERTAIN** completeness for rarely used admin routes.
