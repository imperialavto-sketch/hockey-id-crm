# Hockey ID — Canonical SSOT & Architecture Freeze

**Document type:** Single source of truth (SSOT) registry and freeze rules for the Hockey ID system.  
**Scope:** Product architecture, data/API ownership, and legacy boundaries. **Documentation only** — no implied change to runtime behavior, Prisma schema, or HTTP contracts.  
**Alignment:** Extends and centralizes decisions documented in `docs/ARCHITECTURE_FREEZE_PHASE_0.md` and grep anchors in `src/lib/architecture/apiContours.ts`, `dataContours.ts`, `isolationContours.ts`, and `appFlowContours.ts`.

---

## Purpose

- Give engineers one English-language reference for **which entity and which API family own each core domain**.
- Mark **legacy and transitional** surfaces explicitly so cleanup phases do not accidentally expand them.
- Require that **new product work** names its canonical Prisma model(s) and canonical HTTP route family before implementation.

---

## Product architecture layers

Layers describe **where work lives in the product**, not a deployment topology. A single feature may touch more than one layer; the **domain SSOT map** (below) still decides which model/API own persistence.

### CORE

Long-lived engines that other layers depend on:

- **School training slot** — scheduled practice as `TrainingSession` and its canonical `/api/trainings/*` (+ coach schedule creation/list via `/api/coach/schedule`).
- **Live training** — in-session capture and review as `LiveTrainingSession` and `/api/live-training/sessions/*`.
- **Messaging** — human threads as `ChatConversation` / `ChatMessage` and `/api/chat/conversations/*` + coach inbox `/api/coach/messages/*`.
- **Parent ↔ player access** — many-to-many link as `ParentPlayer`; parent Bearer profile and school reads under `/api/me/*` (with auxiliary `/api/parent/*` where already established — see domain map).

### DEVELOPMENT

Player growth, feedback, and narrative built **on top of** CORE data:

- Session evaluations, structured metrics, and **published** training reports tied to **`TrainingSession`** (`TrainingSessionReport` and related session-scoped report shapes).
- **Draft / pre-publish** live narrative and coach editing on **`LiveTrainingSession`** (`LiveTrainingSessionReportDraft` and live-training lib) until publish flows write the canonical **`TrainingSessionReport`**.
- In-session observations, signals, and Arena-facing interpretation tied to **`LiveTrainingSession`** (not to `CoachSession`).

### TEAM / SCHOOL

Org structure and calendar context:

- Schools, teams, rosters, CRM admin surfaces.
- **Schedule and group context** for practices must remain aligned with the **school training SSOT**: slot-bound work belongs to **`TrainingSession`** and canonical training/schedule APIs — not to a parallel “second schedule” model without an explicit migration decision.

### PARENT

Parent mobile app and parent-scoped APIs:

- Consumes CORE + DEVELOPMENT outputs (schedule, messages, latest training summary, external Arena flows).
- Must respect **`ParentPlayer`** as the target authorization/link SSOT for parent-scoped player access; treat **`Player.parentId`** as legacy/transitional unless a specific route documents otherwise (see domain map).

---

## SSOT rules

1. **One SSOT per core domain**  
   For each domain in the map below, exactly one **canonical Prisma model** (or named pair where the freeze doc already defines a pair, e.g. conversation + message) owns product truth for new features in that domain.

2. **Legacy and transitional layers must be explicitly marked**  
   Anything not listed as canonical in this document is either **legacy**, **parallel (non-SSOT)**, or **transitional** until a future phase promotes or removes it.

3. **No new feature work on legacy layers**  
   Do not add new product capabilities on **`Training`**, **`Attendance`**, **`CoachSession`**, **`/api/legacy/trainings/*`**, **`/api/coach/sessions/*`** (feature expansion), deprecated **`Message`** / **`GET /api/messages`**, or stub route families called out in `apiContours.ts` — except **explicit maintenance** or **migration** tasks approved outside this freeze.

4. **New features must declare canonical entity and canonical API**  
   Design/review checklist for any new capability:
   - **Canonical Prisma model(s):** …
   - **Canonical HTTP family:** … (must match `CANONICAL_*` in `src/lib/architecture/apiContours.ts` or be a documented extension approved in a later phase)
   - **Consumers:** … (CRM, coach-app, parent-app)

---

## Domain SSOT map

### 1. School training

