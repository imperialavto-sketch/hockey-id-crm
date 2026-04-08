# Training Journal Foundation — Phase 5B (Implementation)

## A. Goal

Introduce **session-scoped** CRM journal storage (`TrainingSessionCoachJournal`) alongside **unchanged** legacy `TrainingJournal`, add **read/write APIs** aligned with `trainings.edit`, and populate **`journal`** on **`GET /api/coaches/[id]/trainings`** from the new store. **No** heuristic backfill, **no** UI tab switch, **no** removal of legacy routes or models.

Source design: `docs/TRAINING_JOURNAL_MIGRATION_DESIGN_PHASE_5A.md` (Option 2a).

---

## B. Audit findings (pre-implementation)

| Area | Finding |
|------|---------|
| **Legacy `TrainingJournal` fields** | `id`, `trainingId`, `coachId`, `topic`, `goals`, `notes`, `teamComment`, `createdAt`, `updatedAt`; `@@unique([trainingId, coachId])`; FK `trainingId` → `Training.id`. |
| **Canonical coach trainings shape** | Top-level array of objects: `id`, `title`, `startTime`, `endTime`, `location`, `team`, `journal`, `_count.attendances`. Prior to 5B, `journal` was always `[]`. |
| **Legacy list shape** | Raw Prisma `Training` rows with embedded `journal[]` (filtered by `coachId`). |
| **Journal write permissions** | `POST /api/training-journal` and `PUT /api/training-journal/[id]` use `requirePermission(req, "trainings", "edit")`. |

---

## C. Data model added

| Item | Detail |
|------|--------|
| **Model name** | `TrainingSessionCoachJournal` |
| **Table** | `TrainingSessionCoachJournal` |
| **Fields** | `id` (cuid), `trainingSessionId`, `coachId`, `topic`, `goals`, `notes`, `teamComment`, `createdAt`, `updatedAt` |
| **Constraints** | `@@unique([trainingSessionId, coachId])`, `@@index([coachId])` |
| **Relations** | `trainingSession` → `TrainingSession` (cascade delete), `coach` → `Coach` (cascade delete) |
| **Inverse** | `TrainingSession.trainingSessionCoachJournals`, `Coach.trainingSessionCoachJournals` |

**Explicit non-goals:** No changes to `TrainingSessionReport`, `TrainingJournal`, or any bridge/backfill table.

---

## D. Routes / handlers changed

| Path | Change |
|------|--------|
| **`POST /api/training-session-journal`** | **New.** Upsert by `trainingSessionId` + `coachId`; validates session exists and `team.coachId === coachId`. RBAC: `trainings.edit`. |
| **`PUT /api/training-session-journal/[id]`** | **New.** Partial update by journal row id. RBAC: `trainings.edit`. |
| **`GET /api/coaches/[id]/trainings`** | Loads `TrainingSessionCoachJournal` for returned session ids and coach `id`; sets `journal` to **0 or 1** embed. |
| **`POST/PUT /api/training-journal*`** | **Unchanged** behavior; comments updated (LEGACY JOURNAL TRANSITIONAL). |
| **`GET /api/legacy/coaches/[id]/trainings`** | **Unchanged.** |

**Supporting code**

- `src/lib/api/sessionCoachJournalListShape.ts` — maps DB row → list embed shape (SESSION JOURNAL SSOT).
- `src/lib/crm/coachTrainingsBoundary.ts` — updated boundary description for Phase 5B.
- `src/lib/crm/coachLegacyTrainingsApi.ts` — comment update for canonical `journal`.

**Migration**

- `prisma/migrations/20260405120000_training_session_coach_journal/migration.sql`

---

## E. What remains legacy

- **`TrainingJournal`** model and all **`/api/training-journal`** routes.
- **CRM coach «Тренировки» tab** still consumes **`GET /api/legacy/coaches/[id]/trainings`** and **`POST /api/training-journal`** (not switched in 5B).
- **Legacy** journal data is **not** copied into `TrainingSessionCoachJournal`.

---

## F. Backfill status

**None.** NO AUTO-BACKFILL. Session journals appear only when created via `POST /api/training-session-journal` (or direct DB).

---

## G. Risks not resolved

- **Two stores** until tab migration: coaches may edit legacy journal on one list and see empty session journal on canonical list (or vice versa) for the “same” calendar event if no product-level linking exists.
- **`POST /api/training-session-journal`** accepts `coachId` in the body; trust model matches legacy journal (global `trainings.edit` + server check that the session’s **team** is owned by that coach).
- **Canonical `journal` embed** returns only `{ id, topic, goals, notes, teamComment }`, not full Prisma extras (`createdAt`, etc.); callers that assumed an empty array only now may receive one object per session.

---

## H. Recommended next phase (5C+)

1. **CRM tab:** Feature-flag or cutover to `coachCanonicalTrainingSessionsListUrl` + wire journal modal to `training-session-journal` APIs (use `TrainingSession.id`).
2. **Read path UX:** Clarify legacy vs session journal in UI during transition (read-only legacy block or single SSOT choice).
3. **Optional:** Admin backfill or mapping strategy (explicit product decision; not heuristic in code without spec).
4. **Deprecation timeline** for `POST /api/training-journal` after adoption metrics.

---

## Canonical GET response delta (exact)

**Unchanged fields:** `id`, `title`, `startTime`, `endTime`, `location`, `team`, `_count.attendances` — same structure and types as before.

**`journal` (only field whose semantics changed):**

| Before 5B | After 5B |
|-----------|----------|
| Always `[]` | `[]` if no `TrainingSessionCoachJournal` for `(session.id, coachId from URL)`. |
| — | Otherwise `[{ id, topic, goals, notes, teamComment }]` (single element max). |

No new top-level keys; array element shape matches the subset the CRM coach page already types for legacy `journal[0]`.
