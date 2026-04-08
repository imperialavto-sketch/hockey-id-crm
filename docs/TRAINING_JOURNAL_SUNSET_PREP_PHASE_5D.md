# Training Journal — Post-Cutover Legacy Audit & Sunset Prep (Phase 5D)

## A. Goal

After Phase 5C CRM tab cutover, **inventory** remaining legacy journal touchpoints, **document** reconciliation gaps (header vs tab), and **prepare** for a future sunset of `TrainingJournal` + legacy routes **without** deleting them, **without** backfill, and **without** schema changes in this phase.

Source: `docs/TRAINING_JOURNAL_CUTOVER_PHASE_5C.md`.

---

## B. Legacy usage audit

### B.1 `coachLegacyTrainingsListUrl` (`src/lib/crm/coachLegacyTrainingsApi.ts`)

| Finding | Detail |
|---------|--------|
| **Definition** | Builds `GET /api/legacy/coaches/[id]/trainings`. |
| **In-repo importers** | **None** in `src/` (no `import` of this helper after Phase 5C). |
| **Callers** | **Comment-only** reference in `coachTrainingsTabCanonical.ts`. |
| **Status** | **Export retained** for discoverability / future scripts; **not** wired to product UI. |

### B.2 `GET /api/legacy/coaches/[id]/trainings`

| Consumer | Role |
|----------|------|
| **`scripts/crm-e2e-sanity.ts`** | Sanity check: fetches array response (no journal-specific assertions in snippet reviewed). |
| **Product UI** | **None** in `src/app` after Phase 5C. |
| **coach-app / parent-app** | **No** matches for this path. |

### B.3 `POST /api/training-journal` and `PUT /api/training-journal/[id]`

| Consumer | Role |
|----------|------|
| **CRM React pages** | **None** — `grep` shows **no** `fetch(.../training-journal` outside `src/app/api/training-journal/*`. |
| **Prisma writes** | Only these two route handlers + **`prisma/seed.ts`** + **`scripts/seed-full.js`**. |
| **External / manual** | **Unknown** — routes remain **open** to any authenticated client with `trainings.edit` (same RBAC as before). |

### B.4 `TrainingJournal` reads/writes (coach / CRM)

| Location | Access |
|----------|--------|
| **API** | Legacy list **includes** `journal` embed via Prisma `include`. |
| **training-journal routes** | Direct `prisma.trainingJournal.upsert` / `update`. |
| **Seed scripts** | `upsert` demo rows attached to legacy `Training`. |
| **CRM UI** | **No** remaining read/write of `TrainingJournal` in coach flows. |

### B.5 Active vs archive characterization

| Layer | Legacy journal still “active”? |
|-------|--------------------------------|
| **CRM UI** | **No** — tab uses session journal only. |
| **HTTP API** | **Yes (write path)** — POST/PUT still mutate `TrainingJournal` if called. |
| **HTTP API (read via list)** | **Yes** — legacy coach trainings GET still returns embedded journals for API consumers. |
| **Data** | **Archive + latent writes** — historical rows remain; new legacy writes possible via API or seed. |

**Conclusion:** Legacy journal is **not** archive-only in the strict sense: **API writes are still live**. It is **inactive for shipped CRM UI** documented in this repo.

---

## C. Reconciliation findings

### C.1 Coach profile header — «N тренировок»

- **Source:** `coach.teams` aggregate `Team._count.trainings` → counts Prisma **`Training`** rows per team, summed across teams.
- **Trainings tab:** Lists **`TrainingSession`** rows for teams where `team.coachId` matches (canonical GET).
- **Mismatch types:**  
  - Count **can exceed** tab rows if legacy `Training` exists **without** corresponding `TrainingSession`.  
  - Count **can be below** tab rows if sessions exist **without** legacy `Training` rows.  
  - **Titles** on tab are session-derived (type/subtype), not legacy `Training.title`.

### C.2 Visibility / data-loss (product)

- **Legacy `TrainingJournal` text** is **not shown** on the CRM trainings tab after Phase 5C.
- **No automatic migration** — users see session journal only; old legacy journal entries remain in DB but **out of primary CRM UX**.

---

## D. What still blocks sunset

1. **Live HTTP endpoints** — `POST`/`PUT` `/api/training-journal*` and `GET` legacy coach trainings still **function**; sunset requires deprecation policy (e.g. `410`, logging, docs) and **confirmation no external integrations** rely on them.
2. **Seed / `seed-full.js`** — still **write** `TrainingJournal`; must be updated or dropped before model removal.
3. **E2E** — `crm-e2e-sanity.ts` still calls legacy coach trainings GET; test plan must move to canonical or explicitly mark legacy as deprecated test.
4. **`coachLegacyTrainingsListUrl`** — unused helper; safe to remove later with grep verification (non-blocking).
5. **Schema / FK** — `TrainingJournal` attached to `Training`; removing model needs migration and **explicit** data retention/export decision.
6. **No telemetry in this audit** — production callers outside repo are **unknown**.

**Sunset readiness:** **Not** claimed — **API write path is still active** and **non-UI consumers** (e2e + unknown clients) remain.

---

## E. Recommended next implementation phase

1. **Instrumentation / docs:** Request logging or analytics on `POST`/`PUT` `/api/training-journal` to detect real traffic (if allowed).
2. **E2E:** Switch primary assertion to canonical `GET /api/coaches/[id]/trainings`; keep legacy GET as optional deprecated check or remove after quiet period.
3. **Deprecation RFC:** Response header `Deprecation` + changelog; optional read-only mode for legacy journal POST (feature flag).
4. **Product:** Decide export UI or “История (legacy)” read-only surface **or** approved backfill into `TrainingSessionCoachJournal` (out of scope for 5D).
5. **Header metric:** Align label or computation with `TrainingSession` once stakeholders approve (separate small PR).

---

## F. Risks not resolved

- **Silent legacy writes** via API while CRM shows only session journal → **divergent** truths until sunset.
- **Stale architecture docs** (Phase 3/4A/4B/Phase 2 audit) still mention coach page + legacy journal — **reader confusion** until docs are refreshed in a doc-only pass.
- **External clients** not inventoried in-repo.
