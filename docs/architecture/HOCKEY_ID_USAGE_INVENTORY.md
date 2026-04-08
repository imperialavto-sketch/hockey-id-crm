# Hockey ID Usage Inventory

**Status:** Inventory / audit only (no behavior, schema, or route changes).  
**SSOT definitions:** `docs/architecture/HOCKEY_ID_SSOT.md` (and Phase 0 freeze).  
**Method:** Static codebase inspection (grep + targeted file reads). Runtime behavior **not** proven here.

---

## Guardrails applied

After this inventory, explicit **GUARDRAIL** comments (documentation-only) were added to high-risk files listed in the inventory and `HOCKEY_ID_SSOT.md`:

- **Legacy school training / attendance** — `src/app/api/legacy/trainings/[id]/route.ts`, `[id]/attendance/route.ts`, `[id]/attendance/bulk/route.ts`, `src/app/api/attendance/route.ts`, `src/app/(dashboard)/players/[id]/edit/page.tsx`.
- **Legacy root analytics aggregate** — `src/app/api/analytics/route.ts` (`GET /api/analytics`): **Phase 2I frozen** legacy read model; not the canonical analytics tab surface (`/api/analytics/*` children). See `docs/architecture/HOCKEY_ID_ANALYTICS_ROUTE_DISPOSITION_PLAN.md`.
- **CoachSession parallel contour** — `src/app/api/coach/observations/route.ts`, `src/app/api/coach/sessions/{start,active,sync}/route.ts`, `src/app/api/coach/sessions/[sessionId]/{review,observations}/route.ts`, `coach-app/services/coachSessionLiveService.ts`, `coach-app/services/coachSessionSyncService.ts`.
- **Phase 3C — parallel write / active / frozen client surface** — same route files as above plus **`coach-app/lib/buildCoachSessionSyncPayload.ts`**: each includes a **PHASE 3C** line (formal **freeze**; **no** runtime change). **`CoachSession*`** is **not** used for **coach CRM report GETs** on Next after **3F–3L** (weekly, share, parent-drafts **`session_draft`**, player report). **`GET /api/coach/reports/weekly`** (**3J**): **`build-weekly-report-items-from-live-training-drafts.ts`**. **`GET /api/coach/reports/player/[id]`** (**3L**): **`build-player-report-item-from-live-training-draft.ts`**; **`avgScore`** omitted. **`GET /api/coach/parent-drafts`:** **`parent_draft`** = **`ParentDraft`**; **`session_draft`** (**3H**) = canonical **`summaryJson`**. **`GET /api/coach/actions`** (**3F**), **`GET .../share-report`** (**3G**). See `docs/architecture/HOCKEY_ID_COACHSESSION_DISPOSITION_PLAN.md` § Phase 3C freeze; `docs/architecture/HOCKEY_ID_COACHSESSION_READMODEL_REPLACEMENT_PLAN.md` § Phase 3F–3L.
- **Parent–player transitional bridge** — `src/lib/parent-players.ts` (module header + `createParentPlayer`).
- **Reports mixed read model** — `src/lib/live-training/parent-latest-live-training-summary.ts` (published SSOT vs composed parent-facing read path).

See **Guardrails applied** in `docs/architecture/HOCKEY_ID_SSOT.md` for the same list in SSOT context.

### CoachSession cleanup block closure (Phase 3M)

The **CoachSession** read-model migration on **Next** (**Phases 3F–3L**: actions, share-report, parent-drafts **`session_draft`**, weekly, player report) plus inventory, disposition, freeze (**3C**), and caller/deployment mapping (**3D**) are **closed for implementation at the current stage**. **No further broad in-repo migration** is assumed until **ops/traffic/deployment** follow-up (which host serves coach-app **`BASE_URL`**, whether **`hockey-server`** overlapping paths see traffic). See [`HOCKEY_ID_COACHSESSION_CLEANUP_CLOSURE.md`](./HOCKEY_ID_COACHSESSION_CLEANUP_CLOSURE.md). **Phase 4A:** [`HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md`](./HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md) — **`EXPO_PUBLIC_API_URL`**, Next vs **`hockey-server`** overlap table, verification checklist.

---

## 1. School training

### Canonical SSOT (expected)

- **Models:** `TrainingSession`, `TrainingAttendance` (and session-scoped evaluation/metrics per schema as used by canonical routes).
- **APIs:** `/api/trainings/*`, `/api/coach/schedule`, `/api/trainings/[id]/voice-draft/*`.

### Actual readers

