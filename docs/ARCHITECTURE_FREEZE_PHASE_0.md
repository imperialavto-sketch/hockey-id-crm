# Architecture Freeze — Phase 0

**Status:** FROZEN (documentation + code markers only; no behavior/schema/API contract changes in this phase.)

**Purpose:** Single source of truth labels for SSOT, LEGACY, TEMP/STUB, and **DO NOT EXPAND** until a deliberate Phase 1+ decision.

---

## 1. SYSTEM CORE (product/engineering)

These subsystems are the **intended long-term center of gravity** for Hockey ID (as implemented today):

| Area | Core elements |
|------|----------------|
| **School training (canonical slot)** | Prisma `TrainingSession`, `TrainingAttendance`, `PlayerSessionEvaluation`, `PlayerSessionStructuredMetrics`, `TrainingSessionReport`, `PlayerSessionReport`; API `/api/trainings/*`, `/api/coach/schedule`; coach-app **План** + session detail; parent schedule via `/api/me/schedule` (see `parent-app/services/scheduleService.ts`). |
| **Live training (Arena coach)** | Prisma `LiveTrainingSession` (+ events, drafts, signals, report draft); API **`/api/live-training/sessions/*`**; `src/lib/live-training/*`; coach-app **`liveTrainingService.ts`** + `app/live-training/*`, report draft. |
| **Parent access to players** | Prisma `Parent`, **`ParentPlayer`**; parent mobile/me APIs (`/api/me/players`, `/api/parent/*`). |
| **Messaging (current stack)** | `ChatConversation` / `ChatMessage` family + coach/parent inbox routes (parallel contracts documented as risk). |
| **External Arena (parent)** | Prisma `ExternalTrainingRequest`, `ExternalTrainingReport`; `src/lib/arena/*`; parent-app `arenaExternalTrainingService.ts`. |

---

## 2. SSOT DECISIONS (freeze)

### 2.1 Training domain

| Topic | **SSOT** | Notes |
|-------|-----------|--------|
| **Scheduled school session (coach + parent consumers)** | **`TrainingSession`** + **`TrainingAttendance`** | Evaluations, structured metrics, session report, voice draft attach here. |
| **API for that session** | **`/api/trainings/[id]/*`**, **`/api/coach/schedule`**, list/create patterns in **`/api/trainings/route.ts`** | CRM session list elsewhere may still use other paths — see LEGACY. |
| **Legacy parallel model** | **`Training`** + **`Attendance`** | CRM-only / historical; **`/api/legacy/trainings/*`**. |

**Freeze rule:** New **product** features for “what happened at this week’s practice” should target **`TrainingSession`** and **`/api/trainings/*`**, not **`Training`**, unless explicitly a legacy-maintenance task.

### 2.2 Live training domain

| Topic | **SSOT** | Notes |
|-------|-----------|--------|
| **Persisted live session (review, signals, publish)** | Prisma **`LiveTrainingSession`** | `coachId` = CRM **`User.id`** (see schema comment). |
| **Canonical HTTP API** | **`/api/live-training/sessions/*`** | Includes report-draft, finish, events, etc. |
| **Coach-app entrypoint** | **`coach-app/services/liveTrainingService.ts`** (`BASE = /api/live-training/sessions`) | Primary path for tabs **Арена**, live flow, review, report-draft. |

**Parallel contour (not SSOT for LiveTrainingSession):**

- Prisma **`CoachSession`** (+ observations / snapshots / parent drafts).
- HTTP **`/api/coach/sessions/*`** (e.g. `start`, `active`, `sync`, observations).
- **`coach-app/services/coachSessionLiveService.ts`** — still referenced from **`resumeSessionHelpers.ts`**, **`sessionReviewCenterHelpers.ts`**, **`app/dev/coach-input.tsx`**.

**Freeze rule:** **DO NOT EXPAND** `CoachSession` / `/api/coach/sessions/*` as if it were the same product object as `LiveTrainingSession`. Any new live-training capability should go through **`/api/live-training/sessions`** unless Phase 1 explicitly chooses consolidation.

### 2.3 Parent ↔ player relation

| Topic | **SSOT** | Notes |
|-------|-----------|--------|
| **Many-to-many link (supported parent ↔ player)** | **`ParentPlayer`** | Unique `(parentId, playerId)`; used for access lists. |
| **Optional denormalized field** | **`Player.parentId`** | **Transitional / secondary**; can disagree with `ParentPlayer` if not kept in sync. |

