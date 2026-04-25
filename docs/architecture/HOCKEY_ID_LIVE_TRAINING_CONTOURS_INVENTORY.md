# Hockey ID Live Training Contours Inventory

**Phase:** 3A — static audit only (no runtime changes, no schema changes, no refactors).  
**Scope:** **Canonical** `LiveTrainingSession` + `/api/live-training/*` vs **parallel** `CoachSession` + `/api/coach/sessions/*` (+ related `CoachSession*` models and `POST /api/coach/observations`).  
**Method:** `grep` / `glob` / targeted file reads across `src/`, `coach-app/`, `parent-app/` (April 2026 repo state).  
**Phase 3C:** **Freeze** reinforced (documentation-only **PHASE 3C** lines) on parallel **write, active, sync, session observation/review GET, POST /api/coach/observations** routes and **`coachSessionLiveService` / `coachSessionSyncService` / `buildCoachSessionSyncPayload`**. **Coach CRM report GETs** on Next (**`weekly`**, **`reports/player`**, share, parent-drafts **`session_draft`**, actions) are **canonical** (**3F–3L**); **`CoachSession*`** remains on **parallel session APIs** only. **Phase 3F:** **`GET /api/coach/actions`**. **Phase 3G:** **`GET .../share-report`**. **Phase 3H:** **`GET /api/coach/parent-drafts`** **`session_draft`**. **Phase 3J:** **`GET /api/coach/reports/weekly`**. **Phase 3L:** **`GET /api/coach/reports/player/[id]`** → **`build-player-report-item-from-live-training-draft.ts`** (**`avgScore`** omitted). **Phase 3M:** **CoachSession cleanup block closed** for broad implementation; next steps are **deployment/traffic verification** (see [`HOCKEY_ID_COACHSESSION_CLEANUP_CLOSURE.md`](./HOCKEY_ID_COACHSESSION_CLEANUP_CLOSURE.md)). **Phase 4A:** coach API **host + Next vs `hockey-server` overlap** — [`HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md`](./HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md). See [`HOCKEY_ID_COACHSESSION_DISPOSITION_PLAN.md`](./HOCKEY_ID_COACHSESSION_DISPOSITION_PLAN.md), [`HOCKEY_ID_COACHSESSION_READMODEL_REPLACEMENT_PLAN.md`](./HOCKEY_ID_COACHSESSION_READMODEL_REPLACEMENT_PLAN.md).

---

## Canonical contour overview

Operational coach live training for **school Arena** is **`LiveTrainingSession`** with HTTP under **`/api/live-training/sessions/*`** (plus adjacent **`/api/live-training/start-planning`**, **`/api/live-training/external-coach-feedback`**). Coach mobile **product** flows use **`coach-app/services/liveTrainingService.ts`** → those APIs. Server orchestration is concentrated in **`src/lib/live-training/service.ts`** and related libs (`ingest-event.ts`, report draft helpers, arena CRM loaders, parent summary).

---

## Parallel contour overview