| File path | Reads from | Type | Canonical or legacy | Notes |
|-----------|------------|------|---------------------|--------|
| `src/app/api/trainings/route.ts` | `prisma.trainingSession` | route | Canonical | List/create sessions. |
| `src/app/api/trainings/[id]/route.ts` | `prisma.trainingSession` | route | Canonical | GET/PATCH/DELETE session. |
| `src/app/api/trainings/[id]/attendance/route.ts` | `prisma.trainingSession`, attendance rows | route | Canonical | Session-scoped attendance. |
| `src/app/api/trainings/[id]/attendance/bulk/route.ts` | `prisma.trainingSession` | route | Canonical | Bulk attendance. |
| `src/app/api/trainings/[id]/evaluations/route.ts` | `prisma.trainingSession` | route | Canonical | Evaluations. |
| `src/app/api/trainings/[id]/structured-metrics/route.ts` | `prisma.trainingSession` | route | Canonical | Structured metrics. |
| `src/app/api/trainings/[id]/report/route.ts` | `prisma.trainingSession`, `prisma.trainingSessionReport` | route | Canonical | GET report only (see Reports). |
| `src/app/api/coach/schedule/route.ts` | `prisma.trainingSession` | route | Canonical | Coach week grid. |
| `src/app/api/dashboard/summary/route.ts` | `prisma.trainingSession` / attendance aggregates per implementation | route | Canonical | Dashboard copy references `TrainingSession` + `TrainingAttendance`. |
| `src/app/api/dashboard/upcoming-trainings/route.ts` | `prisma.trainingSession` | route | Canonical | |
| `src/lib/parent-schedule.ts` | `prisma.trainingSession` (via helpers) | lib | Canonical | Parent schedule assembly. |
| `src/app/api/me/schedule/route.ts` | Parent scope + `getParentSchedule*` | route | Canonical | Uses `parentPlayers` filter; schedule data TrainingSession-backed per freeze comments. |
| `src/features/schedule/scheduleDetailTrainingFetch.ts` | `GET /api/trainings/[id]` | lib | Canonical | Explicitly legacy compat **removed** from CRM active flow (comment). |
| `src/features/schedule/ScheduleDetailPage.tsx` | `fetch /api/trainings/...` (detail, report, evaluations, attendance) | UI | Canonical | Phase 1 schedule truth comment. **Phase 2B:** attendance UX 2-state only; no attendance comment POST; “comment” column = coach rating recommendation. |
| `src/app/(dashboard)/teams/[id]/schedule/page.tsx` | `fetch /api/trainings?...` | UI | Canonical | Team week schedule. |
| `src/app/(dashboard)/trainings/page.tsx` | `fetch /api/trainings` | UI | Canonical | |
| `coach-app/services/coachScheduleService.ts` | `/api/coach/schedule`, `/api/trainings/*` | service | Canonical | Documented SSOT. |
| `coach-app/app/schedule/index.tsx`, `coach-app/app/schedule/[id].tsx` | `coachScheduleService` | UI | Canonical | |
| `parent-app/services/scheduleService.ts` | `GET /api/me/schedule` | service | Canonical | Comment: parallel `/api/parent/mobile/schedule` exists without caller in this repo. |
| `src/app/api/parent/players/route.ts` | `GET /api/parent/players` — `player.trainingAttendances` + session select; JSON field `attendances` is mapped adapter | route | Canonical (attendance slice) | **Phase 2D:** parent attendance history from `TrainingAttendance` + `TrainingSession`, not legacy `Attendance`. |
| `src/app/api/legacy/trainings/[id]/route.ts` | `prisma.training.findUnique` | route | Legacy | Reads legacy `Training`. |
| `src/app/api/legacy/player/[id]/trainings/route.ts` | `prisma.training.findMany` | route | Legacy | Other callers only; CRM player edit list moved to canonical (see note below). |
| `src/app/api/player/[id]/trainings/route.ts` | `prisma.trainingSession` | route | Canonical | CRM `/players/[id]/edit` attendance section: list source (`?limit=30`). |
| `src/app/api/legacy/coach/trainings/route.ts` | `prisma.training.findMany` | route | Legacy | |
| `src/app/api/legacy/coaches/[id]/trainings/route.ts` | `prisma.training.findMany` | route | Legacy | |
| `src/app/api/attendance/route.ts` | `prisma.attendance.findMany` | route | Legacy | Legacy aggregate (`LEGACY_AGGREGATE_ATTENDANCE_API`). |
| `coach-app/app/player/[id]/index.tsx`, `coach-app/app/notes/[playerId].tsx` | Attendance summary shape from coach player/detail APIs (not direct Prisma) | UI | UNCERTAIN — needs verification | Fields named `attendance.*`; trace to exact backend route not fully expanded in this pass. |

### Actual writers

