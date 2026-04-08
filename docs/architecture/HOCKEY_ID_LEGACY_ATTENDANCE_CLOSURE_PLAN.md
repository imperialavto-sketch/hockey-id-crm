# Hockey ID Legacy Attendance Closure Plan

**Phase:** 2C — inventory and closure planning only.  
**Rules for this document:** No runtime changes, route removal, or schema edits are implied by this plan; it classifies what exists and recommends a sequence for future work.

---

## Current canonical attendance path

School attendance **SSOT** is **`TrainingSession` + `TrainingAttendance`** (`prisma.trainingSession` / `prisma.trainingAttendance`).

| Concern | Route(s) / surface |
|--------|---------------------|
| Per-player write | `POST /api/trainings/[id]/attendance` — body `{ playerId, status: "present" \| "absent" }` (optional `comment` accepted server-side but **not** stored on `TrainingAttendance`). |
| Bulk write | `POST /api/trainings/[id]/attendance/bulk` — `present` / `absent` only. |
| Reads (examples) | `GET /api/trainings/[id]/attendance`, `GET /api/player/[id]/trainings`, coach schedule via `/api/coach/schedule` + `/api/trainings/*`, CRM `ScheduleDetailPage` + player edit attendance (Phase 2A/2B). |
| Analytics (canonical slice) | `GET /api/analytics/attendance` — aggregates **`trainingAttendances`** (not legacy `Attendance`). |

---

## Remaining legacy attendance writers

Legacy writes target Prisma **`Attendance`** (FK to legacy **`Training`**), not `TrainingAttendance`.

| File path | Route/path called or implemented | Write type | Active / transitional / dead / uncertain | Notes |
|-----------|----------------------------------|------------|------------------------------------------|--------|
| `src/app/api/legacy/trainings/[id]/attendance/route.ts` | **`POST /api/legacy/trainings/[id]/attendance`** (implemented) | `prisma.attendance.upsert` | **Transitional / compatibility** | **No in-repo TypeScript caller** found (`grep` for `legacy/trainings` + `attendance` in `*.ts`/`*.tsx` under repo root: only this route file, docs, and a **comment** on `players/[id]/edit/page.tsx`). External clients or bookmarks **uncertain**. |
| `src/app/api/legacy/trainings/[id]/attendance/bulk/route.ts` | **`POST /api/legacy/trainings/[id]/attendance/bulk`** (implemented) | Bulk `prisma.attendance.upsert` | **Transitional / compatibility** | Same: **no in-repo caller** for this POST path. |
| `prisma/seed.ts` | N/A (script) | `prisma.attendance.upsert` (dev seed) | **Dev-only** | Seeds legacy `Training` + `Attendance` for local/staging data. |
| `scripts/seed-full.js` | N/A (script) | `prisma.attendance.upsert` | **Dev-only** | Same role as seed. |

**Not a legacy writer:** `scripts/crm-e2e-sanity.ts` exercises **`GET`** `/api/legacy/trainings/[id]` (detail PATCH/DELETE) and **`GET`** `/api/legacy/player/.../trainings`; it does **not** call legacy attendance POST endpoints.

---

## Remaining legacy attendance readers

Reads use relation **`Player.attendances` → `Attendance` → `Training`**, or legacy training payloads that embed `attendances`. **Exception (Phase 2D):** `GET /api/parent/players` builds its JSON `attendances` array from **`TrainingAttendance` + `TrainingSession`** (adapter shape); it no longer reads legacy `Attendance`.

