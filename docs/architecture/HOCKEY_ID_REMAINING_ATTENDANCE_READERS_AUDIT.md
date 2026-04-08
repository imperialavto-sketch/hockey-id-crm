# Hockey ID Remaining Attendance Readers Audit

**Phase:** 2E — static audit only (no code or schema changes).  
**Phase 2F:** Bucket B routes listed below were **migrated** to **`trainingAttendances`** + shared status normalization — see implementation in repo; table rows below describe **pre-migration** state for history.  
**Scope:** Legacy **`Player.attendances` → `Attendance` → `Training`** readers still in use after Phase 2D (`GET /api/parent/players` migrated to `TrainingAttendance`).  
**Excluded from “remaining”:** CRM player edit + schedule detail attendance UX (canonical), `GET /api/parent/players` (canonical adapter), and **`GET /api/analytics/attendance`** (already **`trainingAttendances`** / canonical — do not confuse with **`GET /api/analytics`**).

---

## Current canonical attendance reminder

- **Models:** `TrainingSession`, `TrainingAttendance` (`status`: `present` \| `absent` in DB).  
- **Typical APIs:** `/api/trainings/[id]/attendance*`, `GET /api/player/[id]/trainings`, parent schedule, etc.  
- **Legacy:** `Attendance` on `Training` uses Prisma enum **`PRESENT` \| `ABSENT` \| `LATE` \| `EXCUSED`** and optional **`comment`**.

---

## Reader inventory