| File path | Writes to | Type | Canonical or legacy | Notes |
|-----------|-----------|------|---------------------|--------|
| `src/app/api/trainings/route.ts` | `prisma.trainingSession.create` (and related) | route | Canonical | |
| `src/app/api/trainings/batch/route.ts` | `prisma.trainingSession` | route | Canonical | Batch create. |
| `src/app/api/trainings/[id]/route.ts` | `prisma.trainingSession.update/delete` | route | Canonical | |
| `src/app/api/trainings/[id]/attendance/route.ts` | `TrainingAttendance` (via Prisma on session) | route | Canonical | |
| `src/app/api/trainings/[id]/attendance/bulk/route.ts` | bulk attendance | route | Canonical | |
| `src/app/api/coach/schedule/route.ts` | `prisma.trainingSession` | route | Canonical | |
| `src/features/schedule/ScheduleCreatePage.tsx` | `POST /api/trainings/batch`, `POST /api/trainings` | UI | Canonical | |
| `src/app/(dashboard)/teams/[id]/schedule/page.tsx` | `POST/DELETE /api/trainings` | UI | Canonical | |
| `src/app/api/legacy/trainings/[id]/route.ts` | `prisma.training.update/delete` | route | Legacy | |
| `src/app/api/legacy/trainings/[id]/attendance/route.ts` | `prisma.attendance.upsert` | route | Legacy | |
| `src/app/api/legacy/trainings/[id]/attendance/bulk/route.ts` | `prisma.attendance.upsert` | route | Legacy | |
| `prisma/seed.ts` | `prisma.training`, `prisma.attendance` | script | Legacy / dev | Seeds legacy models. |
| `scripts/crm-e2e-sanity.ts` | legacy + canonical APIs | script | Mixed | Uses both for E2E. |
| `src/app/(dashboard)/players/[id]/edit/page.tsx` | `POST /api/trainings/[id]/attendance` | UI | Canonical | **Phase 2A:** attendance write moved from legacy. **Phase 2B:** 2-state attendance UI only (`present`/`absent` semantics). |

### Phase 2A note (CRM player edit attendance)

- **`src/app/(dashboard)/players/[id]/edit/page.tsx`:** writes attendance via **`POST /api/trainings/[sessionId]/attendance`** (`TrainingAttendance`). List uses **`GET /api/player/[id]/trainings?limit=30`** (`TrainingSession` ids). Legacy **`POST /api/legacy/trainings/*/attendance`** is no longer used by this screen; routes remain for other callers.
- **`POST /api/trainings/[id]/attendance`:** small compatibility — if player is not on group roster but is on `session.teamId`, upsert still allowed (legacy CRM parity); optional `comment` in JSON is accepted but not stored (no Prisma column). **Phase 2B:** CRM player edit and schedule detail no longer send this optional field for attendance.

### Phase 2B note (CRM attendance UX vs canonical storage)

- **`src/features/schedule/ScheduleDetailPage.tsx`** and **`src/app/(dashboard)/players/[id]/edit/page.tsx`** present only **present / absent** as saved attendance; no four-state attendance controls; no misleading attendance comment persistence. Schedule detail keeps a text field for **coach rating recommendation** (`POST /api/player/[id]/rating`), distinct from `TrainingAttendance`.

### Phase 2D note (parent players — canonical attendance read)

- **`src/app/api/parent/players/route.ts`:** the `attendances` array in the response is built from **`TrainingAttendance`** and **`TrainingSession`** (same titling/location rules as `GET /api/player/[id]/trainings`), not from `Player.attendances` / legacy `Training`.

### Phase 2F note (Bucket B — player intelligence + ratings attendance read)

- **`src/app/api/player/[id]/ai-analysis`**, **`achievements`**, **`ai`**, **`ranking`**, **`src/app/api/ratings/route.ts`**, **`src/app/api/ratings/top/route.ts`:** Prisma include uses **`trainingAttendances: { select: { status: true } }`** instead of legacy **`attendances`**. Scoring / prompts use **`isAttendancePresentForScoring`** in **`src/lib/attendance-status-scoring.ts`**, **`src/lib/player-ai.ts`**, and **`src/lib/ai/player-analysis.ts`** so canonical **`present`** (any case) matches legacy **`PRESENT`** for “was present” counts (same as pre-2F **`=== "PRESENT"`**, i.e. **LATE** does not count).

### Phase 2I note (attendance cleanup stage closure — root analytics)

- **Canonical school attendance** in active product paths: **`TrainingSession` + `TrainingAttendance`** (writes via `/api/trainings/[id]/attendance*`, reads aligned in CRM schedule/player edit, parent players, Bucket B APIs, and **`GET /api/analytics/attendance`** for CRM analytics tab charts).
- **`GET /api/analytics`** (`src/app/api/analytics/route.ts`): **frozen** legacy aggregate (guardrail in file). **No in-repo callers** found in static audit; **migration / deprecation** requires **runtime access-log verification**. Legacy **`GET /api/attendance`**, legacy training/attendance **routes**, and **seeds/E2E** remain **intentionally** for compatibility until a later phase.
- **This attendance cleanup track is closed** except: off-repo traffic checks, and optional future deprecation or reconciliation of frozen/legacy HTTP surfaces.

### Legacy / transitional usage