**Freeze rule:** New parent-scoped APIs should treat **`ParentPlayer`** as the **authorization/link SSOT**; `Player.parentId` must be treated as **UNCERTAIN** unless the specific route documents precedence.

### 2.4 Arena domain (terminology split)

| Surface | Meaning | SSOT / storage |
|---------|---------|----------------|
| **Coach “Арена”** | Live training + review + intelligence on **`LiveTrainingSession`** | **`/api/live-training/*`**, `LiveTrainingSession` |
| **Parent external Arena** | Extra-curricular training recommendation / follow-up / report | **`ExternalTrainingRequest`**, **`ExternalTrainingReport`**, `src/lib/arena/*` |
| **Autonomous match MVP** | Post-confirm orchestration UX | **`src/lib/arena/arena-external-training-match-store.ts`** — **in-memory**, not DB SSOT |

### 2.5 CRM player admin

Two routes coexist:

- **`src/app/(dashboard)/players/[id]/page.tsx`** — admin player (e.g. professional stats CRM blocks).
- **`src/app/(dashboard)/player/[id]/page.tsx`** — alternate passport-style CRM player.

**Freeze rule:** **DO NOT EXPAND both** with new admin features in parallel; pick one surface per feature in Phase 1+ or merge intentionally.

---

## 3. LEGACY SURFACES

| Item | Role |
|------|------|
| **`Training` / `Attendance` models** | Legacy CRM training slots + attendance. |
| **`/api/legacy/trainings/**`** | Explicit legacy compatibility (detail, attendance, bulk, player/coach listings). |
| **CRM `ScheduleDetailPage` + related** | Still loads **`/api/legacy/trainings/:id`** for some paths (see file marker). |
| **`Player.parentId`** | Legacy/transitional single-parent pointer on `Player`. |
| **`coachSessionLiveService` / `CoachSession`** | Parallel “session capture” stack; not `LiveTrainingSession` SSOT. |

---

## 4. TEMP / STUB SURFACES

| Item | Role |
|------|------|
| **`arena-external-training-match-store.ts`** | In-memory state machine for autonomous external flow; **lost on process restart**; MVP. |
| **`GET /api/arena/external-training`** | Agent/mock style responses (“mock” in error paths). |
| **`POST .../arena/external-training/report/mock-submit`** | Fixed mock copy for reports. |
| **`LiveTrainingEventSourceType.manual_stub`** | Explicit stub source type in DB enum. |

---

## 5. DO NOT EXPAND (until Phase 1+ decision)

1. **Second training domain:** No new **product** features on **`Training`/`Attendance`** without an explicit migration plan from **`TrainingSession`**.
2. **Second live stack:** No expansion of **`CoachSession`** / **`/api/coach/sessions/*`** feature set without alignment to **`LiveTrainingSession`**.
3. **Dual CRM player pages:** No parallel new modules on **`players/[id]`** and **`player/[id]`** without consolidation.
4. **In-memory autonomous match:** No new **production-critical** behavior relying solely on **`arena-external-training-match-store`** persistence.
5. **Mock external-training endpoints:** No new consumers assuming **`mock-submit` / agent GET** are production SSOT.

---

## 6. OPEN QUESTIONS (verify in Phase 1)

1. **Per-route precedence:** For each `parentId`-scoped API, does code filter by **`ParentPlayer`**, **`Player.parentId`**, or both? (Inventory + tests.)
2. **CRM schedule:** Full list of CRM pages/components still calling **`/api/legacy/trainings`** vs **`TrainingSession`** APIs.
3. **`Message` vs `ChatMessage`:** Whether `Message` model is fully superseded or still written/read.
4. **`hockey-server/` package:** Deployment relevance vs root Next app (**UNCERTAIN** from repo alone).
5. **Coach-app residual `coachSessionLiveService` callers:** Whether `resumeSessionHelpers` / `sessionReviewCenterHelpers` can be switched to `liveTrainingService` only in a later phase (behavior change — not now).

---

## 7. Related code markers

Search codebase for:

`ARCHITECTURE FREEZE:`

See **`docs/ARCHITECTURE_FREEZE_PHASE_0.md`** (this file) for semantics.
