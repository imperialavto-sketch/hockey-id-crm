# Training Journal Cutover — Phase 5C (CRM Coach Trainings Tab)

## A. Goal

Move the CRM coach **«Тренировки»** tab from **legacy** `Training` + `TrainingJournal` + `GET /api/legacy/coaches/[id]/trainings` + `POST /api/training-journal` to **canonical** `TrainingSession` + `TrainingSessionCoachJournal` + `GET /api/coaches/[id]/trainings` + `POST`/`PUT` `/api/training-session-journal*`, without deleting legacy APIs/models and **without** backfill.

Foundation reference: `docs/TRAINING_JOURNAL_FOUNDATION_PHASE_5B.md`.

---

## B. Audit findings

| Topic | Legacy tab behavior | Canonical (pre-cutover page) gap | Resolution |
|-------|---------------------|----------------------------------|------------|
| **List fetch** | `coachLegacyTrainingsListUrl` → Prisma `Training` rows | Tab was not using canonical URL | Switched to `coachCanonicalTrainingSessionsListUrl` + `parseCoachCanonicalTrainingsTabResponse`. |
| **Row `id`** | Legacy `Training.id` | Must be `TrainingSession.id` for journal API | Canonical response already uses session id. |
| **`title`** | Stored `Training.title` | API uses `toSessionTitle(type, subType)` | **Display change:** titles are derived from session type/subtype, not legacy free-text titles. |
| **Times / location / team** | `startTime`, `endTime`, `location`, `team` | Same keys on canonical GET | No adapter beyond null-safe `team?.name`. |
| **`journal[]`** | `TrainingJournal` embed | Canonical GET already returns 0–1 embed | Same modal fields (`topic`, `goals`, `notes`, `teamComment`). |
| **`_count.attendances`** | Legacy attendance count | Canonical uses `TrainingAttendance` count | Surfaced in new **«Посещ.»** column (tab-only). |
| **Save** | Always `POST /api/training-journal` | N/A | **POST** when no `journal[0].id`; **PUT** `/api/training-session-journal/[id]` when editing existing row. |
| **Profile header count** | `Team._count.trainings` (legacy `Training` rows) | Unchanged | **Not** switched to session count — avoids changing non-tab semantics (Phase 4A comment remains). |

---

## C. Files changed

| File | Role |
|------|------|
| `src/app/(dashboard)/coaches/[id]/page.tsx` | Canonical fetch, session-journal save (POST/PUT), refresh, trainings table + «Посещ.» column, markers. |
| `src/lib/crm/coachTrainingsTabCanonical.ts` | **New** — `CoachTrainingsTabRow` type + `parseCoachCanonicalTrainingsTabResponse`. |
| `src/lib/crm/coachTrainingsBoundary.ts` | Docs: tab = canonical SSOT; legacy list not wired to tab. |
| `src/lib/crm/coachLegacyTrainingsApi.ts` | Header comments: tab vs legacy URL usage. |
| `src/app/api/coaches/[id]/trainings/route.ts` | Comment: CRM tab uses this route; legacy remains for other tooling. |
| `docs/TRAINING_JOURNAL_CUTOVER_PHASE_5C.md` | This document. |

---

## D. Exact cutover completed

- **Read path:** `GET /api/coaches/[id]/trainings` only for the trainings tab list (with `credentials: "include"`).
- **Create journal:** `POST /api/training-session-journal` with `trainingSessionId`, `coachId`, form fields.
- **Update journal:** `PUT /api/training-session-journal/[id]` when `journal[0]?.id` is present at modal open.
- **Refresh after save:** same canonical GET + parser.
- **Fully switched:** the CRM coach trainings tab **no longer** calls `coachLegacyTrainingsListUrl`, `/api/training-journal`, or legacy list for this UI.

---

## E. Remaining legacy usage

- **`TrainingJournal` model**, **`GET /api/legacy/coaches/[id]/trainings`**, **`POST`/`PUT` `/api/training-journal*`** — **unchanged**, available for scripts, e2e, or future tooling.
- **`coachLegacyTrainingsListUrl`** — still exported; **not** imported by the coach detail page.
- **Coach profile stat** «N тренировок» — still sums **`Team._count.trainings`** (legacy `Training` count), not `TrainingSession` count.
- **`prisma/seed.ts`** (if it upserts `TrainingJournal`) — unchanged; session journals are not auto-seeded in this phase.

---

## F. Risks not resolved

- **Legacy journal text** is **not** visible on this tab; users see only **`TrainingSessionCoachJournal`** until a product backfill or dual-read is implemented.
- **Title semantics** differ from legacy list (computed vs stored title).
- **Session-only schedule:** orgs with legacy `Training` rows but **no** `TrainingSession` rows show an **empty** tab.
- **Header training count** can **diverge** from the number of rows in the tab (legacy vs session SSOT).

---

## G. Recommended next phase

1. **Product decision:** optional backfill or read-only «История (legacy)» block — explicit spec, no heuristic in code without approval.
2. **Align header metric** with `TrainingSession` count (or label both sources) once stakeholders agree.
3. **Sunset plan** for `POST /api/training-journal` after telemetry shows no consumers.
4. **Seed / demo data:** optional `TrainingSessionCoachJournal` seed rows for parity with legacy demos.