- **CRM player edit:** attendance read/write now canonical (see Phase 2A note above).
- **Legacy route handlers:** `src/app/api/legacy/trainings/**`, `src/app/api/legacy/player/**`, `src/app/api/legacy/coach/**`.
- **`GET /api/attendance`:** `src/app/api/attendance/route.ts` — legacy `Attendance` reads.
- **`scheduleDetailTrainingFetch.ts`** — states legacy `GET /api/legacy/trainings/[id]` **removed** from CRM active flow (compat comment only).

### Conflicts / risks

- **Dual models:** `Training`/`Attendance` remain in DB and API for legacy routes and scripts; CRM player edit attendance **no longer** POSTs legacy (Phase 2A).
- **Parent schedule:** Canonical client is `/api/me/schedule`; **parallel** server route `/api/parent/mobile/schedule` noted in `scheduleService.ts` without in-repo caller — **drift risk** if external clients use it differently.

### Status

**TRANSITIONAL** (legacy HTTP and dual models remain). **Phase 2I:** attendance **cleanup stage closed** for implementation; open items are **runtime verification** of legacy surfaces and **optional** future deprecation/reconciliation (`GET /api/analytics` freeze, `GET /api/attendance`, legacy routes).

### Recommendation (inventory only)

- Enumerate every remaining `fetch`/`apiFetch` to `/api/legacy/trainings` and `/api/attendance` in CRM and scripts (bulk legacy attendance, E2E, etc.). **Phase 2I:** add **production log** review for **`GET /api/analytics`** before any change to that route.

---

## 2. Live training

### Canonical SSOT (expected)

- **Models:** `LiveTrainingSession` (+ related events, drafts, signals, report draft).
- **APIs:** `/api/live-training/sessions/*`.

### Actual readers

| File path | Reads from | Type | Canonical or legacy | Notes |
|-----------|------------|------|---------------------|--------|
| `src/lib/live-training/service.ts` | `prisma.liveTrainingSession`, drafts, events, … | lib | Canonical | Core server orchestration. |
| `src/lib/live-training/parent-latest-live-training-summary.ts` | `LiveTrainingSession`, drafts, `TrainingSessionReport`, … | lib | Canonical + cross-domain | Parent summary; fallback logic (see Reports). |
| `src/app/api/live-training/**/route.ts` (multiple) | via `service.ts` / ingest | route | Canonical | 17 route files under `src/app/api/live-training/`. |
| `coach-app/services/liveTrainingService.ts` | `GET/POST /api/live-training/sessions...` | service | Canonical | `BASE = /api/live-training/sessions`. |
| `coach-app/app/live-training/**/*.tsx` | `liveTrainingService` | UI | Canonical | Live, review, complete, report-draft, start. |
| `coach-app/app/(tabs)/arena.tsx`, `home.tsx`, `schedule/[id].tsx`, etc. | `getActiveLiveTrainingSession` / routes | UI | Canonical | |
| `coach-app/lib/resumeSessionHelpers.ts` | `getActiveLiveTrainingSession` (`liveTrainingService`) + local `coachInputStorage` | lib | **Mixed** | **Local draft** is not server SSOT; API path is canonical when used. |
| `src/app/api/coach/actions/route.ts` | `prisma.liveTrainingPlayerSignal` (+ **`LiveTrainingSession.status === confirmed`**) | route | **Canonical (3F)** | **Phase 3F:** coach action center; was **`CoachSessionObservation`**. |
| `src/app/api/coach/players/[id]/share-report/route.ts` | **`LiveTrainingSessionReportDraft`** + **`summaryJson`** (confirmed **`LiveTrainingSession`**) | route | **Canonical (3G)** | Uses **`live-training-report-draft-parent-extract.ts`**. |
| `src/app/api/coach/parent-drafts/route.ts` | **`ParentDraft`** + **`LiveTrainingSessionReportDraft`** / **`summaryJson`** (`session_draft`) | route | **Mixed (3H)** | **`session_draft`** branch canonical; was **`CoachSessionParentDraft`**. |
| `src/app/api/coach/reports/weekly/route.ts` | **`LiveTrainingSessionReportDraft`** + **`build-weekly-report-items-from-live-training-drafts.ts`** | route | **Canonical (3J)** | Was **`CoachSession`** + **`CoachSessionParentDraft`**. |
| `src/app/api/coach/reports/player/[id]/route.ts` | **`LiveTrainingSessionReportDraft`** + extract + **`LiveTrainingPlayerSignal.count`**; **`build-player-report-item-from-live-training-draft.ts`** | route | **Canonical (3L)** | Was **`CoachSessionParentDraft`** + observations + snapshot **`avgScore`**. **`avgScore`** not returned. |
| `src/app/api/coach/sessions/active/route.ts` | `prisma.coachSession` | route | **Parallel non-SSOT** | |
| `src/app/api/coach/sessions/[sessionId]/review/route.ts` | `prisma.coachSession` | route | Parallel | |
| `src/app/api/coach/sessions/[sessionId]/observations/route.ts` | `prisma.coachSession` | route | Parallel | |
| `coach-app/services/coachSessionLiveService.ts` | `/api/coach/sessions/*` (strings only in file) | service | Parallel | **No imports** from other `coach-app` TS/TSX files found in repo grep — dormant client. |
| `coach-app/services/coachSessionSyncService.ts` | `POST /api/coach/sessions/sync` | service | Parallel | Comment: no coach-app importers. |

