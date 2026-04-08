# Hockey ID Analytics Attendance Reconciliation Audit

**Phase:** 2G — static audit only (no runtime, schema, or route changes).  
**Phase 2I:** This route is **frozen** as a legacy aggregate; reconciliation **implementation** is **out of scope** until caller verification and product decisions. See `HOCKEY_ID_ANALYTICS_ROUTE_DISPOSITION_PLAN.md`.

**Focus:** `src/app/api/analytics/route.ts` (`GET /api/analytics`) and how its **legacy `Attendance`** usage relates to canonical **`TrainingAttendance`**.  
**Out of scope here:** implementing migration; detailed redesign of **`GET /api/attendance`** or legacy training HTTP routes (inventory only where they clarify coupling).

### Phase 2I — status

**Attendance cleanup stage (for this route): closed** for implementation until **runtime traffic** on **`GET /api/analytics`** is assessed. **Canonical** CRM analytics attendance charts use **`GET /api/analytics/attendance`**, not this root handler.

---

## Current route overview

| Item | Detail |
|------|--------|
| **File** | `src/app/api/analytics/route.ts` |
| **Auth** | `requirePermission(req, "analytics", "view")` |
| **Imports** | `@/lib/prisma`, `@/lib/api-rbac` only — **no** shared attendance helper; all attendance logic is **inline** in this file. |
| **Query params** | `teamId`, `playerId`, `season`, `ageGroup` — used for **player/team/coach** `where` filters and **season** filtering on **stats/teamHistory** only; **attendance rows are not filtered by season** (all loaded `Attendance` rows for included players). |
| **CRM UI coupling** | The dashboard **`src/app/(dashboard)/analytics/page.tsx`** loads **tab-specific** APIs: `/api/analytics/attendance`, `/api/analytics/players`, `/api/analytics/finance`, `/api/analytics/coaches`. **No in-repo `fetch` to `GET /api/analytics`** (root) was found by grep — this route may still be used by **external clients, scripts, or future UI**. |

---

## Legacy attendance reads

### 1. `players` query (lines 22–31)

```ts
attendances: { include: { training: true } },
```

- **Model path:** `Player.attendances` → **`Attendance`** → **`Training`** (legacy).
- **Usage in code:** Only **`a.status`** on each `Attendance` is read. The nested **`training`** object is **never referenced** in the file — it is loaded but **unused** for computation (possible dead include or historical intent).

### 2. `teams` query (lines 34–40)

```ts
players: { include: { skills: true, attendances: true } },
```

- **Full `Attendance`** rows (all scalar fields including **`comment`** possible on model) — but the route only reads **`a.status`** and **`.length`**.

### 3. `coaches` query (lines 43–52)

```ts
players: { include: { skills: true, attendances: true } },
```

- Same as team branch: **`status`** and **row count** only.

**Comment field:** Never read in this route; **no** analytics output depends on **`Attendance.comment`**.

---

## Attendance-derived metrics and outputs

| Metric / output | Where computed | Current legacy dependency | Canonical feasibility | Risk | Product decision needed | Notes |
|-----------------|----------------|-------------------------|------------------------|------|-------------------------|--------|
| **`attendanceSummary[]`** — per player: `present`, `absent`, `late`, `total`, `rate` | Lines 105–118; JSON **`attendanceSummary`** (line 282) | Counts rows where `status === "PRESENT"`, `"ABSENT"`, `"LATE"`; `rate = round(present/total*100)` | **Partial:** `present`/`absent`/`total`/`rate` from **`TrainingAttendance`** with **`present`/`absent`** + **`isAttendancePresentForScoring`-style rule** (uppercase **`PRESENT`** or canonical **`present`**). **`late`:** **not** in canonical storage — see 4-state section. | **High** if consumers expect **non-zero `late`** | **Yes** for **`late`** | **`EXCUSED`** rows are not counted in `present`/`absent`/`late` but **are** in **`total`** → the three status buckets can sum to **less than** **`total`**. |
| **`coachAnalytics[].attendanceRate`** | Lines 142–150 | `sum(PRESENT) / sum(all attendance rows)` across all players under coach teams | **Direct** (same formula on **`trainingAttendances`**) once **numerator/denominator** use canonical rows | **Medium** (numeric shift vs legacy-only data) | **No** if **`late`** is not required in this aggregate (only PRESENT-like counts) | Uses **legacy** `attendances` only. |
| **`teamAnalytics[].attendanceRate`** | Lines 184–189 | Same as coach roll-up, per team’s players | **Direct** on canonical rows | **Medium** | **No** (same as above) | — |
| **`coachAnalytics[].trainingsCount`** | Line 141: `c.teams.reduce((s, t) => s + t.trainings.length, 0)` | **`Team.trainings`** → legacy **`Training`** row count | **Not** attendance — **workload** metric; reproducing from **`TrainingSession`** is a **separate** query/rule (filter by coach/team, cancelled?, year?) | **High** if mixed with attendance “truth” in one dashboard narrative | **Yes** for “what counts as a training” | **Couples** coach block to **legacy Training** while attendance is **legacy Attendance**. |
| **`teamAnalytics[].trainingsCount`** | Line 203: `t.trainings.length` | Legacy **`Training`** count per team | Same as above | **High** | **Yes** | Canonical schedule uses **`TrainingSession`**. |
| **`coachWorkload`** (subset of coach data) | Lines 275–278 | **`trainingsCount`** only (legacy **`Training`**) | Replace with **session**-based count when product rules defined | **Medium** | **Yes** | Exposed as **`trainings`** in JSON. |
| **`players`** (minimal list in response) | Lines 266–271 | No attendance fields in this slice | N/A | Low | No | IDs/names only. |
| **Other keys** (`goalsBySeason`, `skillsByPlayer`, `paymentSummary`, etc.) | Various | Not attendance | N/A | — | No | Unchanged by attendance reconciliation. |

