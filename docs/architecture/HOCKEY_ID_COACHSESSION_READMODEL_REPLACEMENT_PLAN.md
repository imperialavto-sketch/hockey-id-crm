# Hockey ID CoachSession Read-Model Replacement Plan

**Phase:** 3E — **planning / audit only** (no runtime changes, no Prisma schema changes, no route removal, no live-training refactors).  
**Scope:** Server routes under **`src/app/api/coach/*`** that **read** **`CoachSession*`** to power coach mobile dashboards.  
**Canonical reference:** **`LiveTrainingSession`** + **`LiveTrainingSessionReportDraft.summaryJson`** (typed as **`LiveTrainingSessionReportDraftSummary`** in `src/lib/live-training/live-training-session-report-draft.ts`), **`LiveTrainingEvent`**, **`LiveTrainingPlayerSignal`**, and published **`TrainingSessionReport`** (where applicable).  
**Evidence:** Route source reads (April 2026), Prisma schema, grep for CRM callers in `src/` (none found for these paths).

### Phase 3F (implemented)

**`GET /api/coach/actions`** (`src/app/api/coach/actions/route.ts`) was migrated from **`CoachSessionObservation`** (negative, ended **`CoachSession`**) to **`LiveTrainingPlayerSignal`** with **`signalDirection === negative`**, scoped to **`LiveTrainingSession.status === confirmed`**. JSON response shape unchanged (`playerId`, `playerName`, `reason`, `severity`, `observationsCount`, `updatedAt`). **`observationsCount`** is now a **count of negative signals** per player (field name retained for client compatibility). Legacy parallel-session negatives are **not** included.

### Phase 3G (implemented)

**`GET /api/coach/players/[id]/share-report`** was migrated from **`CoachSessionParentDraft`** to **`LiveTrainingSessionReportDraft.summaryJson`** (confirmed sessions; newest draft first). Extraction is implemented in **`src/lib/coach/live-training-report-draft-parent-extract.ts`** (**`extractParentFacingFromSummary`**, **`parseLiveTrainingReportDraftSummary`**) — shared with Phase **3H**. **Canonical message rule (fixed chain):** **`sessionMeaningParentActionsV1`** → **`coachPreviewNarrativeV1.playerHighlights`** → **`notes.positives`** → positive **`players[].evidence`**. Response contract unchanged. Legacy **`parentMessage`** is **not** read.

### Phase 3H (implemented)

**`GET /api/coach/parent-drafts`:** the **`session_draft`** branch no longer reads **`CoachSession`** / **`CoachSessionParentDraft`**. It uses **`LiveTrainingSessionReportDraft`** (confirmed **`LiveTrainingSession`**, **`updatedAt` desc**, take 50) and the same **`summaryJson`** extraction as share-report. One **`session_draft`** row per player (newest drafts first; first time a player appears in scan order wins). **`session_draft` `id`** = **`${reportDraftId}_${playerId}`** (replaces **`CoachSessionParentDraft.id`**). The **`parent_draft`** (**`ParentDraft`**) branch is **unchanged**.

### Phase 3J (implemented)

**`GET /api/coach/reports/weekly`** — canonical **`LiveTrainingSessionReportDraft`** + **`build-weekly-report-items-from-live-training-drafts.ts`** (confirmed sessions, draft **`updatedAt` desc**, take 50). **Ready / timestamp** rules match **3I** audit recommendation.

### Phase 3L (implemented)

**`GET /api/coach/reports/player/[id]`** — canonical **`LiveTrainingSessionReportDraft`** + **`extractParentFacingFromSummary`** (same scan as **`share-report`**: confirmed, **`updatedAt` desc**, take 40). **`observationsCount`** = **`LiveTrainingPlayerSignal.count`** for the matched session + player. **`avgScore`** is **omitted** (no canonical 1:1 to **`CoachSessionPlayerSnapshot.skills`**; no heuristic). Helper: **`build-player-report-item-from-live-training-draft.ts`**.