### Actual writers

| File path | Writes to | Type | Canonical or legacy | Notes |
|-----------|-----------|------|---------------------|--------|
| `src/lib/live-training/service.ts` | `prisma.liveTrainingSession` (+ tx for events/drafts/report) | lib | Canonical | finish, confirm, publish, etc. |
| `src/lib/live-training/ingest-event.ts` | `liveTrainingEvent`, `liveTrainingObservationDraft` in transaction | lib | Canonical | |
| `src/app/api/live-training/sessions/[id]/events/route.ts` | via `ingestLiveTrainingEventForCoach` | route | Canonical | |
| `src/app/api/coach/sessions/start/route.ts` | `prisma.coachSession` | route | Parallel | |
| `src/app/api/coach/sessions/sync/route.ts` | `prisma.coachSession` (+ related) | route | Parallel | |
| `src/app/api/coach/observations/route.ts` | `prisma.coachSessionObservation` (after `coachSession.findUnique`) | route | Parallel | **Writes CoachSession stack**, not `LiveTrainingEvent`. |
| `coach-app/services/coachSessionLiveService.ts` | would call `/api/coach/observations` if used | service | Parallel | Only reference to `/api/coach/observations` in repo besides route file. |

### Legacy / transitional usage

- **CoachSession HTTP API** still implemented: `src/app/api/coach/sessions/*`, `src/app/api/coach/observations`.
- **Coach-app product screens** use **`liveTrainingService`** only per grep (no `coachSessionLiveService` imports).
- **`sessionReviewCenterHelpers.ts` / `resumeSessionHelpers.ts`:** local AsyncStorage coach-input + **canonical** `getActiveLiveTrainingSession` for server resume — not `CoachSession` API.

### Conflicts / risks

- **Parallel write surface:** `POST /api/coach/observations` still creates **`CoachSessionObservation`** if any external or future client calls it — **hidden second contour** vs `LiveTrainingEvent` ingest.
- **Naming collision:** `sessionId` in coach observations refers to **CoachSession.sessionId**, not `LiveTrainingSession.id` — **aliasing risk** for integrators.

### Status

**TRANSITIONAL** (canonical path dominant in coach-app; parallel server + observation POST remain). **Phase 3C:** parallel **write / active / sync / session-scoped GET / POST observations** routes and **frozen client modules** documented as **formally frozen** (header comments only); **read-model** coach routes still **active** — see `docs/architecture/HOCKEY_ID_COACHSESSION_DISPOSITION_PLAN.md`.

### Recommendation (inventory only)

- Grep production callers of `/api/coach/sessions` and `/api/coach/observations` outside this repo **UNCERTAIN**; in-repo product coach-app path is aligned to live-training.

---

## 3. Parent–player relation

### Canonical SSOT (expected)

- **Model:** `ParentPlayer` (target SSOT).
- **Transitional:** `Player.parentId` (denormalized; not ACL SSOT per schema comment).

### Actual readers

| File path | Reads from | Type | Canonical or legacy | Notes |
|-----------|------------|------|---------------------|--------|
| `src/lib/parent-access.ts` | `prisma.parentPlayer.findUnique` for `canParentAccessPlayer` | lib | Canonical | Explicit: do not use `Player.parentId` for access. |
| `src/lib/parent-players.ts` | `prisma.player.findMany` **where** `parentPlayers: { some: { parentId } }` | lib | Canonical | Lists via `ParentPlayer` only (file comment). |
| `src/lib/data-scope.ts` | `parentPlayers` on player for PARENT role | lib | Canonical | Comments: SSOT `ParentPlayer`. |
| `src/app/api/me/players/route.ts`, `src/app/api/me/players/[id]/route.ts` | `getParentPlayers` / `getParentPlayerById` + responses include `parentId` field on player DTO | route | **Mixed read surface** | Access via `ParentPlayer`; response may still expose `player.parentId` (see writers). |
| `src/app/api/chat/conversations/route.ts` | `canParentAccessPlayer`, `listParentMessengerConversationRows` | route | Canonical | |
| `src/app/api/chat/conversations/[id]/messages/route.ts` | `conv.parentId`, parent checks | route | Canonical | Conversation model fields, not `Player.parentId`. |
| `src/app/api/trainings/route.ts` | `parentPlayers` on players for notifications | route | Canonical | |
| `src/lib/notifications/getParentsForPlayer.ts` | `prisma.parentPlayer.findMany` | lib | Canonical | |
| `src/lib/notifications/getParentsForTeam.ts` | `prisma.parentPlayer.findMany` | lib | Canonical | |
| `src/app/api/player/[id]/route.ts` (CRM) | `include: { parentPlayers: … }` on GET | route | Canonical link + admin view | Used for CRM player detail relations. |

