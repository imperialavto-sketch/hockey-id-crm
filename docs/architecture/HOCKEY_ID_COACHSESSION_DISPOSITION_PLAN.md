# Hockey ID CoachSession Disposition Plan

**Phase:** 3B — **planning / audit only** (no runtime changes, no Prisma changes, no route removal, no live-training refactors).  
**Inputs:** Phase 3A [`HOCKEY_ID_LIVE_TRAINING_CONTOURS_INVENTORY.md`](./HOCKEY_ID_LIVE_TRAINING_CONTOURS_INVENTORY.md), follow-up static grep (April 2026).

### Phase 3C freeze (applied — guardrails only)

**Formal freeze** (route/service **comments only**; **no** runtime, schema, or read-model route changes): parallel **`CoachSession`** **write** (`POST .../sessions/start`, `POST .../sessions/sync`, `POST /api/coach/observations`), **active** (`GET .../sessions/active`), **session-scoped reads** (`GET .../[sessionId]/observations`, `GET .../[sessionId]/review`), plus frozen **client/helpers** (`coach-app/services/coachSessionLiveService.ts`, `coachSessionSyncService.ts`, `coach-app/lib/buildCoachSessionSyncPayload.ts`). Each file carries a **PHASE 3C** line pointing here.

**Out of scope in 3C (intentionally):** **`CoachSession` read-model** HTTP routes — **`/api/coach/reports/*`**, **`/api/coach/parent-drafts`**, **`GET .../players/[id]/share-report`**, **`/api/coach/actions`** — remain **active / transitional** for coach-app dashboards until **traffic verification** and **canonical-backed replacement planning** (Phase 3D / 3E in this doc). **Do not** treat 3C as permission to expand the parallel contour for new live-training features.

---

## Canonical vs parallel reminder