| Aspect | Value |
|--------|--------|
| **Canonical model(s)** | `TrainingSession`; related session-scoped data per schema (`TrainingAttendance`, `PlayerSessionEvaluation`, `PlayerSessionStructuredMetrics`, etc., as used by `/api/trainings/*`). |
| **Canonical API(s)** | `/api/trainings/*`; `/api/coach/schedule` (same slot model); slot voice draft: `/api/trainings/[id]/voice-draft/*`. |
| **Main consumer(s)** | CRM schedule/training detail (`ScheduleDetailPage` / trainings routes); coach-app plan and session detail; parent schedule via `/api/me/schedule` (see `scheduleService`). |
| **Legacy / transitional** | Prisma **`Training`**, **`Attendance`**; **`/api/legacy/trainings/*`**; legacy aggregate **`/api/attendance`** (see `LEGACY_AGGREGATE_ATTENDANCE_API`). CRM paths that still load legacy training detail are **transitional** (full inventory: open debt). |
| **Rule** | **`TrainingSession` = SSOT** for “school practice slot” and new product features in this domain. Do not expand **`Training` / `Attendance`** as parallel product truth. |

---

### 2. Live training

| Aspect | Value |
|--------|--------|
| **Canonical model(s)** | `LiveTrainingSession` (+ events, drafts, signals, report draft entities as in schema). |
| **Canonical API(s)** | `/api/live-training/sessions/*` (events, finish, review, report-draft, publish, etc.). |
| **Main consumer(s)** | `coach-app/services/liveTrainingService.ts`; `coach-app/app/live-training/*`; Arena tab flows bound to live training in `appFlowContours`. |
| **Legacy / parallel (non-SSOT)** | Prisma **`CoachSession`**; HTTP **`/api/coach/sessions/*`**; client **`coachSessionLiveService.ts`** — **parallel contour**, not `LiveTrainingSession` SSOT (`PARALLEL_COACH_SESSION_API`, `FROZEN_COACH_SESSION_SURFACE`). |
| **Rule** | **`LiveTrainingSession` = SSOT** for coach live training. **Do not expand** `CoachSession` / `/api/coach/sessions/*` as equivalent to live training; consolidation requires an explicit phase decision. |

---

### 3. Arena

| Aspect | Value |
|--------|--------|
| **Product** | **Arena** is one product system / brand (coach-facing and parent-facing experiences). |
| **Canonical flows (do not merge semantics)** | **Coach live Arena** — UX and persistence on **`LiveTrainingSession`** + **`/api/live-training/*`**. **Parent external Arena** — extra-curricular request/report stack: **`ExternalTrainingRequest`**, **`ExternalTrainingReport`**, `src/lib/arena/*`, parent `arenaExternalTrainingService` and related routes (`NON_CORE_EXTERNAL_API`). |
| **Main consumer(s)** | Coach: live-training screens + voice assistant. Parent: external training flows (non-core adjacency to school slot SSOT). |
| **Legacy / stub** | In-memory / mock surfaces called out in Phase 0 (e.g. autonomous match store, mock external-training endpoints) — **not** DB SSOT. |
| **Rule** | **Do not merge storage or API semantics** between coach live Arena and parent external Arena. Each flow keeps its **own canonical domain** (live training vs external training artifacts). |

---

### 4. Parent–player relation

| Aspect | Value |
|--------|--------|
| **Target SSOT** | **`ParentPlayer`** — many-to-many link (`parentId`, `playerId`); use for access lists and authorization in new parent-scoped APIs. |
| **Legacy / transitional** | **`Player.parentId`** — optional denormalized pointer; may diverge from `ParentPlayer` if not synchronized. |
| **Canonical API(s)** | Primary school reads: **`/api/me/*`**; auxiliary: **`/api/parent/*`** (mixed module documented in `playerService` / `MIXED_PLAYER_SERVICE_SURFACE`). |
| **Main consumer(s)** | Parent app `playerService`, schedule, chat context loaders. |
| **Rule** | New parent-scoped features **must** treat **`ParentPlayer`** as link SSOT. **`Player.parentId`**: treat as **secondary / uncertain** unless the implementing route documents precedence (per-route inventory: open debt). |

---

### 5. Messaging