### Actual writers

| File path | Writes to | Type | Canonical or legacy | Notes |
|-----------|-----------|------|---------------------|--------|
| `src/lib/parent-players.ts` → `createParentPlayer` | `prisma.player.create` with **`parentId`** + **`parentPlayers.create`** | lib | **Dual write** | Comment: denorm for backward compatibility; ACL via `ParentPlayer`. |
| `src/app/api/me/players/route.ts` | `createParentPlayer` | route | Canonical + denorm | |
| `src/app/api/players/[id]/route.ts` PUT | **Does not** accept `parentId` in allowed fields (explicit comment) | route | Canonical policy | Prevents accidental SSOT drift via this route. |

### Legacy / transitional usage

- **`Player.parentId`** still written on **parent-driven player create** (`createParentPlayer`) alongside `ParentPlayer`.
- **GET responses** (`/api/me/players*`) may return `parentId` on player objects — consumers could treat as SSOT **if they ignore docs** (behavioral risk, not proven misuse in this pass).

### Conflicts / risks

- **Dual representation:** `parentId` on `Player` vs `ParentPlayer` rows — schema already warns; write path keeps both in sync only for **createParentPlayer**; **UNCERTAIN** for staff-side player updates elsewhere.

### Status

**TRANSITIONAL**

### Recommendation (inventory only)

- Inventory all `prisma.player.update` / admin flows that set `parentId` without `ParentPlayer` sync (partial: `src/app/api/players/[id]/route.ts` blocks PUT `parentId`; other routes **UNCERTAIN**).

---

## 4. Messaging

### Canonical SSOT (expected)

- **Models:** `ChatConversation`, `ChatMessage`.
- **APIs:** `/api/chat/conversations/*`, `/api/coach/messages/*`.

### Actual readers

| File path | Reads from | Type | Canonical or legacy | Notes |
|-----------|------------|------|---------------------|--------|
| `src/app/api/chat/conversations/route.ts` | `prisma.chatConversation` / list helpers | route | Canonical | |
| `src/app/api/chat/conversations/[id]/route.ts` | conversation row | route | Canonical | |
| `src/app/api/chat/conversations/[id]/messages/route.ts` | `prisma.chatMessage` | route | Canonical | |
| `src/app/api/chat/conversations/[id]/read/route.ts` | updates read state | route | Canonical | |
| `src/app/api/coach/messages/route.ts` | conversations for coach inbox | route | Canonical | |
| `src/app/api/coach/messages/[id]/route.ts` | thread detail | route | Canonical | |
| `src/lib/chat.ts`, `src/lib/messenger-service.ts`, `messenger-*.ts` | Prisma chat models | lib | Canonical | |
| `parent-app/services/chatService.ts` | `/api/chat/conversations/...` | service | Canonical | File header documents SSOT. |
| `coach-app/services/coachMessagesService.ts` | `/api/coach/messages`, `/api/chat/conversations/:id/read` | service | Canonical | |
| `src/app/api/messages/route.ts` | N/A | route | **Disabled legacy** | **GET → 410**; no `prisma.message`. |

### Actual writers

| File path | Writes to | Type | Canonical or legacy | Notes |
|-----------|-----------|------|---------------------|--------|
| `src/app/api/chat/conversations/[id]/messages/route.ts` | `prisma.chatMessage.create` | route | Canonical | |
| `src/app/api/coach/messages/[id]/send/route.ts` | coach sends via chat stack | route | Canonical | |
| `src/lib/messenger-*.ts` / feed bridges | chat / conversation rows per implementation | lib | Canonical | **UNCERTAIN — needs verification** per helper. |
| `prisma/seed.ts` | may seed chat tables | script | Dev | |

### Legacy / transitional usage

- **`GET /api/messages`:** `src/app/api/messages/route.ts` — **410**, documented as legacy disabled.
- **`Message` model:** **No** `prisma.message` usage found in `src/**/*.ts` in this audit (only comment in `messages/route.ts`).

### Conflicts / risks

- **Low in-repo risk** for legacy `Message` writes — not found in audited `src` app code paths.
- **Stub route strings** in `apiContours.ts` for removed `/api/chat/messages`, `/api/team/messages` — must not be wired.

### Status

**OK** (within repo static audit; external callers **UNCERTAIN**).

### Recommendation (inventory only)

- Confirm no `hockey-server` or external packages reference `prisma.message` (**UNCERTAIN**).

---

## 5. Reports

### Canonical SSOT (expected)

- **Published:** `TrainingSessionReport` (tied to `TrainingSession`).
- **Draft / pre-publish:** `LiveTrainingSessionReportDraft` (not second published SSOT).

### Actual readers