| File path | Source read | Read type | Active / transitional / dead / uncertain | Notes |
|-----------|-------------|-----------|------------------------------------------|--------|
| `src/app/api/attendance/route.ts` | **`GET /api/attendance`** — `prisma.attendance.findMany` + 4-state `summary` | HTTP aggregate | **Uncertain (likely admin / unused in repo)** | Route header states no expansion; **no `fetch("/api/attendance")`** in `src/`, `coach-app/`, or `parent-app/` TS/TSX. Treat as **external or bookmark** until verified. |
| `src/app/api/legacy/trainings/[id]/route.ts` | **`GET /api/legacy/trainings/[id]`** — `include: { attendances: { include: { player } } }` | Embedded in legacy training detail | **Transitional** | Consumed by sanity script and any external legacy detail clients. |
| `src/app/api/legacy/coach/trainings/route.ts` | **`GET /api/legacy/coach/trainings`** — trainings + `attendances` | List with nested rows | **Transitional** | `crm-e2e-sanity.ts` calls this list path. |
| `src/app/api/legacy/player/[id]/trainings/route.ts` | **`GET /api/legacy/player/[id]/trainings`** — `training` + per-player `attendances` | Legacy player training list | **Transitional** | `crm-e2e-sanity.ts` calls this path. |
| `src/app/api/parent/players/route.ts` | **`GET /api/parent/players`** — `trainingAttendances` + session fields → mapped JSON **`attendances`** | Parent-facing full player payload | **Active product path** | **Phase 2D:** canonical attendance read; `training.id` in each row is **`TrainingSession.id`**. `comment` always `null`. |
| `src/app/api/analytics/route.ts` | `prisma` queries with `players: { include: { attendances: true } }` (and team/coach shapes) | Server-side aggregate for main analytics API | **Active product path** | CRM analytics UI may use other tabs; this route still **mixes legacy attendance** into coach/team summaries. **Out of scope to fix in 2C** — inventory only. |
| `src/app/api/player/[id]/ai-analysis/route.ts` | **`trainingAttendances: { select: { status } }`** → `generatePlayerAnalysis` | AI analysis input | **Active** | **Phase 2F:** canonical read; `PlayerAnalysisInput.attendances` still the param name for rows passed in. |
| `src/app/api/player/[id]/achievements/route.ts` | **`trainingAttendances: { select: { status } }`** | Achievement evaluation input | **Active** | **Phase 2F** |
| `src/app/api/player/[id]/ai/route.ts` | **`trainingAttendances`** | Development index | **Active** | **Phase 2F** |
| `src/app/api/player/[id]/ranking/route.ts` | **`trainingAttendances`** (player + list) | Ranking | **Active** | **Phase 2F** |
| `src/app/api/ratings/route.ts` | **`trainingAttendances`** | Ratings list context | **Active** | **Phase 2F** |
| `src/app/api/ratings/top/route.ts` | **`trainingAttendances`** | Top ratings | **Active** | **Phase 2F** |
| `src/lib/ai/player-analysis.ts` | N/A (pure function) | Consumes `{ status }[]` via **`isAttendancePresentForScoring`** | **Active (indirect)** | **Phase 2F:** canonical + legacy status strings. |
| `src/lib/attendance-status-scoring.ts` | N/A | **`isAttendancePresentForScoring`** | **Active** | **Phase 2F:** shared normalization for Bucket B. |

**Canonical readers (not legacy `Attendance`):** e.g. `GET /api/coach/trainings` maps **`trainingAttendances`** to a shape still named `attendances` in JSON — that is **not** the legacy model; do not conflate when closing legacy paths.

**Intentionally excluded from legacy table:** `src/lib/player-attendance-summary.ts` — documented as **TrainingSession + TrainingAttendance only**.

---

## 4-state / comment dependency inventory

| File path | Dependency type | Product-critical or not | Notes |
|-----------|-----------------|-------------------------|--------|
| `src/app/api/legacy/trainings/[id]/attendance/route.ts` | **4-state** `LEGACY_STATUSES` + **optional `comment`** persisted on `Attendance` | **Compatibility** | Only path that **writes** legacy comment column for school attendance. |
| `src/app/api/legacy/trainings/[id]/attendance/bulk/route.ts` | **4-state** status on bulk upsert | **Compatibility** | No comment field on bulk update in current code. |
| `src/app/api/attendance/route.ts` | **4-state** summary (`present` / `absent` / `late` / `excused`) | **Uncertain** | If any consumer exists off-repo, it expects legacy semantics. |
| `src/app/api/analytics/route.ts` | Counts **`PRESENT`**, **`ABSENT`**, **`LATE`** on `player.attendances` | **Yes** (if analytics tab used) | Diverges from canonical 2-state world until migrated. |
| `src/app/api/parent/players/route.ts` | **Phase 2D:** `PRESENT` / `ABSENT` only (from canonical `present`/`absent`); `comment` always null | **Yes** if clients assumed legacy LATE/EXCUSED or comment | Prefer aligning with CRM schedule SSOT; breaking change only if a client depended on legacy-only fields. |
| `src/lib/ai/player-analysis.ts` | **`isAttendancePresentForScoring`** (canonical **`present`** + legacy **`PRESENT`** only; not **LATE**) | **Medium** | **Phase 2F:** aligned with canonical rows from updated routes. |
| `src/lib/player-ai.ts` / `src/lib/player-ranking.ts` | Via **`calcAttendanceScore`** + helper | **Medium** | **Phase 2F:** same normalization. |
| `coach-app/constants/attendanceData.ts` + `coach-app/app/attendance/[teamId].tsx` | **4-state** mock UI | **Not production SSOT** | Gated by config; local state only, **no** legacy API writes. |