| Aspect | Value |
|--------|--------|
| **Canonical model(s)** | **`ChatConversation`**, **`ChatMessage`**. |
| **Canonical API(s)** | `/api/chat/conversations/*` (list, messages, read); `/api/coach/messages/*` (coach inbox/detail/send over same conversation stack). |
| **Main consumer(s)** | Parent `chatService`; coach `coachMessagesService`; CRM communications where wired to this stack. |
| **Legacy** | Prisma **`Message`** where still present; **`GET /api/messages`** — **legacy disabled** (`LEGACY_DISABLED_MESSAGES_API`). Stub strings for removed **`/api/chat/messages`**, **`/api/team/messages`** — **not** SSOT (`STUB_*` in `apiContours.ts`). |
| **Rule** | **`ChatConversation` + `ChatMessage` = SSOT** for human messaging. Do not add new product consumers of legacy **`Message`** / **`/api/messages`** routes. |

---

### 6. Reports

| Aspect | Value |
|--------|--------|
| **Canonical published report** | **`TrainingSessionReport`** — SSOT for **published** parent/school-facing report rows tied to **`TrainingSession`**. |
| **Draft / pre-publish layer** | **`LiveTrainingSessionReportDraft`** (and related live-training draft/report-draft APIs) — **draft pipeline** for coach review until publish; **not** a second published SSOT. Production writer for canonical published report is documented on **`POST .../report-draft/publish`** under live-training API (see route comment in repo). |
| **Canonical API(s)** | Publish path: live-training **`/api/live-training/sessions/[id]/report-draft/publish`**; school session report reads/writes under **`/api/trainings/*`** as implemented. |
| **Main consumer(s)** | Coach live-training report-draft UI; parent summaries that read published report + live fallbacks (see `parent-latest-live-training-summary` — transitional matching logic is separate from SSOT naming). |
| **Rule** | **`TrainingSessionReport` = SSOT for published reports.** **`LiveTrainingSessionReportDraft` = pre-publish only**; do not treat draft tables as interchangeable with published report SSOT. |

---

### 7. Team groups / schedule context

| Aspect | Value |
|--------|--------|
| **Canonical schedule SSOT** | **`TrainingSession`** + **`/api/trainings/*`** and **`/api/coach/schedule`** for slot creation and school calendar truth. |
| **Group-related scheduling** | Filters and roster subsets (e.g. training groups) must **not** introduce a divergent “shadow schedule” without migration; group context should **align** reads/writes with the same **`TrainingSession`**-backed schedule APIs already used for the team/school. |
| **Main consumer(s)** | Coach schedule UI, CRM schedule, parent schedule. |
| **Transitional** | Exact list of components mixing legacy training id vs `TrainingSession` id — **needs verification** (open debt). |
| **Rule** | **Group-related scheduling stays aligned with school schedule SSOT** (`TrainingSession` + canonical training/schedule APIs). |

---

## Legacy register

Each row is **documentation**; status reflects architecture freeze intent, not a guarantee every call site is migrated.

| Item | Status | Why legacy / parallel | Restriction |
|------|--------|------------------------|-------------|
| `Training`, `Attendance` models | Legacy | Pre–`TrainingSession` CRM shapes; superseded for product slot truth by `TrainingSession`. | No new **product** features; maintenance/migration only. |
| `/api/legacy/trainings/*` | Legacy | Explicit compatibility API family. | No expansion; prefer `TrainingSession` APIs for new work. |
| `GET /api/attendance` | Legacy | Aggregate over legacy `Attendance` → `Training`. | Do not expand; see `LEGACY_ATTENDANCE_SURFACE`. |
| `CoachSession`, `/api/coach/sessions/*` | Parallel non-SSOT | Second live-session contour vs `LiveTrainingSession`. | **Do not expand** feature set; no new product binding as SSOT for live training. |
| `coachSessionLiveService.ts` | Frozen / parallel | Client for `/api/coach/sessions/*`; not canonical live training client. | Do not attach new product navigation; prefer `liveTrainingService`. |
| `Player.parentId` | Transitional | Denormalized; can disagree with `ParentPlayer`. | New APIs must not rely on it as sole link; document if still read. |
| `Message` model, `GET /api/messages` | Legacy | Superseded by `ChatMessage` stack; route disabled/410 per repo docs. | No new consumers. |
| Stub routes `/api/chat/messages`, `/api/team/messages` | Removed / stub string only | Not conversation SSOT. | Do not call; grep anchors only. |
| Dual CRM player admin pages `(dashboard)/players/[id]` vs `player/[id]` | Transitional / split surface | Two CRM entry patterns coexist. | Do not expand both in parallel without consolidation decision. |
| `teamService.getTeamMessages` / `sendTeamMessage` | Dormant (repo) | No in-repo product importers per isolation inventory. | Verify before delete; not chat SSOT. |

