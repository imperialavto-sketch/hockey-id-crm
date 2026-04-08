# Architecture Usage Alignment — Phase 4A (Dangerous Parallel Read Path Reduction)

**Prerequisite:** `docs/ARCHITECTURE_USAGE_ALIGNMENT_PHASE_3.md`  
**Constraints respected:** No Prisma schema changes, no route/page/model deletions, no intentional public API contract changes.

---

## A. Goal of this pass

Reduce **ambiguous mixed reads** in scoped CRM surfaces by:

- Making **canonical vs legacy** explicit in code (helpers + comments).
- Isolating **legacy-only** and **transition bridge** paths behind named modules.
- Mapping **dashboard summary** metrics to their true data domains without changing response JSON shape.

---

## B. Audit findings by area

### B.1 Coach CRM page (`coaches/[id]/page.tsx`)

| Aspect | Finding |
|--------|---------|
| **Canonical (sessions)** | Not used for the «Тренировки» tab; would be `/api/coach/trainings` or team week APIs — **not switched** (journal still on legacy `Training.id`). |
| **Legacy / transitional** | Tab list + refresh: `GET /api/legacy/coaches/[id]/trainings`. Journal POST: `/api/training-journal` with `trainingId` = legacy id. |
| **Mixed read** | Header **«N тренировок»** uses `Team._count.trainings` → Prisma relation **`Training`**, same legacy world as the tab — **aligned with each other** but **not** `TrainingSession` counts. |
| **Implicit** | Easy to misread header as canonical session volume — **was implicit**; now documented in code. |

### B.2 Schedule detail (`ScheduleDetailPage.tsx`)

| Aspect | Finding |
|--------|---------|
| **Canonical** | `GET /api/trainings/[id]` first; for `source === "target"`, roster from `GET /api/trainings/[id]/attendance`. Report/evaluations only when `detailSource === "target"`. |
| **Legacy fallback** | Only when `readMode === "compat"` **and** session returns **404**: `GET /api/legacy/trainings/[id]` (`trainings/[id]/page.tsx`). **`schedule/[id]` (target)** does **not** fall back to legacy. |
| **Mixed** | Initial JSON may include `attendances` then **overwritten** for session path by attendance API — behavior unchanged; sequencing now in a dedicated helper file. |

### B.3 Dashboard metrics

| Field / API | Source model | Issue |
|-------------|--------------|--------|
| `trainingsThisMonth` (`/api/dashboard/summary`) | `TrainingSession` in current calendar month | **Canonical**, scoped. |
| `avgAttendance` (same response) | **All** `TrainingAttendance` rows ever | **Not** scoped to month; **misleading** vs «slots / мес.» neighbor stat. |
| `/api/dashboard/upcoming-trainings` | `TrainingSession` | **Canonical**, consistent. |
| `/api/dashboard/recent-activity` | `ActivityLog` | Separate domain; no mix with training tables in one query. |

### B.4 RBAC (this scope only)

| Location | Observation |
|----------|-------------|
| **Dashboard** | Client: `usePermissions` (`canView`, `canCreate`). API: `requirePermission(..., "dashboard", "view")` on summary / upcoming / activity. |
| **Schedule detail** | Client: `usePermissions` → `canEdit("schedule")` for writes. API routes for trainings/legacy trainings enforce server-side rules separately. |
| **Coach detail page** | Client: only authenticated CRM layout (`canViewModule` by path). **`GET /api/coaches/[id]` has no `requirePermission` in handler** — access relies on CRM shell + cookie; **API-level enforcement gap** if route is called outside intended UI (UNCERTAIN: global API middleware). |
| **Coach legacy trainings API** | Legacy routes should keep their own guards (unchanged this pass). |

---

## C. Exact files changed

| File | Change |
|------|--------|
| `src/lib/crm/coachLegacyTrainingsApi.ts` | **New** — `coachLegacyTrainingsListUrl`, Phase 4A markers. |
| `src/features/schedule/scheduleDetailTrainingFetch.ts` | **New** — `fetchScheduleTrainingDetailResource`, `fetchSessionAttendanceRosterPayload`, types. |
| `src/features/schedule/ScheduleDetailPage.tsx` | Uses helpers; Phase 4A header comment; typed payload from fetch helper. |
| `src/app/(dashboard)/coaches/[id]/page.tsx` | Uses `coachLegacyTrainingsListUrl`; documents legacy `_count.trainings`. |
| `src/app/api/dashboard/summary/route.ts` | Named helpers `countTrainingSessionsThisMonth`, `computeAvgAttendancePercentAllHistoricalSlots` (same math as before). |
| `src/app/(dashboard)/dashboard/page.tsx` | Comment block mapping the three dashboard data sources. |
| `docs/ARCHITECTURE_USAGE_ALIGNMENT_PHASE_4A.md` | **This document.** |

---

## D. What was made safer

1. **Coach page:** Single URL builder for legacy list + explicit comment that header count is **legacy `Training`**, not `TrainingSession`.
2. **Schedule detail:** Fetch sequencing (**session → legacy only in compat+404**) isolated in **`scheduleDetailTrainingFetch.ts`** with ALIGNED / LEGACY markers.
3. **Dashboard summary:** Month session count and global attendance % are **named functions** with comments — same JSON, clearer maintenance story.
4. **Dashboard UI file:** Developer-facing map of which endpoint feeds which semantic (no user-visible copy change).

---

## E. What still remains parallel

- Coach **tab** still **100% legacy** `Training` + journal (by design this phase).
- **Schedule detail** still supports **legacy body** when opened from **`/trainings/[id]`** with compat mode.
- **`avgAttendance`** still **all-time** over all attendance rows — **not** aligned to month (would be contract/behavior decision).
- **`GET /api/coaches/[id]`** still without **`requirePermission`** in file.

---

## F. Risks not resolved

- **API RBAC gap** on `GET /api/coaches/[id]` (and possibly other CRM GETs) — needs product/security pass.
- **Attendance metric** semantics vs label «Посещаемость» — still ambiguous for end users.
- **No migration** of coach trainings list to `TrainingSession` (journal coupling).

---

## G. Recommended Phase 4B

1. Add **`requirePermission`** (or shared CRM guard) to **`GET /api/coaches/[id]`** and audit sibling **unauthenticated GET** CRM routes.
2. Either **scope** `avgAttendance` to the current month (and document) or **rename** / add footnote in UI copy (contract + UX decision).
3. **Journal** model: plan bridge from `TrainingSession` or dual-write — then switch coach tab to session list.
4. Consider **deprecating `/trainings/[id]`** CRM entry in favor of **`/schedule/[id]`** only, with explicit migration path for old links.
