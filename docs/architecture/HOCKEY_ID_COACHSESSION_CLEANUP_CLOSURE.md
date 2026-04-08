# Hockey ID CoachSession Cleanup Closure

**Phase:** 3M — **documentation / closure only** (no runtime changes, no schema changes, no route removal, no refactors).  
**Purpose:** Close the **CoachSession cleanup block** for **implementation at the current stage**: read-model migration and planning on the **Next** stack are **done**; **follow-up is operational** (traffic, deployment host, `hockey-server` overlap) rather than further **broad code migration** in this block.

**Related docs:** [`HOCKEY_ID_USAGE_INVENTORY.md`](./HOCKEY_ID_USAGE_INVENTORY.md), [`HOCKEY_ID_LIVE_TRAINING_CONTOURS_INVENTORY.md`](./HOCKEY_ID_LIVE_TRAINING_CONTOURS_INVENTORY.md), [`HOCKEY_ID_COACHSESSION_DISPOSITION_PLAN.md`](./HOCKEY_ID_COACHSESSION_DISPOSITION_PLAN.md), [`HOCKEY_ID_COACHSESSION_READMODEL_REPLACEMENT_PLAN.md`](./HOCKEY_ID_COACHSESSION_READMODEL_REPLACEMENT_PLAN.md), [`HOCKEY_ID_COACHSESSION_CALLER_VERIFICATION_MAP.md`](./HOCKEY_ID_COACHSESSION_CALLER_VERIFICATION_MAP.md), [`HOCKEY_ID_PLAYER_REPORT_REPLACEMENT_AUDIT.md`](./HOCKEY_ID_PLAYER_REPORT_REPLACEMENT_AUDIT.md), [`HOCKEY_ID_WEEKLY_REPORT_REPLACEMENT_AUDIT.md`](./HOCKEY_ID_WEEKLY_REPORT_REPLACEMENT_AUDIT.md), [`HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md`](./HOCKEY_ID_COACH_API_DEPLOYMENT_AUDIT.md) (**Phase 4A** — deployment / routing).

---

## What was completed

This block delivered **inventory**, **disposition**, **freeze/guardrails**, **caller verification**, **read-model replacement planning**, and **implementation** of canonical-backed **GET** routes on **`src/app/api/coach/*`** (Next).

| Track | Deliverable |
|-------|-------------|
| **Inventory** | Live-training vs parallel contour inventories; usage inventory updates (`HOCKEY_ID_USAGE_INVENTORY`, `HOCKEY_ID_LIVE_TRAINING_CONTOURS_INVENTORY`). |
| **Disposition** | `HOCKEY_ID_COACHSESSION_DISPOSITION_PLAN.md` — what to keep, migrate, or document as transitional. |
| **Freeze / guardrails** | Phase **3C** — documentation-only **PHASE 3C** lines on parallel **`/api/coach/sessions/*`**, **`POST /api/coach/observations`**, review/observation GETs, and frozen coach-app clients (`coachSessionLiveService`, `coachSessionSyncService`, `buildCoachSessionSyncPayload`). |
| **Caller / deployment map** | `HOCKEY_ID_COACHSESSION_CALLER_VERIFICATION_MAP.md` — static proof: no coach-app product importers for parallel clients; **Next vs `hockey-server`** path overlap and **different Prisma models** documented. |
| **Read-model planning** | `HOCKEY_ID_COACHSESSION_READMODEL_REPLACEMENT_PLAN.md`, weekly + player report audits (**3I**, **3K**). |
| **Migrated routes (Next)** | See table below. |

**Migrated GET routes (canonical read path, no `CoachSession*` backing on these handlers):**

| Route | Phase | Canonical sources (summary) |
|-------|-------|-----------------------------|
| **`GET /api/coach/actions`** | **3F** | **`LiveTrainingPlayerSignal`** (negative), **`LiveTrainingSession.status === confirmed`**. |
| **`GET /api/coach/players/[id]/share-report`** | **3G** | **`LiveTrainingSessionReportDraft.summaryJson`** + **`extractParentFacingFromSummary`**. |
| **`GET /api/coach/parent-drafts`** — **`session_draft` branch | **3H** | Same draft + extract as **3G**; **`parent_draft`** branch unchanged (**`ParentDraft`**). |
| **`GET /api/coach/reports/weekly`** | **3J** | **`build-weekly-report-items-from-live-training-drafts.ts`** + confirmed drafts. |
| **`GET /api/coach/reports/player/[id]`** | **3L** | **`build-player-report-item-from-live-training-draft.ts`** + signal count; **`avgScore`** omitted by design. |

Shared extraction / projection libs: **`src/lib/coach/live-training-report-draft-parent-extract.ts`**, **`build-weekly-report-items-from-live-training-drafts.ts`**, **`build-player-report-item-from-live-training-draft.ts`**.

---

## Remaining frozen / transitional surfaces

These are **intentionally retained** in this block; **not** deleted or refactored here.