---

## Freeze decisions (explicit)

- **`TrainingSession`** = SSOT for **school training** (scheduled practice slot).
- **`LiveTrainingSession`** = SSOT for **live training** (coach Arena live capture and review).
- **`ParentPlayer`** = **target SSOT** for **parent–player** mapping (authorization/link); **`Player.parentId`** = legacy/transitional.
- **`ChatConversation` + `ChatMessage`** = SSOT for **messaging**.
- **`TrainingSessionReport`** = SSOT for **published** training reports tied to the school session.
- **`LiveTrainingSessionReportDraft`** = **draft / pre-publish** layer for live training report flow — **not** a second published report SSOT.
- **Arena** = **one product system** with **multiple canonical domain flows** (coach live vs parent external); **do not merge** storage or API semantics across those flows.
- **Legacy training** (`Training`, `Attendance`, `/api/legacy/trainings/*`) = **not** SSOT for new product work.
- **`CoachSession` / `/api/coach/sessions/*`** = **parallel contour** — not SSOT for live training.

---

## Open transitional debt

Short list for **inventory / verification** in later phases (no behavior change implied):

1. **Per-route parent access** — For each parent-scoped route, confirm whether filters use **`ParentPlayer`**, **`Player.parentId`**, or both (Phase 0 open question).
2. **CRM schedule vs legacy** — Full list of CRM components still calling **`/api/legacy/trainings/*`** vs **`/api/trainings/*`** / `TrainingSession` ids.
3. **`Message` vs `ChatMessage`** — Whether **`Message`** is still written or read anywhere in production paths.
4. **Coach-app residual `CoachSession` callers** — `resumeSessionHelpers`, `sessionReviewCenterHelpers`, dev screens still referencing `coachSessionLiveService` vs `liveTrainingService`-only alignment.
5. **Parent `playerService` mixed HTTP families** — Complete map of `/api/me/*` vs `/api/parent/*` vs `/api/players/*` per function (`MIXED_PLAYER_SERVICE_SURFACE`).
6. **Group vs session id** — Any remaining use of legacy **`Training.id`** where UI should show **`TrainingSession`** (needs code grep per feature area).
7. **`hockey-server/` package** — Deployment relevance vs root Next app (**uncertain** from repo alone).

---

## Guardrails applied

Code and route headers were annotated (guardrail comments only; no behavior change) to reinforce this document and `HOCKEY_ID_USAGE_INVENTORY.md`:

- **Legacy school training / attendance** — `src/app/api/legacy/trainings/**`, `src/app/api/attendance/route.ts`, and `src/app/(dashboard)/players/[id]/edit/page.tsx` marked as legacy/transitional; canonical path called out as `TrainingSession` + `/api/trainings/*`.
- **CoachSession parallel contour** — `src/app/api/coach/sessions/**`, `src/app/api/coach/observations/route.ts`, and frozen coach-app clients `coachSessionLiveService.ts` / `coachSessionSyncService.ts` marked as parallel / not live-training SSOT; do not expand for new live features; canonical live = `LiveTrainingSession` + `/api/live-training/sessions/*`.
- **ParentPlayer vs `Player.parentId`** — `src/lib/parent-players.ts` documents target SSOT, denormalized `Player.parentId`, and intentional dual write in `createParentPlayer` (compatibility, not dual SSOT).
- **Parent latest live-training summary** — `src/lib/live-training/parent-latest-live-training-summary.ts` clarifies mixed read model vs `TrainingSessionReport` as published storage SSOT.

---

## Related documents

- `docs/ARCHITECTURE_FREEZE_PHASE_0.md` — Phase 0 freeze (Russian/English mix; authoritative sibling).
- `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md`, `docs/PHASE_2_API_ROUTE_LOCK.md`, `docs/PHASE_3_APP_FLOW_LOCK.md`, `docs/PHASE_4_DEAD_PATH_ISOLATION.md` — phase locks and inventories.
- `ARCHITECTURE.md` — CRM folder and module overview (may predate SSOT names; prefer this SSOT doc for ownership).
