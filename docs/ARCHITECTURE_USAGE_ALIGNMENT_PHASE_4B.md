# Architecture Usage Alignment — Phase 4B (RBAC Hardening + Legacy Dependency Reduction)

**Prerequisite:** `docs/ARCHITECTURE_USAGE_ALIGNMENT_PHASE_4A.md`  
**Constraints:** No Prisma schema changes; no route/page/model deletions; no new JSON fields on dashboard summary; metric **values** unchanged.

---

## A. Goal

1. Close obvious **RBAC gaps** on coach-scoped CRM read/write APIs.  
2. **Document and surface** canonical vs legacy coach training data without migrating journal.  
3. Make **dashboard attendance** semantics explicit in copy + route comments (numbers unchanged).  
4. **Harden compat boundary** documentation and CRM `fetch` credentials for cookie-auth APIs.

---

## B. Audit findings

### B.1 Read routes lacking permission guards (before 4B)

| Route | Issue |
|-------|--------|
| `GET /api/coaches/[id]` | No `requirePermission` |
| `GET /api/coaches/[id]/ratings` | No guard |
| `GET /api/coaches/[id]/trainings` | No guard (canonical `TrainingSession` list) |
| `PUT` / `DELETE` `/api/coaches/[id]` | No guard |

### B.2 Coach page vs canonical list

- **Tab + journal:** still **`GET /api/legacy/coaches/[id]/trainings`** — **blocked** from switching to `GET /api/coaches/[id]/trainings` because **`POST /api/training-journal`** expects **`trainingId` = legacy `Training.id`**.  
- **Canonical helper:** `coachCanonicalTrainingSessionsListUrl` added for future wiring; **read path for tab not migrated**.

### B.3 Dashboard summary semantics

- **No contract break:** same keys and formulas.  
- **Clarity:** `statsHint` extended to state month scope for schedule slots vs all-time attendance share.

### B.4 Compat fallback

- Already **narrow:** legacy fetch only for `readMode === "compat"` and session **404**.  
- **4B:** explicit comment that compat is only for `trainings/[id]/page.tsx`; **`CRM_FETCH_INIT`** with `credentials: "include"` on detail fetches.

---

## C. Files changed

| File | Change |
|------|--------|
| `src/app/api/coaches/[id]/route.ts` | `requirePermission` GET view, PUT edit, DELETE delete |
| `src/app/api/coaches/[id]/ratings/route.ts` | `requirePermission` GET view |
| `src/app/api/coaches/[id]/trainings/route.ts` | `requirePermission` GET view |
| `src/lib/crm/coachLegacyTrainingsApi.ts` | `coachCanonicalTrainingSessionsListUrl` + Phase 4B notes |
| `src/app/(dashboard)/coaches/[id]/page.tsx` | `credentials: "include"`, Phase 4B journal blocker comment |
| `src/app/(dashboard)/coaches/[id]/edit/page.tsx` | `credentials: "include"` on coach/teams fetch and PUT |
| `src/app/api/dashboard/summary/route.ts` | File-level Phase 4B semantic doc comment |
| `src/lib/crmDashboardCopy.ts` | `statsHint` clarifies attendance vs month slots |
| `src/features/schedule/scheduleDetailTrainingFetch.ts` | Compat boundary JSDoc + `credentials: "include"` |
| `src/features/schedule/ScheduleDetailPage.tsx` | `credentials: "include"` on players + coach ratings fetches |
| `docs/ARCHITECTURE_USAGE_ALIGNMENT_PHASE_4B.md` | This document |

---

## D. Exact hardening / reduction completed

1. **RBAC:** Coach detail, ratings, and canonical session list **GET** require **`coaches` `view`**; **PUT** requires **`coaches` `edit`**; **DELETE** requires **`coaches` `delete`**.  
2. **Coach CRM client:** fetches use **`credentials: "include"`** so session cookies are sent consistently with protected APIs.  
3. **Canonical URL helper:** exported for SSOT list; legacy tab documented as journal-blocked.  
4. **Dashboard:** hint text explains scope; API file comment cross-links.  
5. **Schedule detail fetch:** explicit compat mount point + cookie credentials on training/legacy/attendance fetches.

---

## E. Remaining legacy blockers

- **`TrainingJournal.trainingId` → legacy `Training.id`** — coach tab cannot move to session list without journal migration or dual-key.  
- **`Team._count.trainings`** on coach profile — still legacy `Training` count (4A/4B documented, not replaced).

---

## F. Risks not resolved

- **Role `COACH`** has **`coaches.edit: false`** in `rbac.ts` — **PUT `/api/coaches/[id]` now returns 403** for that role. If the edit UI was reachable for COACH before, save will fail until RBAC or UI is aligned.  
- Other **unguarded CRM GET** routes outside this scope not audited here.  
- **`avgAttendance`** still all-time; only **copy** clarified, not formula.

---

## G. Recommended next phase (4C)

1. Align **coach edit** visibility with **`coaches.edit`** or grant narrow self-edit exception.  
2. Migrate **training journal** to **`TrainingSession.id`** (or join table) then switch coach tab to **`coachCanonicalTrainingSessionsListUrl`**.  
3. Optional: scope **`avgAttendance`** to current month in API + copy (explicit **contract** change).  
4. Sweep remaining **`/api/**`** GET handlers for `requirePermission` parity with list routes.
