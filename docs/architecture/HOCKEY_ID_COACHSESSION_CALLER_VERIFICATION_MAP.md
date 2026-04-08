# Hockey ID CoachSession Caller Verification Map

**Phase:** 3D — **static verification mapping only** (no runtime changes, no log analysis in this document, no schema or route removal).  
**Purpose:** Record **what the codebase can prove** about callers and **deployment overlap** for **Phase 3C–frozen** parallel **`CoachSession`** HTTP surfaces in **`src/app/api/coach/**`** and their **coach-app client/helper** counterparts.  
**Evidence:** Repository grep and file reads (April 2026).

---

## Frozen surfaces under verification

| Surface | Type | In-repo caller status | Mirrored in `hockey-server/server.js`? | Deployment uncertainty | Notes |
|---------|------|------------------------|----------------------------------------|-------------------------|--------|
| `POST /api/coach/sessions/start` — `src/app/api/coach/sessions/start/route.ts` | Next route | **No** executing TS/TSX caller found. **Dormant client:** path strings live only in `coach-app/services/coachSessionLiveService.ts`, which has **no** importers. **Docs:** `PHASE2_REPORT.md`, architecture docs reference historical flows. | **Yes** — `app.post("/api/coach/sessions/start", …)` (~L2072) | **High** — same path; **different persistence:** Next uses **`prisma.coachSession`**; Express uses **`prisma.trainingSession`**. Whichever host fronts `api.example/...` determines behavior. | Response shapes differ (e.g. Next returns `sessionId` per CoachSession API; Express returns `id` for training row). |
| `GET /api/coach/sessions/active` — `active/route.ts` | Next route | **No** app caller; canonical **`getActiveLiveTrainingSession`** used instead. **Docs/comments** only elsewhere. | **Yes** — `app.get("/api/coach/sessions/active", …)` (~L2120) | **High** — same path; **different model** (`CoachSession` vs **`trainingSession`**). | `resumeSessionHelpers.ts` explicitly **no** `CoachSession` fallback (live-training SSOT only). Stale doc `docs/ARCHITECTURE_API_AUDIT_PHASE_2.md` still mentions old fallback — **docs only**, not code. |
| `POST /api/coach/sessions/sync` — `sync/route.ts` | Next route | **No** importer of `coachSessionSyncService` or direct `fetch` to this path in TS/TSX. | **No** — grep finds **no** `/api/coach/sessions/sync` in `hockey-server/server.js` | **Medium** — Next-only surface; still **HTTP-callable** by scripts, Postman, or unreleased clients. | Largest **`CoachSession`** bulk writer in Next stack. |
| `GET /api/coach/sessions/[sessionId]/observations` — `[sessionId]/observations/route.ts` | Next route | **No** app caller via traced client; would be used if `coachSessionLiveService` were wired. | **Yes** — `app.get("/api/coach/sessions/:id/observations", …)` (~L2201) | **High** — path shape differs slightly (`:id` vs Next dynamic segment); both list observations but Next reads **`CoachSessionObservation`**, Express **`prisma.observation`** keyed by **`trainingSession`**. | Same URL family, **not** same rows. |
| `GET /api/coach/sessions/[sessionId]/review` — `[sessionId]/review/route.ts` | Next route | **No** app caller traced. | **Yes** — `app.get("/api/coach/sessions/:id/review", …)` (~L2232) | **High** — Next **`CoachSession`** review vs Express **`trainingSession` + observations**. | |
| `POST /api/coach/observations` — `observations/route.ts` | Next route | **No** app caller; only string in unused `coachSessionLiveService.ts`. | **Yes** — `app.post("/api/coach/observations", …)` (~L2151) | **High** — both POST observations; Next → **`CoachSessionObservation`**; Express → **`prisma.observation`** on **`trainingSession`**. Body requirements differ (Express requires **`teamId`** in body). | **Not** safe to assume one client works against both backends without contract test. |
| `coach-app/services/coachSessionLiveService.ts` | Client service | **No** `import` from other `coach-app` `.ts`/`.tsx` modules (only comments reference it). | N/A (client) | Low for **current** app bundle; **unknown** if copied into fork or dynamic import (none found). | Single concentrated place for parallel path strings. |
| `coach-app/services/coachSessionSyncService.ts` | Client service | **No** importers. | N/A | Same as above. | |
| `coach-app/lib/buildCoachSessionSyncPayload.ts` | Helper | **No** imports of this module or exports `buildCoachSessionBundlePayload` / `mapCompletedSessionToSyncPayload` outside the file itself. `coachInputStorage.ts` imports **`CoachSessionBundlePayload` type** from `@/models/coachSessionSync`, **not** this helper. | N/A | **Orphan module** in static graph; could still be pasted/called manually. | |

**Test / script coverage:** Grep for `coach/sessions`, `coach/observations` under common test globs (`*.test.ts`, `*.spec.ts`, e2e) returned **no hits** — **not** proof of absence in CI configs outside those patterns.

---

## Next vs hockey-server overlap

| Path (family) | Next.js (`src/app/api/coach/...`) | `hockey-server/server.js` | Same purpose? | Same data model? |
|---------------|-----------------------------------|---------------------------|---------------|------------------|
| `POST .../sessions/start` | **Yes** — `CoachSession` | **Yes** — **`TrainingSession`** | Overlapping **product intent** (start coach session) | **No** — different tables |
| `GET .../sessions/active` | **Yes** — `CoachSession` | **Yes** — **`TrainingSession`** | Overlapping intent | **No** |
| `POST .../sessions/sync` | **Yes** — `CoachSession` + related | **No** route located | Next-only bulk sync | N/A on Express |
| `GET .../sessions/:id/observations` | **Yes** — `CoachSessionObservation` | **Yes** — `Observation` | Overlapping intent | **No** |
| `GET .../sessions/:id/review` | **Yes** — `CoachSession` | **Yes** — `TrainingSession` + obs | Overlapping intent | **No** |
| `POST .../coach/observations` | **Yes** — `CoachSessionObservation` | **Yes** — `Observation` | Overlapping intent | **No** |