**`CoachSession`** (and **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`**, **`CoachSessionParentDraft`**) is persisted via **`/api/coach/sessions/*`** and **`POST /api/coach/observations`**. **Guardrails** mark this as **not SSOT** for live training. **`coach-app/services/coachSessionLiveService.ts`** and **`coachSessionSyncService.ts`** exist as **frozen** clients; **no** `coach-app` screen **imports** them (per repo grep). **`GET /api/coach/reports/player/[id]`** (**3L**) reads **canonical** draft + signals (**server-side**). **`CoachSession*`** persists only via **parallel** **`/api/coach/sessions/*`** and **`POST /api/coach/observations`**.

---

### Models

| File / definition | Model / entity | Read / write | Notes |
|-------------------|--------------|--------------|--------|
| `prisma/schema.prisma` | **`LiveTrainingSession`** (+ enums, relations to events, drafts, signals, report draft) | R/W via app code | SSOT for live runtime; comment in schema distinguishes from **`CoachSession`**. |
| `prisma/schema.prisma` | **`LiveTrainingSessionReportDraft`**, **`LiveTrainingEvent`**, **`LiveTrainingObservationDraft`**, related signal/observation models | R/W via `service.ts` / ingest | Canonical observation/event pipeline. |
| `src/lib/live-training/service.ts` | **`LiveTrainingSession`** (+ drafts in same flows) | R/W | Create, finish, confirm, publish, active lookup, etc. |
| `src/lib/live-training/ingest-event.ts` | **`LiveTrainingEvent`**, drafts | W (tx) | Ingest path for Arena events. |
| `src/lib/live-training/*.ts` (multiple) | Session + draft reads | Mostly R | Carry-forward, meaning, outcome, CRM arena snapshot, parent summary composition. |
| `src/lib/arena/runtime/arenaRuntimeContext.ts` | **`LiveTrainingSession`** | R | Arena CRM/runtime context. |

---

### Routes

| Route path | Purpose | R/W | Caller(s) (in-repo) | Status | Notes |
|------------|---------|-----|------------------------|--------|--------|
| `POST /api/live-training/sessions` | Create live session | W | `liveTrainingService` | **Canonical** | Delegates `createLiveTrainingSession`. |
| `GET /api/live-training/sessions/[id]` | Session detail | R | `liveTrainingService` | **Canonical** | |
| `POST /api/live-training/sessions/[id]/finish` | Finish session | W | `liveTrainingService` | **Canonical** | |
| `POST /api/live-training/sessions/[id]/confirm` | Confirm / lock-in | W | `liveTrainingService` | **Canonical** | |
| `POST /api/live-training/sessions/[id]/cancel` | Cancel | W | `liveTrainingService` | **Canonical** | |
| `GET /api/live-training/sessions/active` | Active session for coach | R | `liveTrainingService`, `resumeSessionHelpers`, `QuickStartActionsBlock`, `schedule/[id].tsx`, `home.tsx`, `liveTrainingScheduleRouteContext`, `QuickEditTrainingSheet` | **Canonical** | **Primary server “active session” truth** for coach-app. |
| `GET/POST .../sessions/[id]/events` | List / ingest events | R/W | `liveTrainingService` | **Canonical** | Observation/event pipeline. |
| `GET/PATCH .../sessions/[id]/report-draft` | Report draft | R/W | `liveTrainingService` | **Canonical** | |
| `POST .../report-draft/publish` | Publish report | W | `liveTrainingService` | **Canonical** | |
| `GET .../sessions/[id]/drafts`, `PATCH/DELETE .../drafts/[draftId]` | Voice/observation drafts | R/W | `liveTrainingService` | **Canonical** | |
| `GET .../sessions/[id]/review-state` | Review UI state | R | `liveTrainingService` | **Canonical** | |
| `GET .../sessions/[id]/action-candidates`, `POST .../materialize` | Action candidates | R/W | `liveTrainingService` | **Canonical** | |
| `POST .../sessions/[id]/external-coach-recommendations` | External coach recs | W | `liveTrainingService` | **Canonical** | |
| `GET/POST /api/live-training/external-coach-feedback` | External feedback | R/W | `liveTrainingService` | **Canonical** | |
| `GET /api/live-training/start-planning` | Start-planning summary | R | `liveTrainingService` | **Canonical** | |

---

### Services / hooks / screens

| File path | Purpose | Depends on contour | Status | Notes |
|-----------|---------|-------------------|--------|--------|
| `coach-app/services/liveTrainingService.ts` | All canonical live API calls | **Canonical** | **Active** | `BASE = /api/live-training/sessions`. |
| `coach-app/app/live-training/**/*.tsx` | Live, review, complete, report-draft, start | **Canonical** | **Active** | |
| `coach-app/app/(tabs)/arena.tsx` | Arena tab entry | **Canonical** | **Active** | Explicitly forbids CoachSession client. |
| `coach-app/app/(tabs)/home.tsx`, `schedule/[id].tsx` | Active session checks / deep links | **Canonical** | **Active** | |
| `coach-app/components/dashboard/QuickStartActionsBlock.tsx`, `ResumeSessionBlock.tsx` | Resume / start CTAs | **Canonical** | **Active** | |
| `coach-app/lib/resumeSessionHelpers.ts` | Local draft + **GET active** canonical session | **Canonical** (+ local storage) | **Transitional** | Local draft not server SSOT. |
| `coach-app/lib/liveTrainingScheduleRouteContext.ts` | Schedule → live context | **Canonical** | **Active** | |
| `coach-app/hooks/useArenaVoiceAssistant.ts` | Types from `liveTrainingService` | **Canonical** | **Active** | |
| `coach-app/lib/arena*.ts`, `liveTraining*ViewModel.ts` | Arena intelligence / view models | **Canonical** | **Active** | |
| `coach-app/app/session-review.tsx` | Session review center | **Canonical** | **Active** | Comment: no coach-sessions review API. |
| `coach-app/app/coach-input.tsx` | Session capture (manual / structured) | **Canonical** routes only (constants) | **Supporting** | Not Arena live agent; separate from `live-training/*`. |
| `parent-app/...` + `playerService` / parent APIs | Parent player live summary UI | **Canonical** (server-composed) | **Active** | Reads **server** parent summary built from **`LiveTrainingSession`** paths (not CoachSession contour). |

---

## Parallel contour overview

---

### Models

| File / definition | Model / entity | Read / write | Notes |
|-------------------|--------------|--------------|--------|
| `prisma/schema.prisma` | **`CoachSession`** | R/W via coach API routes | Parallel; schema comment: do not expand for product live SSOT. |
| `prisma/schema.prisma` | **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`**, **`CoachSessionParentDraft`** | R/W via routes + reads in coach reports | Observations written by **`POST /api/coach/observations`** and **`/sessions/sync`**. |

---

### Routes

| Route path | Purpose | R/W | Caller(s) (in-repo) | Status | Notes |
|------------|---------|-----|------------------------|--------|--------|
| `POST /api/coach/sessions/start` | Create/reuse **CoachSession** | W | **None** in `coach-app` TS/TSX (service file only, unused) | **Parallel / dormant client** | Route **exists** and writes DB. |
| `GET /api/coach/sessions/active` | Active **CoachSession** | R | **None** (no `coachSessionLiveService` imports) | **Parallel / dormant client** | **Second** “active session” HTTP surface vs canonical. |
| `POST /api/coach/sessions/sync` | Bulk sync bundle → **CoachSession** + observations + snapshots | W | **None** (`coachSessionSyncService` not imported) | **Parallel / dormant client** | Large handler in `sync/route.ts`. |
| `GET /api/coach/sessions/[sessionId]/observations` | List observations for **CoachSession** | R | **None** (dormant client) | **Parallel / dormant client** | |
| `GET /api/coach/sessions/[sessionId]/review` | Review payload for **CoachSession** | R | **None** (dormant client) | **Parallel / dormant client** | |
| `POST /api/coach/observations` | Append **CoachSessionObservation** | W | **None** besides `coachSessionLiveService` **if** used (it is not imported) | **Parallel / hidden write** | **`sessionId`** = **CoachSession.sessionId**, **not** `LiveTrainingSession.id`. |

**Additional server readers of `CoachSession*` (not `/sessions/*` live loop):**

| Route path | Purpose | R/W | Caller(s) | Status | Notes |
|------------|---------|-----|-----------|--------|--------|
| `src/app/api/coach/reports/weekly/route.ts` | **`LiveTrainingSessionReportDraft`** / weekly builder | R | **Coach-app** | **Canonical (3J)** | Was **`CoachSession`**. |
| `src/app/api/coach/reports/player/[id]/route.ts` | **`LiveTrainingSessionReportDraft`** + signals + **`build-player-report-item-from-live-training-draft.ts`** | R | **Coach-app** | **Canonical (3L)** | Was **`CoachSession*`**; **`avgScore`** not returned. |
| `src/app/api/coach/parent-drafts/route.ts` | **`ParentDraft`** + **`LiveTrainingSessionReportDraft`** (`session_draft`) | R | **Coach-app** | **Mixed (3H)** | **`CoachSession`** branch removed. |
| `src/app/api/coach/players/[id]/share-report/route.ts` | **`LiveTrainingSessionReportDraft`** / **`summaryJson`** | R | **Coach-app** (`getCoachShareReport`) | **Canonical (3G)** | Was **`CoachSessionParentDraft`**. |
| `src/app/api/coach/actions/route.ts` | **LiveTrainingPlayerSignal** (negative, confirmed session) | R | **Coach-app** (`coachActionsService`) | **Canonical (3F)** | Was **CoachSessionObservation**. |

---

### Services / hooks / screens

| File path | Purpose | Depends on contour | Status | Notes |
|-----------|---------|-------------------|--------|--------|
| `coach-app/services/coachSessionLiveService.ts` | Client for `/api/coach/sessions/*` + observations | **Parallel** | **Dead in app** (no importers) | Frozen reference; strings point to parallel API. |
| `coach-app/services/coachSessionSyncService.ts` | `POST .../sync` | **Parallel** | **Dead in app** (no importers) | Comment: no coach-app importers. |
| `coach-app/lib/buildCoachSessionSyncPayload.ts` | Payload builder for sync | **Parallel** | **Uncertain / orphan** | **No** repo imports found for this module name — **stub / future** helper. |
| `coach-app/lib/coachAppFlows.ts` | Flow documentation | Both | **Doc** | References forbidden parallel path. |

---

## Cross-contour conflicts

| Conflict area | Files / routes involved | Type | Risk | Notes |
|---------------|-------------------------|------|------|--------|
| **Active session truth** | `GET /api/live-training/sessions/active` vs `GET /api/coach/sessions/active` | **Duplicate HTTP semantics** | **Medium** | Coach-app uses **only** canonical; parallel route still answers if called. |
| **Observation writes** | `POST .../live-training/.../events` (ingest) vs `POST /api/coach/observations` | **Two persistence pipelines** | **High** if parallel used | External/script could write **CoachSessionObservation** without **`LiveTrainingEvent`**. |
| **Review flows** | Live `review-state` + `review.tsx` vs `GET /api/coach/sessions/[id]/review` | **Parallel implementations** | **Medium** | Different payloads and models. |
| **Resume / recovery** | `resumeSessionHelpers` + canonical active vs (unused) CoachSession active | **Divergence if revived** | **Low** today | Product explicitly standardized on canonical. |
| **Sync / offline** | `POST /api/coach/sessions/sync` vs no equivalent single bulk in canonical | **Pattern mismatch** | **Medium** for integrators | Sync route is **heavy**; no coach-app caller. |
| **ID aliasing** | `sessionId` in coach observations = **CoachSession** id string | **Naming collision** | **High** for API consumers | Easy to confuse with **`LiveTrainingSession.id`**. |
| **Coach reports CRM** | **`weekly`** (3J), **`reports/player`** (3L), **`actions`** (3F), **`share-report`** (3G), **`parent-drafts` `session_draft`** (3H) **canonical** on Next | **Aligned** | **Low** (Next) | **`hockey-server`** duplicate paths may still differ. |

---

## Active-session truth analysis

- **Canonical:** **`GET /api/live-training/sessions/active`** + `liveTrainingService.getActiveLiveTrainingSession` — used from **home, schedule, arena, resume helpers, quick actions, quick edit sheet**, etc.
- **Parallel:** **`GET /api/coach/sessions/active`** — **no** in-repo coach-app caller located; **still live** on server if invoked.
- **Intersection:** None in code paths — **no fallback** from canonical to CoachSession in `resumeSessionHelpers` (explicit SSOT comment).

---

## Observation pipeline analysis

- **Canonical:** **`POST /api/live-training/sessions/[id]/events`** → **`ingestLiveTrainingEventForCoach`** → **`LiveTrainingEvent`** (+ drafts / signals per service). Arena voice and UI use this.
- **Parallel:** **`POST /api/coach/observations`** → **`CoachSessionObservation`** keyed by **CoachSession**; **`POST /api/coach/sessions/sync`** can bulk-create observations/snapshots.
- **Intersection:** **No** automatic bridge between contours in audited routes — data can **diverge** if both are used.

---

## Review / confirm / complete flow analysis

- **Canonical:** **`review-state`**, **`review.tsx`**, **`complete.tsx`**, **`confirm`**, **`finish`**, report-draft **GET/PATCH/publish** — all via **`liveTrainingService`**.
- **Parallel:** **`GET .../coach/sessions/[sessionId]/review`** — **CoachSession**-shaped review; **no** coach-app consumer found.
- **Intersection:** Product UX is **canonical-only** on mobile; parallel route is **orphaned** from app perspective.

---

## Resume / recovery / sync analysis

- **Resume:** **`resumeSessionHelpers`** — local **`coachInputStorage`** first, then **canonical** active session fetch.
- **Sync:** **`coachSessionSyncService`** + **`POST /api/coach/sessions/sync`** — **implemented server-side**; **client unused** in repo; **`buildCoachSessionSyncPayload`** appears **unreferenced**.
- **Recovery:** No shared outbox between contours documented in this pass.

---

## Classification summary

| Bucket | Items |
|--------|--------|
| **Canonical** | `LiveTrainingSession` stack, `/api/live-training/sessions/*`, `start-planning`, `external-coach-feedback`, `liveTrainingService`, live-training screens, arena tab, resume helpers’ server leg, parent summary built on live SSOT. |
| **Parallel but active (server)** | All `/api/coach/sessions/*` handlers, `POST /api/coach/observations`, coach report routes reading **`CoachSession*`**. |
| **Transitional** | `resumeSessionHelpers` (local + canonical), parent-facing composed summaries with multiple fallbacks (see `parent-latest-live-training-summary.ts` — not expanded here). |
| **Dead / stub (client)** | `coachSessionLiveService`, `coachSessionSyncService` (no importers); **`buildCoachSessionSyncPayload`** (no importers). |
| **Uncertain** | CRM/HTTP callers for **`/api/coach/reports/*`**; any **external** use of **`POST /api/coach/sessions/sync`** or **`/observations`**. |

---

## Top risks

1. **Hidden writes:** **`POST /api/coach/observations`** and **`sync`** can persist **parallel** data without **`LiveTrainingEvent`** alignment.
2. **Report drift:** Coach **reports** (excluding **`GET /api/coach/actions`**) that aggregate **`CoachSession*`** may **miss** canonical-only live sessions.
3. **Operational confusion:** Two **“active session”** GET endpoints with **different** models.
4. **Future wiring mistake:** Re-importing **`coachSessionLiveService`** would resurrect a **second** live loop.

---

## Recommended next cleanup focus (Phase 3B suggestion)

1. **Runtime / access logs:** Traffic on **`/api/coach/sessions/*`** and **`POST /api/coach/observations`** (confirm **dormant** vs external scripts).
2. **CRM report audit:** **`GET .../reports/weekly`** (**3J**) and **`GET .../reports/player/[id]`** (**3L**) are canonical on Next; validate prod **BASE_URL** vs **`hockey-server`**.
3. **Orphan modules:** Confirm fate of **`buildCoachSessionSyncPayload.ts`** (wire, delete, or archive) after caller check.
4. **Do not** refactor **`src/lib/live-training/service.ts`** in the same pass as contour policy — **policy first**.

---

## DONE / PARTIAL / NOT DONE

**PARTIAL** — Inventory covers **grep-visible** `src/` + `coach-app/` + light **`parent-app`** cross-links; **NOT DONE** for: production traffic, every CRM `fetch` to coach report routes, and dynamic imports. **CoachSession** vs **LiveTrainingSession** naming in **third-party** integrations is **uncertain**.