| File path | Reads from | Type | Canonical or legacy | Notes |
|-----------|------------|------|---------------------|--------|
| `src/app/api/trainings/[id]/report/route.ts` | `prisma.trainingSessionReport.findUnique` | route | Canonical | Read-only GET. |
| `src/lib/training-session-published-report-history.ts` | `prisma.trainingSessionReport.findMany` | lib | Canonical | Published history. |
| `src/lib/live-training/service.ts` | `prisma.trainingSessionReport.findUnique` (publish flow) | lib | Canonical | |
| `src/lib/live-training/parent-latest-live-training-summary.ts` | `TrainingSessionReport` + live session / draft fallbacks | lib | **Mixed** | Parent-facing “latest” prioritizes published then fallback (per file comment). |
| `src/lib/live-training/service.ts` | `prisma.liveTrainingSessionReportDraft.findUnique` | lib | Canonical draft | Coach report-draft GET/patch. |
| `coach-app/services/liveTrainingService.ts` | `/api/live-training/.../report-draft`, publish | service | Canonical | |
| `coach-app/app/live-training/[sessionId]/report-draft.tsx` | `liveTrainingService` | UI | Canonical | Coach preview/edit. |
| `parent-app/services/playerService.ts` | `/api/parent/players/:id/latest-training-summary`, `/api/me/players/:id` report fields | service | Canonical + composite | Latest summary API composes published + live fallbacks server-side. |

### Actual writers

| File path | Writes to | Type | Canonical or legacy | Notes |
|-----------|-----------|------|---------------------|--------|
| `src/lib/training-session-report-canonical-write.ts` | `tx.trainingSessionReport.upsert` | lib | Canonical | Used from live publish. |
| `src/lib/live-training/service.ts` → `publishLiveTrainingSessionReportDraftForCoach` | `upsertTrainingSessionReportCanonicalInTransaction` + `liveTrainingSessionReportDraft.update` | lib | Canonical | **Declared P0-1 production writer** for published report. |
| `src/lib/live-training/service.ts` | `patchLiveTrainingSessionReportDraftCoachNarrativeForCoach` | lib | Draft | Updates draft JSON only. |
| `src/app/api/trainings/[id]/report/route.ts` POST | N/A | route | Canonical policy | **405** — no write here. |

### Legacy / transitional usage

- **None identified** for writing `TrainingSessionReport` outside `training-session-report-canonical-write` + live publish in this pass.

### Conflicts / risks

- **Parent “latest training”** can surface **`live_session_fallback`** text when no published report — UX may resemble “published truth” **without** `TrainingSessionReport` row (by design per types; still a **product clarity** risk).

### Status

**OK** for write-path uniqueness; **TRANSITIONAL** for parent read semantics (published vs fallback).

### Recommendation (inventory only)

- Document parent UI which fields come from `TrainingSessionReport` vs live-only JSON (inventory for UX/copy, not code change here).

---

## 6. Team groups / schedule context

### Canonical SSOT (expected)

- **Group + schedule:** `TeamGroup`, `TrainingSession.groupId` (and planning snapshot / slot context for live) aligned with school schedule SSOT — per `HOCKEY_ID_SSOT.md`.

### Actual readers

| File path | Reads from | Type | Canonical or legacy | Notes |
|-----------|------------|------|---------------------|--------|
| `src/app/api/trainings/[id]/attendance/route.ts` | exposes `groupId: session.groupId` | route | Canonical | From `TrainingSession`. |
| `src/app/api/trainings/[id]/evaluations/route.ts` | `session.groupId` | route | Canonical | |
| `src/app/api/team-groups/[id]/route.ts` | `prisma.teamGroup.findUnique` | route | Canonical | Group CRUD. |
| `coach-app/services/coachTeamGroupsService.ts` | `/api/team-groups` | service | Canonical | |
| `coach-app/app/team/[id]/index.tsx` | `listCoachTeamGroups`, player `groupId` | UI | Canonical | |
| `coach-app/lib/liveTrainingScheduleRouteContext.ts` | `groupId` in query params / session context | lib | Canonical | Bridges schedule → live-training routes. |
| `coach-app/app/live-training/[sessionId]/review.tsx` | `planningSnapshot.scheduleSlotContext.groupId` | UI | Canonical | |
| `src/app/api/live-training/sessions/route.ts` | accepts `groupId` on create | route | Canonical | Passed into `createLiveTrainingSession`. |
| `src/app/api/player/[id]/schedule/route.ts` | `groupId` on schedule items | route | Canonical | **UNCERTAIN** — verify mapping to `TrainingSession` vs legacy in full file. |

### Actual writers

| File path | Writes to | Type | Canonical or legacy | Notes |
|-----------|-----------|------|---------------------|--------|
| `src/lib/team-groups.ts` | `prisma.player.update` for `groupId` | lib | Canonical | Assign player to group. |
| `src/app/api/team-groups/[id]/route.ts` | `prisma.teamGroup.update` | route | Canonical | |
| `coach-app/components/team/CoachGroupFormModal.tsx` | `createCoachTeamGroup` / `updateCoachTeamGroup` | UI | Canonical | |
| `src/lib/live-training/service.ts` | `createLiveTrainingSession` stores `groupId` on live session | lib | Canonical | Input from body. |