| Area | Role |
|------|------|
| **Next parallel HTTP** | **`POST /api/coach/sessions/start`**, **`GET .../active`**, **`POST .../sync`**, **`GET .../[sessionId]/observations`**, **`GET .../[sessionId]/review`**, **`POST /api/coach/observations`** — still read/write **`CoachSession*`**; marked **frozen / non-SSOT** for live training. |
| **Dormant coach-app clients** | **`coachSessionLiveService.ts`**, **`coachSessionSyncService.ts`**, **`buildCoachSessionSyncPayload.ts`** — no product-screen importers per static grep; kept with freeze comments. |
| **Prisma models** | **`CoachSession`**, **`CoachSessionObservation`**, **`CoachSessionPlayerSnapshot`**, **`CoachSessionParentDraft`** — **not** removed; historical and parallel-ingest data may still exist. |
| **`hockey-server`** | **`server.js`** registers overlapping **`/api/coach/*`** paths with **different** persistence (**`TrainingSession`**, **`observation`**, etc.) vs Next **`CoachSession*`** — **not** reconciled in this block. |
| **`GET /api/coach/parent-drafts`** **`parent_draft`** | Still **`ParentDraft`** / voice-adjacent flows — **not** part of the **`CoachSession`** read-model migration set. |

**Not safe to delete yet:** parallel routes and models without **production traffic proof**, **stakeholder sign-off**, and a **retirement plan** (see risks).

---

## Current architectural position

- **`LiveTrainingSession`** (+ **`LiveTrainingSessionReportDraft`**, **`LiveTrainingPlayerSignal`**, events/drafts under **`/api/live-training/*`**) is the **canonical live-training SSOT** for school Arena and coach mobile product flows wired to **`liveTrainingService`**.
- **`CoachSession`** is **no longer** the backing source for the **main Next coach CRM report / dashboard read routes** listed in § What was completed (actions, share, parent-drafts **`session_draft`**, weekly, player report).
- **`CoachSession`** **parallel surfaces** remain **frozen / transitional / ops-sensitive**: they can still receive HTTP traffic from scripts, old builds, or **`hockey-server`**-fronted deployments; they are **not** assumed unused without **log / gateway evidence**.

---

## Risks and known gaps

| Risk / gap | Notes |
|------------|--------|
| **Legacy-only data** | Rows that exist only in **`CoachSession*`** (e.g. old parent drafts) **do not** appear on canonical-backed report GETs; coaches may see **`ready: false`** or empty lists where parallel data once appeared. |
| **`ready: false`** | Absence of a **confirmed** live session draft with extractable parent-facing **`summaryJson`** for that player yields empty-style responses — by design after migration, not a bug in isolation. |
| **Signal count vs observation count** | **`GET /api/coach/reports/player/[id]`** uses **`LiveTrainingPlayerSignal.count`** per session as **`observationsCount`**; legacy used **`CoachSessionObservation.count`** — same field name, **different semantics**. |
| **`avgScore`** | **Intentionally not** recreated from heuristics on canonical data (**3L**); UI uses **`overallScore: null`** / stable band when absent. |
| **Next vs `hockey-server`** | Same path prefixes may hit **different** stacks and **different** tables; **production `BASE_URL`** and gateway routing are **not** proven by static repo analysis. |
| **Dual-read / backfill** | Not implemented: no merge of parallel **`CoachSessionParentDraft`** into canonical GETs for historical windows. |
| **Tests / logs** | No mandatory log-based validation of draft/signal density in production was part of this block. |

---

## Recommended next-phase focus

**Single recommended next major area:** **operational verification and deployment boundary for coach APIs** — concretely:

1. Confirm **which host** coach-app **`BASE_URL`** hits in each environment (Next app vs **`hockey-server`** vs gateway).
2. For overlapping paths (**`sessions/start`**, **`sessions/active`**, **`coach/observations`**, **`reports/*`**, etc.), use **access logs or metrics** to see if **`hockey-server`** handlers still receive meaningful traffic.
3. Record outcomes in a short **runbook** or update **`HOCKEY_ID_COACHSESSION_CALLER_VERIFICATION_MAP.md`** with **“verified in prod/staging as of …”** (or explicit **“unknown”**).

Only **after** that evidence should a **separate** block consider **`hockey-server`** deprecation, parallel route removal, or schema retirement — **out of scope** for **3M** and **not** started here.

---

## DONE / PARTIAL / NOT DONE

| Status | Meaning |
|--------|---------|
| **DONE** | **3M** closure doc; CoachSession **read-model migration** on **Next** for listed GETs (**3F–3L**); planning/inventory/disposition/freeze/caller map as referenced above. **Implementation of this cleanup block is closed** pending ops follow-up, not pending another broad migration pass in-repo without new evidence. |
| **PARTIAL** | **`hockey-server`** overlap; production traffic; optional dual-read/backfill; **`parent_draft`** branch unchanged by design. |
| **NOT DONE** | Remove **`CoachSession`** routes or models; change Prisma schema; unify Express + Next coach HTTP without a dedicated project phase. |