---

## Closure buckets

### A. Can close soon (after verification)

- **`GET /api/attendance`**: If runtime verification confirms **no** external/admin dependency, could deprecate, guard behind admin flag, or document sunset — **do not delete** until confirmed (per project rules).
- **`POST /api/legacy/trainings/[id]/attendance`** and **`.../bulk`**: If **no** production traffic (logs/metrics) and no contractual mobile client, candidates for **hard deprecation** (410 + message) in a **later** phase — **not** until readers that still display legacy rows are addressed or explicitly accepted.

### B. Needs migration first

- ~~**`src/app/api/parent/players/route.ts`**~~ — **Done in Phase 2D** (canonical `trainingAttendances` + adapter).
- **`src/app/api/analytics/route.ts`** — reconcile attendance blocks with **`TrainingAttendance`** (or single read model) before removing legacy writers; overlaps with analytics reconciliation called out in Phase 2A/2B docs.
- ~~**Player APIs** (`ai-analysis`, `achievements`, `ai`, `ranking`, `ratings`, `ratings/top`)~~ — **Done in Phase 2F** (`trainingAttendances` + **`attendance-status-scoring`**).

### C. Keep temporarily for compatibility

- **`POST /api/legacy/trainings/*/attendance*`** — keep until all verified writers are gone and data backfill/migration policy is decided.
- **`GET /api/legacy/trainings/[id]`**, **`GET /api/legacy/coach/trainings`**, **`GET /api/legacy/player/[id]/trainings`** — keep for E2E and any legacy integrations until training list/detail migration is complete (attendance is only one facet).
- **`prisma/seed.ts`**, **`scripts/seed-full.js`** — keep legacy seeds until dev environments standardize on `TrainingSession` fixtures only (optional later cleanup).

### D. Uncertain / verify at runtime

- **Any off-repo client** (old mobile build, Postman collections, admin scripts) calling legacy attendance POST or `GET /api/attendance`.
- **Production traffic** to `POST /api/legacy/trainings/.../attendance` — **no in-repo TS caller** does not prove zero traffic.

---

## Recommended execution order

1. **Instrument or query logs** (outside this doc’s scope) for: `POST /api/legacy/trainings/*/attendance`, `POST .../bulk`, `GET /api/attendance`.
2. **Migrate high-visibility readers** that power **parent** and **player intelligence** surfaces: ~~`parent/players` route~~ (**Phase 2D**), then `player/[id]/ai-analysis`, `achievements`, `ai`, `ranking`, `ratings` — switch includes to **`trainingAttendances`** (or computed summary) with explicit mapping of `present`/`absent` into existing score logic.
3. **Reconcile `GET /api/analytics`** attendance-related sections with canonical data (separate tracked initiative; aligns with “analytics reconciliation” deferral).
4. **Narrow E2E** (`crm-e2e-sanity.ts`): after legacy list endpoints are retired or redundant, drop legacy GET checks; optionally add assertions for canonical attendance POST if not already present elsewhere.
5. **Deprecate then remove** legacy attendance **writes** only when (2)–(3) are done and logs show no use.
6. **Retire `GET /api/attendance`** last or fold into a secured admin report backed by canonical aggregates.

---

## Risks

- **Dual truth:** Canonical **`TrainingAttendance`** can be full while legacy **`Attendance`** is empty — **parent (2D)** and **Bucket B player/ratings APIs (2F)** now use canonical rows for attendance scoring inputs; **`GET /api/analytics`** can still **disagree** with those surfaces until Bucket C reconciliation.
- **Silent reliance:** Legacy POST routes may still be used by **untracked clients**; removing or breaking them without log proof causes production incidents.
- **Scope creep:** Legacy **training** list/detail routes are broader than attendance; closing attendance-only must not accidentally delete training CRUD still referenced by sanity tests.

---

## DONE / PARTIAL / NOT DONE

**PARTIAL** — In-repo **writers** and **readers** for legacy school `Attendance` are enumerated; **CRM main attendance UX** (2A–2B); **parent players** (2D); **Bucket B** player intelligence + ratings routes (2F). **NOT DONE:** **`GET /api/analytics`** attendance slice, **`GET /api/attendance`**, legacy training embeds, runtime traffic verification, route deletion.