| File path | Route/domain | Current legacy source | Semantics used | Criticality | Migration complexity | Bucket | Notes |
|-----------|--------------|----------------------|----------------|-------------|----------------------|--------|--------|
| `src/app/api/analytics/route.ts` | **`GET /api/analytics`** (CRM analytics) | `players`: `attendances: { include: { training: true } }`; `teams.players` / `coaches.teams.players`: `attendances: true` | **Raw rows** for per-player summary: counts **`PRESENT`**, **`ABSENT`**, **`LATE`**; coach/team rolls use **PRESENT count** and **row count**. **`training` join** loaded for top-level player query (not exposed in final JSON payload for players list, but used while building `attendanceSummary`). **Coach `trainingsCount`** uses **`team.trainings`** (legacy **`Training`** list), not attendance-only. | **High** | **Larger redesign / coordinated change** | **C** | Only reader here that **explicitly surfaces `late`** in `attendanceSummary`. Canonical 2-state has **no LATE**; migrating without product/analytics decision changes dashboard meaning. Tied to broader **analytics reconciliation**. |
| `src/app/api/player/[id]/ai-analysis/route.ts` | **`GET /api/player/[id]/ai-analysis`** | `attendances: { select: { status: true } }` → `generatePlayerAnalysis` | **Status strings only**; **`PRESENT`** vs total for prompt attendance summary (**`buildPromptData`**). No comment/training fields from attendance. | **Medium** | **Small adapter** | **B** | Same pattern as other player-* routes; **`present`/`absent`** from DB must align with **`=== "PRESENT"`** in `src/lib/ai/player-analysis.ts` (normalize or map once). |
| `src/app/api/player/[id]/achievements/route.ts` | **`GET /api/player/[id]/achievements`** | `attendances: { select: { status: true } }` | **`PRESENT` count / total** → `attendancePercent` for **`evaluatePlayerAchievements`**. No comment; no training join. | **Medium** | **Small adapter** | **B** | **LATE/EXCUSED** today count as “not present” (same as canonical **absent**). |
| `src/app/api/player/[id]/ai/route.ts` | **`GET /api/player/[id]/ai`** | `attendances: { select: { status: true } }` → `calculatePlayerDevelopment` | **`calcAttendanceScore`**: **`PRESENT` / length** only (`src/lib/player-ai.ts`). | **Medium** | **Small adapter** | **B** | Shared scoring with ranking. |
| `src/app/api/player/[id]/ranking/route.ts` | **`GET /api/player/[id]/ranking`** | Same include on one player + list for percentile | Same as **`player/ai`** via **`calculatePlayerRanking` → calculatePlayerDevelopment`**. | **Medium** | **Small adapter** | **B** | Two `findMany`/`findUnique` includes; same swap pattern. |
| `src/app/api/ratings/route.ts` | **`GET /api/ratings`** | `attendances: { select: { status: true } }` | Internal only for **`calculatePlayerRanking`**; response exposes scores, not raw attendance rows. | **Medium** | **Small adapter** | **B** | Batch with other ranking consumers. |
| `src/app/api/ratings/top/route.ts` | **`GET /api/ratings/top`** | Same as `ratings/route.ts` | Same. | **Medium** | **Small adapter** | **B** | Batch with `ratings/route.ts`. |
| `src/app/api/attendance/route.ts` | **`GET /api/attendance`** | `prisma.attendance.findMany` + **4-state `summary`** | **Full legacy rows** + **present/absent/late/excused** totals; includes **`training`** and **`player`** slices. | **Low–uncertain** | **Larger redesign** if replaced by canonical aggregate (new query shape) | **D** | **No in-repo TS client** found in prior audits; may be admin/external. Verify traffic before changing. |
| `src/app/api/legacy/trainings/[id]/route.ts` | **`GET/PATCH/DELETE /api/legacy/trainings/[id]`** (GET embeds) | `include: { attendances: { include: { player: true } } }` | **Full legacy attendance rows** + **player** on each row; **4-state + comment** possible on model. | **Low** (compat) | **N/A — compatibility surface** | **D** | Contract is **legacy training detail**; changing embed semantics breaks legacy clients. Any move to canonical is **route redesign or parallel field**, not a drop-in read swap. |
| `src/app/api/legacy/coach/trainings/route.ts` | **`GET /api/legacy/coach/trainings`** | Trainings + nested **`attendances`** | **Raw rows** for legacy list. | **Low** (compat + E2E) | **N/A — compatibility** | **D** | **`scripts/crm-e2e-sanity.ts`** calls this path. |
| `src/app/api/legacy/player/[id]/trainings/route.ts` | **`GET /api/legacy/player/[id]/trainings`** | `training` + **`attendances`** for player | **Raw legacy attendance** per training slot. | **Low** (compat + E2E) | **N/A — compatibility** | **D** | Sanity script calls this path. |

---

## Bucket A — safe batch migration now

**None without at least a minimal normalization step.** Canonical `TrainingAttendance.status` is **`present` / `absent`** (lowercase strings in DB); current **`calcAttendanceScore`**, **`buildPromptData`**, and achievements math use **`status === "PRESENT"`** (uppercase enum serialization).  

**Practical equivalent to “batch now”:** migrate **Bucket B** routes in **one PR** plus **one** of: (1) normalize in **`src/lib/player-ai.ts`** + **`src/lib/ai/player-analysis.ts`**, or (2) map `trainingAttendances` → `{ status: "PRESENT" \| "ABSENT" }` at route boundary. That is still classified below as **Bucket B** (small adapter), not pure “no adapter.”

---

## Bucket B — migrate with small adapter

**Done (Phase 2F):** all six routes now use **`trainingAttendances`**; normalization lives in **`src/lib/attendance-status-scoring.ts`** (`isAttendancePresentForScoring`) and call sites in **`src/lib/player-ai.ts`**, **`src/lib/ai/player-analysis.ts`**, and **`src/app/api/player/[id]/achievements/route.ts`**.

~~**Batch together (recommended single execution batch after adapter choice):**~~

1. ~~`src/app/api/player/[id]/ai-analysis/route.ts`~~  
2. ~~`src/app/api/player/[id]/achievements/route.ts`~~  
3. ~~`src/app/api/player/[id]/ai/route.ts`~~  
4. ~~`src/app/api/player/[id]/ranking/route.ts`~~  
5. ~~`src/app/api/ratings/route.ts`~~  
6. ~~`src/app/api/ratings/top/route.ts`~~  

**Analytics-specific risk:** **None** for this bucket — these routes are **not** the main analytics dashboard.

---

## Bucket C — wait until analytics reconciliation

- **`src/app/api/analytics/route.ts`**  
  - **Why:** **`late`** (and distinction between absent vs late) in **`attendanceSummary`**; mixed use of **legacy `team.trainings`** for workload counts; product-facing CRM **analytics** tab.  
  - **Migrate with** the planned **analytics / dual-model reconciliation** pass, not as a silent reader-only swap.

---

## Bucket D — verify runtime/external callers first

- **`GET /api/attendance`** — unknown off-repo consumers; aggregate contract.  
- **`src/app/api/legacy/trainings/[id]/route.ts`** — legacy detail + embedded **`attendances`**.  
- **`src/app/api/legacy/coach/trainings/route.ts`** — E2E + legacy integrations.  
- **`src/app/api/legacy/player/[id]/trainings/route.ts`** — E2E + legacy integrations.  

**Do not** batch these with Bucket B without explicit compatibility and caller analysis.

---

## Proposed next execution order

1. ~~**Implement normalization**~~ — **Done (Phase 2F):** **`src/lib/attendance-status-scoring.ts`** + updates in **`player-ai.ts`** / **`player-analysis.ts`**.  
2. ~~**Batch migrate Bucket B**~~ — **Done (Phase 2F).**  
3. **QA** ranking + AI analysis + achievements against players who only have canonical rows (ongoing).  
4. **Later:** **`GET /api/analytics`** attendance blocks + **`late`** semantics (Bucket C).  
5. **Later:** **`GET /api/attendance`** + legacy training routes (Bucket D) after logs/E2E contract review.

---

## Risks

- **Scoring shift:** Players with **only** canonical attendance today show **0** legacy rows; after Bucket B migration they **gain** scores/percent from **`TrainingAttendance`** — intended alignment, but **visible** ranking/achievement changes.  
- **Analytics split:** Until Bucket C, **CRM analytics** (`/api/analytics`) can still **disagree** with **`/api/analytics/attendance`** and with player-facing routes post–Bucket B.  
- **Legacy routes:** Changing embedded **`attendances`** without a **new API version** breaks **explicit legacy** consumers.

---

## DONE / PARTIAL / NOT DONE

**DONE** — Static inventory (Phase 2E) + **Bucket B code migration (Phase 2F)** for the six player/ratings routes and shared libs above.  
**NOT DONE** — Bucket C/D readers, schema change, route removal, full runtime verification.