---

## 4-state dependency analysis

| Status | Used in `GET /api/analytics`? | Effect |
|--------|------------------------------|--------|
| **PRESENT** | Yes | Numerator for **`rate`** and for **`attendanceRate`** roll-ups. |
| **ABSENT** | Yes | **`attendanceSummary.absent`** count only. |
| **LATE** | Yes | **`attendanceSummary.late`** only. **Does not** increase **`present`** or **`rate`** (same as Phase 2F Bucket B rule: only **PRESENT** counts as present). |
| **EXCUSED** | Implicit | Not incremented in `present`/`absent`/`late` filters; still counted in **`total`**. |

**Canonical `TrainingAttendance`:** only **`present`** / **`absent`** (strings in DB, typically lowercase).

- **Migrating `present` / `absent` / `total` / `rate`:** **Small adapter** (normalize case; map to same counting rules as Bucket B).
- **`late` column:** **Cannot** be reproduced from canonical storage **without** a **product rule** (e.g. always `0`, merge into “adjusted present,” or drop field from API).
- **`excused`:** Not an output field today; **total** semantics change if canonical rows never represent “excused-only” legacy rows — **product** whether to show **slots without a row** vs **explicit absent**.

---

## Legacy training/workload coupling

| Location | What is read | Relationship to attendance |
|----------|--------------|----------------------------|
| **`teams` include `trainings: true`** | Legacy **`Training[]`** per team | **`trainingsCount`** in **team** and **coach** analytics. |
| **`coaches.teams.trainings`** | Same | **`coachAnalytics.trainingsCount`** and **`coachWorkload.trainings`**. |

**Attendance** is counted from **legacy `Attendance`** rows (one row per legacy training slot that was recorded). **Workload** is counted from **legacy `Training`** rows (scheduled legacy slots). These two **do not** necessarily match **`TrainingSession`** counts or **`TrainingAttendance`** coverage in a migrated world — **dual truth** until both dimensions use **`TrainingSession` + `TrainingAttendance`**.

---

## Reconciliation options

### Option A: Partial canonical migration

- Switch **player/team/coach `attendanceRate`** and **`attendanceSummary`** **present/absent/total/rate** to **`trainingAttendances`** with a **small status adapter**.
- Set **`late`** to **`0`** (or omit with version bump) **with documented behavior change**, or keep **`late`** only from legacy in a **deprecated** parallel field (not implemented in this audit).
- Leave **`trainingsCount` / `coachWorkload.trainings`** on **legacy `Training`** until a later **schedule** reconciliation.

**Pros:** Reduces attendance dual-truth vs Bucket B routes. **Cons:** **`late`** and workload still misleading or mixed.

### Option B: Full canonical migration with explicit product rules

- **Attendance:** all metrics from **`TrainingAttendance`**; define **`late`/`excused`** UI (hidden, zero, or derived elsewhere).
- **Workload:** **`trainingsCount`** from **`TrainingSession`** with agreed filters (e.g. not cancelled, date range, coach scope).

**Pros:** One school-truth story. **Cons:** Larger change set; needs **product + possibly migration** of historical display.

### Option C: Keep analytics legacy temporarily

- Document **`GET /api/analytics`** as **legacy read model**; CRM attendance tab already uses **`GET /api/analytics/attendance`** (canonical).

**Pros:** No surprise number changes on this route. **Cons:** **`GET /api/analytics`** remains inconsistent with Phase 2F routes if anything still consumes it.

---

## Final recommendation

1. **Confirm consumers** of **`GET /api/analytics`** (logs, API gateway, partners). If **unused**, migration risk is lower; if **used**, treat response as a **contract**.
2. **Short term:** Prefer **Option A** for **attendance-only slices** inside this route if the goal is alignment with **`TrainingAttendance`**, with an explicit **product call on `late`** (recommend **document `late: 0`** or remove in a versioned way).
3. **Medium term:** **Option B** for **`trainingsCount`** using **`TrainingSession`**, coordinated with schedule SSOT docs — **not** only an attendance swap.
4. Keep **CRM** in mind: primary **attendance tab** is already **`/api/analytics/attendance`** (canonical per prior audits); **`GET /api/analytics`** reconciliation may be **backend consistency** more than **default UI**.

---

## DONE / PARTIAL / NOT DONE

**DONE** — Code-based audit (2G), feasibility matrix, and **Phase 2I freeze** note (reconciliation work deferred; route guardrail in code). **NOT DONE** — implementation, schema changes, runtime log verification, or **`GET /api/analytics`** migration/deprecation.
