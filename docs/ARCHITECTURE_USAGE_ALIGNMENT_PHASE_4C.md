# Architecture Usage Alignment — Phase 4C (Coach Trainings Boundary + Journal Blocker + Nearby Read RBAC)

**Prerequisite:** `docs/ARCHITECTURE_USAGE_ALIGNMENT_PHASE_4B.md`  
**Constraints:** No schema migration; no journal model rewrite; **coach trainings tab read path unchanged** (still legacy list).

---

## A. Goal

1. Map **exactly** what blocks the coach «Тренировки» tab from using **`TrainingSession`** data.  
2. Reduce **ambiguity** between **legacy tab URL** and **canonical** `GET /api/coaches/[id]/trainings`.  
3. Tight **RBAC** pass on **adjacent** coach/legacy list + **journal** writes.

---

## B. Audit findings

### B.1 Tab data needs

| Need | Legacy list | Canonical route |
|------|-------------|-----------------|
| Row `id` for journal POST | `Training.id` | `TrainingSession.id` (**wrong** for journal FK) |
| Title, times, location, team | Yes | Yes |
| `journal[]` for coach | Loaded via Prisma include | **Always `[]`** in mapper |
| Attendance count | `_count.attendances` (legacy) | `_count` from `trainingAttendances` |

### B.2 Journal dependency

- **`POST /api/training-journal`** body: `trainingId`, `coachId`, …  
- **Prisma:** `TrainingJournal.trainingId` → **`Training.id`** with `@@unique([trainingId, coachId])`.  
- **No** FK to `TrainingSession` — **migration impossible** without schema or parallel journal store.

### B.3 Safe bridge without schema

- **None** that preserves FK integrity: Prisma requires `trainingId` to reference an existing **`Training`** row.  
- **Possible product directions (out of scope):** optional `trainingSessionId` column + backfill; separate `SessionTrainingJournal` model; or drop FK and enforce in app (schema change).

### B.4 Splittability

- **Partially possible in UX:** second read-only block from canonical API **plus** existing legacy tab — **not implemented** (would duplicate or confuse without design).  
- **Tab migration:** **impossible** until journal keys **`TrainingSession`** or mapping exists.

### B.5 Nearby routes — guards added this phase

| Route | Before | After |
|-------|--------|-------|
| `GET /api/legacy/coaches/[id]/trainings` | Open | `requirePermission` `coaches` `view` |
| `POST /api/training-journal` | Open | `requirePermission` `trainings` `edit` |
| `PUT /api/training-journal/[id]` | Open | `requirePermission` `trainings` `edit` |

`GET /api/players` already guarded (coach page uses it).

---

## C. Files changed

- `src/lib/crm/coachTrainingsBoundary.ts` — **new** boundary + blocker doc  
- `src/lib/crm/coachLegacyTrainingsApi.ts` — Phase 4C dual-URL note  
- `src/app/api/legacy/coaches/[id]/trainings/route.ts` — RBAC + comment  
- `src/app/api/coaches/[id]/trainings/route.ts` — comment on empty `journal`  
- `src/app/api/training-journal/route.ts` — RBAC POST + FK comment  
- `src/app/api/training-journal/[id]/route.ts` — RBAC PUT  
- `src/app/(dashboard)/coaches/[id]/page.tsx` — trainings tab comment  
- `src/features/schedule/scheduleDetailTrainingFetch.ts` — Phase 4C cross-reference  
- `docs/ARCHITECTURE_USAGE_ALIGNMENT_PHASE_4C.md` — this file  

---

## D. Exact clarifications / hardening completed

1. **`coachTrainingsBoundary.ts`** — single place for tab vs canonical vs journal FK statement.  
2. **Legacy coach trainings GET** — same **`coaches` `view`** as canonical coach session list.  
3. **Journal POST/PUT** — **`trainings` `edit`** (schedule module; COACH has edit).  
4. **Comments** on canonical route (empty journal), coach page tab, schedule fetch file.

---

## E. Journal blocker map

| Layer | Artifact | Depends on |
|-------|----------|------------|
| DB | `TrainingJournal.trainingId` | `Training.id` (FK) |
| API | `POST /api/training-journal` | Body `trainingId` must exist on `Training` |
| CRM UI | Coach tab `openJournal` / `saveJournal` | `training.id` from **legacy** list response |
| Canonical API | `GET /api/coaches/[id]/trainings` | Returns `journal: []` — **cannot** drive current journal modal without schema |

---

## F. Remaining parallel paths

- Coach tab: **legacy** list + journal.  
- Canonical: **`GET /api/coaches/[id]/trainings`** unused by tab.  
- Other **`/api/legacy/*`** routes outside this sub-tree **not** hardened in 4C.

---

## G. Risks not resolved

- Roles without **`trainings.edit`** lose **journal save** (403) — aligns with schedule permissions; verify product intent for **SCHOOL_MANAGER** etc. (matrix already defines `trainings` per role).  
- **`POST /api/ratings`** from coach page — if unguarded elsewhere, **not** in 4C scope.

---

## H. Recommended next phase (4D)

1. Schema: add **`trainingSessionId`** (nullable) on `TrainingJournal` or new model; migrate writes; then switch tab to canonical list with optional legacy column for unmigrated rows.  
2. Or: **read-only** «Расписание (слоты)» section using canonical API on coach page.  
3. Audit **`POST /api/ratings`** and other coach-page mutating routes for RBAC parity.