**Nearby server files:** `hockey-server/lib/prisma.js`, `prisma/seed.js`, `services/sms.js` — **no** additional `/api/coach/sessions/*` registrations found; **only** `server.js` defines the overlapping coach session HTTP surface.

**Production traffic:** This map **does not** read access logs. **Cannot** state whether production hits Next, Express, both, or neither for each path.

---

## Possible caller categories

| Category | Meaning for frozen surfaces |
|----------|----------------------------|
| **Direct in-repo caller found** | TS/TSX `import` + use, or `fetch`/`apiFetch` to exact path from app code. | **None found** for frozen **write/active/sync/session GET** routes in current coach-app product path. |
| **No in-repo caller found** | Static graph shows no consumer. | **Does not imply** zero production traffic — HTTP remains public to any bearer-capable client. |
| **Docs / comments only** | Historical runbooks, `PHASE2_REPORT.md`, `ARCHITECTURE_*`, inline PHASE comments. | Confirms **past** intent to use parallel API; may be **stale** vs current code (e.g. resume fallback). |
| **Test / script only** | Automated callers. | **None found** in repo grep for these paths. |
| **Mirrored in server** | Duplicate route registration in `hockey-server`. | **Yes** for most paths; **different Prisma models** — path collision risk. |
| **Possible old mobile / external** | Older app builds, sideloads, scripts, other repos. | **Unknown** — requires store/build history + gateway logs. |
| **Unknown** | Default when neither static proof nor logs available. | Applies to **real-world hit counts** and **primary deployment target**. |

---

## Read-model boundary (not part of frozen surface traffic proof)

These routes **still read** **`CoachSession*`** and **are actively used** from coach-app (see `coachReportsService`, `coachParentDraftsService`, `coachActionsService`). They **keep the contour economically relevant** but are **out of scope** for Phase 3C freeze comments and **not** the subject of “dormant parallel write” proof:

- `GET /api/coach/reports/weekly` — `src/app/api/coach/reports/weekly/route.ts`
- `GET /api/coach/reports/player/[id]` — `src/app/api/coach/reports/player/[id]/route.ts`
- `GET /api/coach/parent-drafts` — `src/app/api/coach/parent-drafts/route.ts`
- `GET /api/coach/players/[id]/share-report` — `src/app/api/coach/players/[id]/share-report/route.ts`
- `GET /api/coach/actions` — `src/app/api/coach/actions/route.ts`

**Separation rule:** Read-model traffic **does not** validate parallel **write** surfaces; it only shows **`CoachSession` rows** (or empty UI) may still matter for dashboards until **Phase 3E** replacement.

---

## Verification conclusions

1. **Static caller graph:** No in-repo **executing** consumer of the frozen Next **`CoachSession`** session/write routes or of **`coachSessionLiveService` / `coachSessionSyncService` / `buildCoachSessionSyncPayload`** was found; product live path uses **`liveTrainingService`** + **`/api/live-training/sessions/*`**.
2. **“No in-repo caller” ≠ “safe to remove”:** Routes remain deployed and auth-gated; external or legacy callers cannot be ruled out without **runtime** evidence.
3. **Deployment overlap is worse than duplicate paths:** **`hockey-server`** reuses **similar URLs** but backs them with **`TrainingSession` / `Observation`**, not **`CoachSession`**. A single mobile `BASE_URL` mistake could cause **silent semantic mismatch** (wrong DB, wrong response shape).
4. **`POST .../sessions/sync`:** Implemented **only** on Next in this audit; still a **high-impact** writer if called.
5. **Documentation drift:** Some older markdown (`ARCHITECTURE_API_AUDIT_PHASE_2.md`) describes **`resumeSessionHelpers`** calling parallel active — **current code does not**; treat as **commentary risk**, not runtime truth.

---

## Recommended Phase 3E prerequisite notes

Before designing read-model migration or any deprecation:

1. **Ops / infra map:** For each environment (staging, prod), record **which process** serves `GET/POST https://…/api/coach/sessions/*` and `…/api/coach/observations` — Next app vs `hockey-server` vs reverse-proxy to another service.
2. **Access logs or metrics** (outside this doc): Request counts per path on the **actual** production host; segment by user-agent or API key if available.
3. **Contract diff checklist:** If both stacks remain temporarily, document **required body fields** and **response JSON** differences (e.g. `teamId` on Express observations POST).
4. **Read-model plan:** Phase 3E still depends on replacing or dual-sourcing **`CoachSession*`-backed** reads listed in **Read-model boundary** — independent of proving write-path dormancy.

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | Frozen surfaces enumerated; in-repo caller mirror vs **no importer** documented; **Next vs `hockey-server`** overlap table with **model divergence** called out; read-model boundary separated; conclusions scoped to **code evidence only**. |
| **PARTIAL** | **Dynamic imports** / codegen / monorepo-external callers not exhaustively ruled out beyond grep patterns used. |
| **NOT DONE** | Runtime access logs, per-env routing truth, removal or consolidation of **`hockey-server`** duplicate paths, Phase 3E implementation. |
