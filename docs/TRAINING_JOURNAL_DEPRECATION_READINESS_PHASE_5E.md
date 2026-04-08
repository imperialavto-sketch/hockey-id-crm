# Training Journal — Deprecation Readiness & Non-UI Cleanup (Phase 5E)

## A. Goal

After Phase 5D, reduce **in-repo** reliance on the legacy coach-detail trainings list and align **demo seeds** with **session journal SSOT**, while **keeping** legacy `TrainingJournal` routes and model. Document what still blocks removal and **do not** claim sunset readiness while seeds or HTTP legacy writes remain.

Prerequisite: `docs/TRAINING_JOURNAL_SUNSET_PREP_PHASE_5D.md`.

---

## B. Audit findings

### B.1 Seeds (before changes)

| File | Legacy journal | `TrainingSession` / session journal |
|------|----------------|-------------------------------------|
| **`prisma/seed.ts`** | `trainingJournal.upsert` per demo `Training` row (4 rows). | `TrainingSession` upserts (`demo-*` ids); **no** `TrainingSessionCoachJournal` before 5E. |
| **`scripts/seed-full.js`** | `trainingJournal.upsert` for up to 3 `Training` rows (mozyakin). | **No** `TrainingSession` creation in this script. |

### B.2 Scripts / E2E (before changes)

| Check | Path |
|-------|------|
| Coach detail trainings | **Both** canonical `GET /api/coaches/[id]/trainings` and `GET /api/legacy/coaches/[id]/trainings` asserted array responses. |
| Other legacy | `GET /api/legacy/coach/trainings`, player legacy trainings, legacy training CRUD — **unchanged** in 5E (out of narrow scope). |

### B.3 Safe moves in 5E

- **Additive** `TrainingSessionCoachJournal` in `prisma/seed.ts` for fixed id `demo-mark-past-1` — FK exists, idempotent upsert, **no** removal of legacy journal.
- **E2E:** Drop legacy coach-detail list check; canonical check already covers CRM SSOT list + RBAC surface.
- **seed-full.js:** **Cannot** add session journal without adding `TrainingSession` rows — **document only**; keep legacy journal writes.

### B.4 Header metric (`coach` profile)

- **Decision (5E):** **Deferred** — no change to visible copy or computation. Tooltip (Phase 5D) + code comment now point here for explicit deferral.

---

## C. Files changed

- `prisma/seed.ts`
- `scripts/seed-full.js`
- `scripts/crm-e2e-sanity.ts`
- `src/app/api/legacy/coaches/[id]/trainings/route.ts`
- `src/app/api/training-journal/route.ts`
- `src/app/api/training-journal/[id]/route.ts`
- `src/lib/crm/coachLegacyTrainingsApi.ts`
- `src/lib/crm/coachTrainingsBoundary.ts`
- `src/app/(dashboard)/coaches/[id]/page.tsx` (comment)
- `docs/TRAINING_JOURNAL_DEPRECATION_READINESS_PHASE_5E.md` (this file)

---

## D. What dependencies were cleaned up

| Item | Change |
|------|--------|
| **`scripts/crm-e2e-sanity.ts`** | Removed **mandatory** `GET /api/legacy/coaches/[id]/trainings` check; canonical coach-detail trainings check renamed for clarity. |
| **`coachLegacyTrainingsListUrl`** | Documented as **deprecated-ready** (no `src/` importers; e2e no longer uses URL). |
| **Legacy coach-detail route** | Comments: **in-repo** gate removed; external traffic unknown. |
| **`prisma/seed.ts`** | **Added** `trainingSessionCoachJournal` upsert for `demo-mark-past-1` (CRM demo shows journal on tab after seed). **Kept** all legacy `Training` + `TrainingJournal` writes. |
| **`scripts/seed-full.js`** | **Comment** explaining legacy-only journal (no sessions in script). |

---

## E. What still blocks legacy removal

1. **`TrainingJournal` model** + **`POST`/`PUT` `/api/training-journal*`** — still valid HTTP API; unknown clients.
2. **`prisma/seed.ts`** — still **creates** legacy `TrainingJournal` rows (intentional dual demo).
3. **`scripts/seed-full.js`** — still **writes** `TrainingJournal`.
4. **`GET /api/legacy/coaches/[id]/trainings`** — still implemented; only **automated gate** removed from e2e.
5. **Other e2e legacy checks** — `legacy/coach/trainings`, legacy player trainings, legacy training PATCH/DELETE — still present.
6. **Schema/FK** — removing model requires migration and retention policy.

**Sunset-ready:** **No** — legacy journal is still **actively seeded** and **writable** via API.

---

## F. Risks not resolved

- **Dual demo truth:** After seed, legacy journal text on old `Training` rows and session journal on `demo-mark-past-1` are **similar** but **not** the same DB row; different sessions have no session journal until added.
- **seed-full** environments show **no** session journal for CRM tab unless `prisma/seed.ts` or manual data is used.
- **External callers** of legacy coach-detail list or training-journal API remain **unknown**.

---

## G. Recommended next phase

1. **Logging/metrics** on `GET /api/legacy/coaches/[id]/trainings` and `POST /api/training-journal` to confirm zero/low traffic.
2. **Optional:** Add `TrainingSession` + one `TrainingSessionCoachJournal` to `seed-full.js` if that script should mirror CRM demo (larger change — product decision).
3. **Deprecation headers** (`Deprecation`, `Link` alternate) on legacy routes when policy allows.
4. **Header metric:** Product-approved switch to session count or dual labels (separate PR).
5. **Remove** `coachLegacyTrainingsListUrl` export when route is deleted and grep is clean.

---

## Explicit state summary

| Source | Uses legacy `TrainingJournal` write? | Uses `TrainingSessionCoachJournal` write? |
|--------|--------------------------------------|-------------------------------------------|
| **`prisma/seed.ts`** | **Yes** (per legacy `Training`) | **Yes** (`demo-mark-past-1`) |
| **`scripts/seed-full.js`** | **Yes** | **No** |
| **`crm-e2e-sanity.ts`** | Indirect (other legacy endpoints) | **No** direct journal API call; canonical list is asserted |
| **CRM UI** | **No** | **Yes** (via session-journal HTTP) |

**In-repo sunset:** **Not** achieved — legacy seeds and legacy HTTP remain.