### Legacy / transitional usage

- **`Training.groupId`:** **UNCERTAIN** in this pass whether legacy `Training` model still carries group fields used in product paths (grep focused on `TrainingSession.groupId`).

### Conflicts / risks

- **Live vs slot:** `scheduleSlotContext` / `trainingSlotId` linking live → `TrainingSession` is critical for publish/report linkage; misalignment **HIGH RISK** if client omits ids (handled server-side in `resolveCanonicalTrainingSessionIdForLiveCreate` — detail **UNCERTAIN** without full trace).

### Status

**TRANSITIONAL**

### Recommendation (inventory only)

- Single pass over `prisma.training.findMany` / legacy training routes for `groupId` usage (**NOT DONE** in this inventory).

---

## Summary A — Canonical usage already aligned

- Coach-app **schedule** → `/api/trainings/*` + `/api/coach/schedule` (`coachScheduleService`).
- Coach-app **live training** → `/api/live-training/sessions/*` (`liveTrainingService`); **no** `coachSessionLiveService` imports in coach-app TS/TSX.
- Parent **schedule** client → `/api/me/schedule` (`scheduleService`).
- **Messaging** product services → `/api/chat/conversations/*` + `/api/coach/messages/*`.
- **Published report read** for slot → `GET /api/trainings/[id]/report` (read-only).
- **Published report write** → live-training publish → `upsertTrainingSessionReportCanonicalInTransaction` (single writer pattern in code comments).

## Summary B — Transitional but safe (if constraints respected)

- `Player.parentId` written only alongside `ParentPlayer` on parent create path; PUT `/api/players/[id]` rejects client `parentId` updates.
- `resumeSessionHelpers` mixing local draft + `getActiveLiveTrainingSession`.
- Parent latest training summary: published + intentional live fallback.

## Summary C — High-risk conflicts

| Risk | Evidence |
|------|----------|
| ~~CRM player edit → legacy attendance POST~~ **Addressed (Phase 2A)** | Now `POST /api/trainings/.../attendance`; legacy routes unchanged for other callers |
| **Parallel live contour** still writable on server | `POST /api/coach/observations` → `CoachSessionObservation` |
| Dual parent–player representation | `createParentPlayer` sets both `parentId` and `ParentPlayer` |
| Parent schedule parallel API | `/api/parent/mobile/schedule` exists; parent-app uses `/api/me/schedule` per comment — **external drift UNCERTAIN** |

## Summary D — Dead / stub / legacy routes (do not expand)

- `GET /api/messages` — **410** (`src/app/api/messages/route.ts`).
- `/api/legacy/trainings/*` — legacy `Training` / `Attendance` (maintenance-only).
- `GET /api/attendance` — legacy aggregate.
- Stub strings: `/api/chat/messages`, `/api/team/messages` (removed; see `apiContours.ts`).
- `coachSessionLiveService` / `coachSessionSyncService` — **no product importers** found in coach-app.

## Summary E — Uncertain (needs runtime or wider repo verification)

- All **production** callers of `/api/coach/sessions/*` and `/api/coach/observations` outside monorepo.
- Whether **`Message`** / `prisma.message` exists in other packages (e.g. `hockey-server/`).
- Full **`Training.groupId`** vs **`TrainingSession.groupId`** legacy usage.
- Coach **player/notes** screens: exact API backing `attendance` summary fields.
- Every **`prisma.player.update`** path for `parentId` mutations.

## Summary F — Recommended cleanup order (post-inventory phases only)

1. ~~Remove or redirect **CRM legacy attendance** from `players/[id]/edit`~~ **Done (Phase 2A)** — canonical `POST /api/trainings/[id]/attendance`.
2. Inventory + gate **`CoachSession`** HTTP usage (observations + sessions); deprecate or isolate if unused.
3. Complete **parent-player** write inventory (`parentId` vs `ParentPlayer`).
4. Confirm **parent/mobile/schedule** consumers or document deprecation.
5. Legacy **`Training`/`Attendance`** API usage grep across CRM + scripts.

## Summary G — Audit completeness

| Area | Status |
|------|--------|
| School training | **PARTIAL** (CRM edit legacy path confirmed; all CRM pages not exhaustively listed) |
| Live training | **PARTIAL** (coach-app clear; parallel routes identified) |
| Parent–player | **PARTIAL** (core access libs clear; full write surface not exhaustive) |
| Messaging | **PARTIAL** (canonical clear; messenger helper writes not line-by-line) |
| Reports | **PARTIAL** (write SSOT clear; parent fallback semantics noted) |
| Team groups / schedule | **PARTIAL** (`TrainingSession.groupId` + TeamGroup clear; legacy Training group **UNCERTAIN**) |
| Overall | **NOT DONE** for exhaustive per-file listing |

---

*Generated from repository static analysis. Update this document when code changes.*