---

## Canonical vs CoachSession read-model reminder

| Aspect | CoachSession read-model routes | Canonical contour |
|--------|-------------------------------|-----------------|
| **Primary rows** | **`CoachSession`** (ended), **`CoachSessionParentDraft`**, **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`** | **`LiveTrainingSession`** (confirmed/finished flow), **`LiveTrainingSessionReportDraft`** (1:1, `summaryJson`), **`LiveTrainingPlayerSignal`**, **`LiveTrainingEvent`** |
| **Per-player parent copy** | **`CoachSessionParentDraft`** (headline, `parentMessage`, `positives`, `improvementAreas`, `focusSkills`) | **`summaryJson.players`**, **`coachPreviewNarrativeV1.playerHighlights`**, **`sessionMeaningParentActionsV1`**, etc. (not identical layout) |
| **“Negative attention”** | **`CoachSessionObservation.impact === "negative"`** on **ended** sessions | **`LiveTrainingPlayerSignal.signalDirection`** (enum `LiveTrainingObservationSentiment`), evidence on draft summary |
| **Standalone drafts** | **`ParentDraft`** (already separate in `parent-drafts` route) | Same model — **not** part of `CoachSession` contour |

**Important:** **`could be derived`** means a **projection/adapter** can be specified; it does **not** mean the data is **already** exposed on these HTTP routes today.

---

## Route-by-route dependency table

| Route | Current `CoachSession*` dependency | Output purpose | Active usage status | Canonical replacement feasibility | Projection gap | Migration group | Notes |
|-------|--------------------------------------|----------------|---------------------|-----------------------------------|----------------|-----------------|--------|
| **`GET /api/coach/reports/weekly`** — `src/app/api/coach/reports/weekly/route.ts` | **Was:** **`coachSession`** + **`coachSessionParentDraft`**. **Now (3J):** **`liveTrainingSessionReportDraft`** + **`build-weekly-report-items-from-live-training-drafts.ts`**. | JSON array: per **player** `playerId`, `playerName`, `shortSummary`, `keyPoints`, `updatedAt`, `ready: true` | **Coach-app:** `getCoachWeeklyReports` → same screens. **CRM `src/`:** none found. | **Done (3J)** | Same extract as **3G/3H**; **`updatedAt`:** `confirmedAt` → `endedAt` → draft `updatedAt`. | **Done** | Player report route **not** migrated. |
| **`GET /api/coach/reports/player/[id]`** — `src/app/api/coach/reports/player/[id]/route.ts` | **Was:** **`coachSessionParentDraft`** + **`CoachSessionObservation`** count + snapshot **`avgScore`**. **Now (3L):** **`liveTrainingSessionReportDraft`** + extract; **`liveTrainingPlayerSignal.count`**; **`avgScore`** not returned. | Single player payload: `observationsCount`, `shortSummary`, `keyPoints`, `recommendations`, `updatedAt`, `ready` (**`avgScore`** optional on client — omitted) | **Coach-app:** `player/[id]/report.tsx`. **CRM `src/`:** none found. | **Done (3L)** | Same extract as **3G/3H**; **`updatedAt`:** `confirmedAt` → `endedAt` → draft `updatedAt`. **`avgScore`** dropped (explicit; see **3K** audit). | **Done** | Legacy parallel-only rows no longer feed this route. |
| **`GET /api/coach/parent-drafts`** — `src/app/api/coach/parent-drafts/route.ts` | **Standalone:** **`parentDraft`**. **`session_draft` (3H):** **`liveTrainingSessionReportDraft`** + **`summaryJson`** (confirmed). **Was:** **`coachSession`** + **`coachSessionParentDraft`**. | Merged list: `source` `parent_draft` \| `session_draft`, previews, `updatedAt`, optional `voiceNoteId` | **Coach-app:** `getCoachParentDrafts` → same screens. **CRM `src/`:** none found. | **Done (3H)** for **`session_draft`** | Shared extract: **`live-training-report-draft-parent-extract.ts`**. **Gap:** parallel **`parentMessage`** history not merged. | **Done** (session leg) | **`parent_draft`** branch unchanged. |
| **`GET /api/coach/players/[id]/share-report`** — `src/app/api/coach/players/[id]/share-report/route.ts` | **Was:** **`coachSessionParentDraft`**. **Now (3G):** **`liveTrainingSessionReportDraft.summaryJson`** (confirmed sessions, newest first). | Share payload: `message`, `shortSummary`, `keyPoints`, `recommendations`, `ready` | **Coach-app:** `getCoachShareReport` → `share-report.tsx`. **CRM `src/`:** none found. | **Done (3G)** | Fixed chain on **`LiveTrainingSessionReportDraftSummary`** (§ Phase 3G). **Gap:** no published **`TrainingSessionReport`** text; parallel **`parentMessage`** not merged. | **Done** | § Phase 3G (implemented). |
| **`GET /api/coach/actions`** — `src/app/api/coach/actions/route.ts` | **Was:** **`coachSessionObservation`** (negative) on ended **`coachSession`**. **Now (3F):** **`liveTrainingPlayerSignal`** (`negative`) + **`liveTrainingSession.status === confirmed`**. | Per-player `reason`, `severity`, `observationsCount`, `updatedAt` | **Coach-app:** `coachActionsService` / `coachActionHelpers` → same screens as before. **CRM `src/`:** none found. | **Done (3F)** — canonical projection in-route | **Gap handled:** legacy **`CoachSessionObservation`** negatives no longer surface here; only post-confirm live-training signals. | **Done** | See § Phase 3F (implemented). |

---

## Projection gap analysis

### Fields / data today on CoachSession read path only

| Data | Used by routes | Notes |
|------|----------------|--------|
| **`CoachSession.endedAt` / `startedAt`** as “session time” | historical parallel writes; **not** weekly / parent-drafts / actions / share after 3F–3J | Canonical: **`LiveTrainingSession.endedAt` / `confirmedAt`** + draft timestamps — different lifecycle. |
| **`CoachSessionParentDraft` per-player fields** | **parallel history only** (**weekly**, **share**, **parent-drafts `session_draft`**, **player report** migrated **3G–3L**) | Canonical: **embedded in `summaryJson`** on migrated routes. |
| **`CoachSessionObservation.impact` + `note` + `skillType`** | historical parallel writes only; **not** read by **`GET /api/coach/actions`** after 3F | **`GET /api/coach/actions`** reads **`LiveTrainingPlayerSignal`**. |
| **`CoachSessionPlayerSnapshot.skills` → `avgScore`** | was player report (**3L** drops **`avgScore`** on Next route) | Canonical: **not** approximated; field omitted. |

### Likely available from canonical contour (theoretical)

| Source | Relevant content | Routes helped |
|--------|------------------|---------------|
| **`LiveTrainingSessionReportDraft.summaryJson`** (`LiveTrainingSessionReportDraftSummary`) | `players[]`, `notes`, `coachPreviewNarrativeV1`, `sessionMeaningParentActionsV1`, counters | **weekly (3J)** + **share (3G)** + **parent-drafts `session_draft` (3H)** + **player report (3L)** |
| **`LiveTrainingPlayerSignal`** | Negative / positive / neutral **per player**, `evidenceText` | actions (negative aggregation) |
| **`LiveTrainingSession`** | Coach, team, status, ended/confirmed | scoping queries |
| **`TrainingSessionReport`** (published) | Long-form parent/school copy after publish | share / weekly “ready” **if** product adopts publish as gate |

### Gaps requiring explicit follow-up (no schema change in this pass)

| Gap type | Description |
|----------|-------------|
| **Projection logic** | Single module: **canonical summary + signals →** existing JSON shapes expected by **`coachReportsService` / `coachParentDraftsService` / `coachActionsService`** (or versioned API). |
| **Historical backfill** | Old **`CoachSession*`** data without **`LiveTrainingSession`** — **dual-read**, **migration script**, or **accept empty** for legacy window. |
| **Product rule** | Definition of **ready**, **share message** source of truth, whether **`avgScore`** survives. |
| **Signal coverage** | **`GET /api/coach/actions`** now depends on confirm-time signals; coaches who only had parallel **`CoachSession`** data lose that feed on this endpoint until they use canonical live + confirm. |
| **Deployment** | **`hockey-server`** overlaps **other** coach paths (Phase 3D); read-model routes analyzed here are **Next `src/app/api`** — still confirm **which host** coach-app hits in prod. |

---

## Recommended migration order

### Group A — best first replacement candidates (after minimal prerequisites)

- **`GET /api/coach/actions`** — **Done in Phase 3F** (signal-backed).
- **`GET /api/coach/players/[id]/share-report`** — **Done in Phase 3G** (summaryJson fallback chain).

*Coach CRM report reads on **`CoachSession*`** (weekly, share, parent-drafts **`session_draft`**, player report): **done** in **3F–3L** on Next **`src/app/api/coach/*`**. Remaining **`CoachSession*`** usage is **parallel write/active/review** routes and historical rows — not this read-model set.*

### Group B — replace after projection helper(s)

- **(Complete for listed coach report GETs.)** Player report uses **`build-player-report-item-from-live-training-draft.ts`**.

### Group C — blocked / needs product or data decision

- **Optional:** restore a **real** **`avgScore`** only if a canonical numeric skill aggregate is added later (not invented in **3L**).
- **“Share message”** single string vs structured parent actions.
- **Any route** until **historical CoachSession data** policy is decided.

### Group D — verify usage first

- **CRM or external** consumers of these five paths (none in `src/` grep); confirm via **gateway logs** or **API keys** if applicable. Coach-app usage **already verified** in Phase 3B/3D docs.

---

## Risks

| Risk | Mitigation (future phases) |
|------|----------------------------|
| **Empty dashboards** after switching read source before canonical data exists | **Dual-read** merge with explicit precedence; feature flag per route. |
| **Semantic drift** (weekly “ready” vs draft/published) | Product spec + contract tests on JSON shape. |
| **Two servers** (`Next` vs `hockey-server`) | Phase 3D map; ensure coach-app **BASE_URL** hits the stack that has canonical data. |
| **Over-promising “direct replacement”** | All routes need **adapters**; none are drop-in SQL swaps. |

---

## Final phased plan (safest order after planning)

1. **Prerequisites (ops + data):** Confirm production host for coach-app API; sample **`LiveTrainingSessionReportDraft`** rows for real coaches; verify **`LiveTrainingPlayerSignal`** density for completed live sessions.
2. **Projection helper design (doc + interface only in planning; code later):** Define pure functions **`canonicalReportSummary →`** weekly row, player detail, share DTO; document **fallback** when draft missing.
3. **First low-risk implementation:** **3F–3L** complete for actions, share, parent-drafts **`session_draft`**, **weekly**, **player report** ( **`avgScore`** omitted ).
4. **Mid phase:** Dual-read / backfill for **legacy-only** parallel data if product requires (not implemented).
5. **Later:** Optional **`avgScore`** if canonical source exists.
6. **Retirement prerequisites (not now):** Stable canonical reads, **traffic ≈ 0** on legacy tables for new data, stakeholder sign-off — **no route removal** until then.

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | **3F–3H** as before; **3J** weekly + **`build-weekly-report-items-from-live-training-drafts.ts`**; **3L** **`GET /api/coach/reports/player/[id]`** + **`build-player-report-item-from-live-training-draft.ts`** (**`avgScore`** omitted). |
| **PARTIAL** | **`CoachSession*`** still used on **parallel** session/observation **write** routes; **`hockey-server`** may duplicate some coach paths with different logic. |
| **NOT DONE** | Dual-read merge for legacy-only data, schema changes, **`CoachSession`** route removal, backfill scripts, log-based validation. |