| Contour | SSOT / role |
|---------|----------------|
| **Canonical** | **`LiveTrainingSession`** + **`/api/live-training/sessions/*`** + **`coach-app/services/liveTrainingService.ts`** — Arena live, events/ingest, review/confirm/complete, active session for coach mobile product path. |
| **Parallel** | **`CoachSession`** + **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`**, **`CoachSessionParentDraft`** + **`/api/coach/sessions/*`** + **`POST /api/coach/observations`** — **not** live-training SSOT; still backs **some coach-app dashboards** via **read-model** HTTP routes. |

**Important correction vs Phase 3A wording:** Routes under **`/api/coach/reports/*`**, **`/api/coach/parent-drafts`**, **`/api/coach/actions`**, and **`/api/coach/players/[id]/share-report`** are **not** “caller uncertain” in-repo — **`coach-app`** imports **`coachReportsService`**, **`coachParentDraftsService`**, **`coachActionsService`** and helpers used from **home, reports, parent-drafts, created, actions, player detail, dashboard blocks**, etc. They remain **transitional** relative to canonical live data, but they are **product-active** reads.

**Extra deployment surface:** Root **`hockey-server/server.js`** implements overlapping **`/api/coach/sessions/*`**, **`/api/coach/observations`**, and several coach report-style paths. Disposition must assume **hosts outside this Next.js tree** may still call the same path shapes until ops inventory confirms otherwise.

---

## Area-by-area disposition

| Area | Scope | Recommended disposition | Rationale |
|------|--------|-------------------------|-----------|
| **Write surfaces** | `POST .../sessions/start`, `POST .../sessions/sync`, `POST /api/coach/observations` | **Verify traffic first** + **freeze only** (no expansion per existing architecture locks) | Duplicate observation/session persistence vs canonical ingest; **no** `coach-app` importer found for the dedicated parallel **client** services, but **HTTP remains callable** by scripts, old builds, or `hockey-server`. |
| **Active-session surfaces** | `GET .../sessions/active` | **Verify traffic first** + **freeze only**; **migrate to canonical later** if any caller confirmed | Conflicts with **`GET /api/live-training/sessions/active`**; coach-app product path uses canonical only (Phase 3A). |
| **Observation surfaces** | `GET .../sessions/[sessionId]/observations`, observation writes above | **Verify traffic first** + **freeze only**; **migrate to canonical later** if a real consumer exists | Same dual-pipeline risk as writes; read route unused by traced coach-app parallel client. |
| **Review / sync surfaces** | `GET .../sessions/[sessionId]/review`, `POST .../sessions/sync` | **Verify traffic first** + **freeze only**; **uncertain** long-term need | Parallel review shape vs live-training `review-state`; sync is bulk alternative to incremental canonical APIs. |
| **Report / read-model surfaces** | Weekly + player report, parent-drafts, share-report, actions | **Keep temporarily as transitional read model** + **needs canonical replacement planning** | **Confirmed in-repo consumers** in coach-app; **cannot** be dropped without replacement or data backfill strategy. |
| **Mobile client / service surfaces** | `coachSessionLiveService.ts`, `coachSessionSyncService.ts`, `buildCoachSessionSyncPayload.ts` | **Freeze only**; **`buildCoachSessionSyncPayload`** = **uncertain** (orphan module) | No TS/TSX **imports** of the two services (grep); risk is **future re-wiring**, not current product path. |

Legend: **Freeze only** = policy already in `HOCKEY_ID_SSOT.md` / Phase 0–4 docs — hold line, no new features on this contour. **Verify traffic first** = production or gateway logs before any later deprecation talk. **Migrate to canonical later** = explicit future phase, not this pass.

---

## Route-by-route disposition table

| Route | Purpose (summary) | Model dependency | Known caller(s) or uncertainty | Conflict with canonical | Recommended disposition | Notes |
|-------|-------------------|------------------|------------------------------|-------------------------|-------------------------|--------|
| **`POST /api/coach/sessions/start`** | Create or reuse **`CoachSession`** row | **`CoachSession`** (W) | **No** in-repo coach-app screen import of `coachSessionLiveService`; **uncertain** external / **`hockey-server`** / old clients | Second “start session” vs **`POST /api/live-training/sessions`** | **Verify traffic first**; **freeze only** | Implementation: `src/app/api/coach/sessions/start/route.ts`. |
| **`GET /api/coach/sessions/active`** | Return active **`CoachSession`** for coach | **`CoachSession`** (R) | **No** traced coach-app caller (canonical active used instead); **uncertain** external | Duplicate “active session” vs **`GET /api/live-training/sessions/active`** | **Verify traffic first**; **freeze only** | `src/app/api/coach/sessions/active/route.ts`. |
| **`POST /api/coach/sessions/sync`** | Bulk upsert session + observations + snapshots + parent drafts | **`CoachSession`**, **`CoachSessionObservation`**, snapshots, drafts (W) | **No** `coachSessionSyncService` importer; **uncertain** external / sync clients | Bulk write path vs canonical event ingest | **Verify traffic first**; **freeze only** | Large handler: `src/app/api/coach/sessions/sync/route.ts`. |
| **`GET /api/coach/sessions/[sessionId]/observations`** | List observations for **`CoachSession`** | **`CoachSession`**, **`CoachSessionObservation`** (R) | **No** traced coach-app consumer of parallel client; **uncertain** external | Parallel read vs **`GET/POST .../live-training/.../events`** | **Verify traffic first**; **freeze only** | `src/app/api/coach/sessions/[sessionId]/observations/route.ts`. |
| **`GET /api/coach/sessions/[sessionId]/review`** | Review payload for **`CoachSession`** | **`CoachSession`** + related reads (R) | **No** traced coach-app consumer; **uncertain** external | Parallel vs live-training review-state | **Verify traffic first**; **freeze only** | `src/app/api/coach/sessions/[sessionId]/review/route.ts`. |
| **`POST /api/coach/observations`** | Append **`CoachSessionObservation`** | **`CoachSession`**, **`CoachSessionObservation`** (W) | Only **string reference** in `coachSessionLiveService.ts` (module unused); **uncertain** external | **High** — second observation pipeline vs **`LiveTrainingEvent`** ingest | **Verify traffic first**; **freeze only** | Body **`sessionId`** = **`CoachSession.sessionId`**, not **`LiveTrainingSession.id`**. `src/app/api/coach/observations/route.ts`. |
| **`GET /api/coach/reports/weekly`** | Weekly coach report list | **`CoachSession`** (+ joins as implemented) (R) | **`coachReportsService`** ← **`weeklyReportHelpers`** ← **`reports.tsx`**, **`home.tsx`**, **`CoachHomePrioritiesHelpers`**, **`WeeklyReportsBlock`**, **`coachMarkDigestHelpers`** | Read model may **omit** sessions that exist only in **`LiveTrainingSession`** | **Keep as transitional read model**; **needs canonical replacement planning** | `src/app/api/coach/reports/weekly/route.ts`. |
| **`GET /api/coach/reports/player/[id]`** | Player-level coach report | **`CoachSessionParentDraft`**, **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`**, **`CoachSession`** (R) | **`coachReportsService`** ← **`coach-app/app/player/[id]/report.tsx`** | Same drift risk vs canonical-published artifacts | **Keep as transitional read model**; **needs canonical replacement planning** | `src/app/api/coach/reports/player/[id]/route.ts`. |
| **`GET /api/coach/parent-drafts`** | List parent-draft candidates | **`CoachSession`** (+ related) (R) | **`coachParentDraftsService`** ← **`parentDraftHelpers`** ← **`home`**, **`created`**, **`parent-drafts`**, **`ParentDraftsBlock`**, **`coachHomePrioritiesHelpers`**, **`coachMarkDigestHelpers`** | Drafts tied to **`CoachSession`** stack, not necessarily live SSOT | **Keep as transitional read model**; **needs canonical replacement planning** | `src/app/api/coach/parent-drafts/route.ts`. |
| **`GET /api/coach/players/[id]/share-report`** | Payload for share-report UX | **`CoachSessionParentDraft`**, **`CoachSession`** (R) | **`coachParentDraftsService`** ← **`player/[id]/share-report.tsx`**; navigation from **`parent-drafts`**, **`report`**, **`ParentDraftsBlock`**, **`coachHomePrioritiesHelpers`** | Same | **Keep as transitional read model**; **needs canonical replacement planning** | `src/app/api/coach/players/[id]/share-report/route.ts`. |
| **`GET /api/coach/actions`** | Action items from **`CoachSessionObservation`** | **`CoachSessionObservation`**, **`CoachSession`** (R) | **`coachActionsService`** ← **`coachActionHelpers`** ← **`actions/index`**, **`player/[id]/index`**, **`CoachActionBlock`**, **`coachHomePrioritiesHelpers`**, **`coachMarkDigestHelpers`** | Actions may not reflect canonical live-only observations | **Keep as transitional read model**; **needs canonical replacement planning** | `src/app/api/coach/actions/route.ts`. |

---

## Service/module disposition

| File | Importer status (in-repo TS/TSX) | Runtime significance today | Recommended disposition |
|------|-----------------------------------|----------------------------|-------------------------|
| **`coach-app/services/coachSessionLiveService.ts`** | **No** imports from other app modules (only comments / cross-references elsewhere) | **Low** — dormant client; **would** hit parallel routes if imported | **Freeze only**; treat as **reference / anti-pattern anchor**; do not attach new navigation (already stated in `appFlowContours` / Phase 3 docs). **Not** “safe to delete” without traffic proof and explicit deprecation phase. |
| **`coach-app/services/coachSessionSyncService.ts`** | **No** importers | **Low** | Same as above. |
| **`coach-app/lib/buildCoachSessionSyncPayload.ts`** | **No** importers found (filename / symbol grep) | **None** traced | **Uncertain** — likely orphan helper; **verify references** (dynamic import, copy-paste) then either **wire explicitly**, **document dead**, or schedule removal in a **future** cleanup phase **after** traffic and policy sign-off — **not** immediate deletion in 3B. |

---

## Read-model dependence analysis

| Surface | Route(s) | Coach-app touchpoints (examples) | Classification |
|---------|----------|----------------------------------|----------------|
| **Coach weekly reports** | `GET /api/coach/reports/weekly` | `reports.tsx`, `home.tsx`, dashboard blocks, digest helpers | **Transitional read model for now**; **needs canonical replacement planning** (e.g. derive from **`LiveTrainingSession`** + published report draft / **`TrainingSessionReport`** — exact mapping TBD in a later phase). |
| **Player coach report** | `GET /api/coach/reports/player/[id]` | `player/[id]/report.tsx` | Same. |
| **Parent drafts** | `GET /api/coach/parent-drafts` | `parent-drafts.tsx`, `created.tsx`, home, `ParentDraftsBlock`, priorities/digest | Same. |
| **Share report** | `GET /api/coach/players/[id]/share-report` | `share-report.tsx`, links from report + drafts flows | Same. |
| **Actions** | `GET /api/coach/actions` | `actions/index.tsx`, player tab, `CoachActionBlock`, priorities/digest | Same. |

**Unknown usage / verify first (outside monorepo):** CRM web app, scripts, Postman collections, **`hockey-server`** clients, and mobile builds not in this workspace may call **write** or **read** paths; static analysis cannot close this gap.

---

## Recommended phased closure order

1. **Phase 3D — Verify traffic and external callers (highest priority for *write* and *duplicate active* surfaces)**  
   - Log or gateway metrics on **`/api/coach/sessions/*`** and **`POST /api/coach/observations`**.  
   - Inventory whether **`hockey-server/server.js`** is still fronting production for the same paths as Next.js `src/app/api/coach/**`.  
   - Outcome: classify each write route **dormant vs actively used** (not a code change).

2. **Phase 3C — Freeze / annotate / fence (documentation and API-contour clarity)**  
   - Consolidate “parallel write surface” warnings in one internal runbook (optional OpenAPI / README pointer).  
   - **No new product binding** to parallel contour (already policy); 3C is **communication reinforcement** after 3D facts where helpful.  
   - *Optional later code pass (not 3B):* response headers or structured deprecation hints — only after traffic story is clear.

3. **Phase 3E — Read-model migration or canonical-backed projections**  
   - **Cannot remove** report/parent-drafts/actions/share-report routes until coach-app has an alternate data source.  
   - Plan: dual-read, backfill **`CoachSession*`** from canonical artifacts, or **new** read APIs that read **`LiveTrainingSession`** / report tables only — **design phase**, not execution in 3B.

**Ordering rationale:** Read-model routes are **proven active** in coach-app; **write** routes are **high conflict** but **unclear traffic**. Establish **who calls writes** before any future deprecation; **keep reads** until **3E** delivers replacements.

---

## Risks

| Risk | Detail |
|------|--------|
| **False assumption of “unused”** | **No in-repo importer** ≠ no production traffic on **`POST .../sync`** or **`/observations`**. |
| **Read vs write asymmetry** | Team might freeze writes while dashboards still assume **`CoachSession*`** rows exist — **stale or empty** UI if canonical live never populated parallel tables. |
| **Dual server stacks** | **`hockey-server/server.js`** duplicates path semantics; disposition on Next routes alone is **incomplete** without ops mapping. |
| **ID aliasing** | **`sessionId`** on coach observation APIs is **`CoachSession`**-scoped; integrators can confuse with **`LiveTrainingSession.id`**. |
| **Premature removal** | Deleting routes or clients without **3D** + **3E** breaks **home / reports / drafts / actions** flows. |

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | Disposition plan documented: areas, routes, services, read-model analysis, phased order, risks. **Phase 3C:** parallel **write / active / session-scoped parallel GET / POST observations** routes + **frozen client modules** carry **PHASE 3C** header comments (documentation-only). |
| **PARTIAL** | **Caller lists** for read-model routes are **in-repo complete**; **write-route** callers remain **environment-dependent**. |
| **NOT DONE** | Production traffic study; **`hockey-server`** vs Next routing map; canonical projection design; any code/schema/route changes; read-model route migration. |
