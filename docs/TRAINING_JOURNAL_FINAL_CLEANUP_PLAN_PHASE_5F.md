# Training Journal — Final In-Repo Legacy Dependency Cleanup Plan (Phase 5F)

## A. Goal

Inventory **all in-repo** touchpoints for the **legacy journal contour** (`TrainingJournal`, `/api/training-journal*`, `GET /api/legacy/coaches/[id]/trainings`, `coachLegacyTrainingsListUrl`), classify them for deprecation, define **sunset preconditions**, and apply **only** low-risk clarifications (comments/markers) — **without** deleting routes/models, **without** backfill, **without** breaking seeds/scripts/tests.

Source: `docs/TRAINING_JOURNAL_DEPRECATION_READINESS_PHASE_5E.md`.

---

## B. Audit findings

### B.1 Active product runtime (CRM UI)

| Area | Legacy journal? |
|------|-----------------|
| Coach trainings tab | **No** — canonical `GET /api/coaches/[id]/trainings` + session-journal APIs (Phase 5C). |
| Other CRM pages | **No** direct `training-journal` or `legacy/coaches/[id]/trainings` usage in `src/app` (grep). |

**Coach / schedule / player flows** still use **other** legacy **training** endpoints (`/api/legacy/trainings/*`, attendance, player trainings list) — **orthogonal** to journal contour but **same** legacy `Training` world; journal sunset is a **subset** of eventual legacy training retirement.

### B.2 Seeds

| File | `TrainingJournal` (Prisma) | `TrainingSessionCoachJournal` | Notes |
|------|------------------------------|-------------------------------|--------|
| **`prisma/seed.ts`** | **Yes** — 4 upserts on demo `Training` rows | **Yes** — 1 upsert on `demo-mark-past-1` | **Intentional dual demo** (Phase 5E); not a migration. |
| **`scripts/seed-full.js`** | **Yes** — up to 3 upserts (mozyakin) | **No** | No `TrainingSession` in script → session journal N/A without larger change. |

### B.3 Tests / scripts (journal-specific)

| Asset | Legacy journal / coach-detail list? |
|-------|--------------------------------------|
| **`scripts/crm-e2e-sanity.ts`** | **No** `POST`/`GET` `training-journal`; **no** `GET /api/legacy/coaches/[id]/trainings` (removed Phase 5E). Still uses **legacy training CRUD**, **`/api/legacy/coach/trainings`**, **`/api/legacy/player/.../trainings`**. |
| **Other `scripts/*`** | **No** matches for `trainingJournal`, `training-journal`, `legacy/coaches`. |

### B.4 API route implementations (in-repo “must ship” until deleted)

| Route | Role |
|-------|------|
| `GET /api/legacy/coaches/[id]/trainings` | Returns `Training` + embedded `TrainingJournal`. |
| `POST` / `PUT` `/api/training-journal*` | Mutates `TrainingJournal`. |

### B.5 Helpers

| Helper | Importers in `src/` |
|--------|---------------------|
| `coachLegacyTrainingsListUrl` | **None** (export only). |

### B.6 What can be cleaned now (this phase)

- **Documentation** + **cross-references** in seeds/scripts/routes (this deliverable + small comments).
- **No** removal of e2e legacy training checks without a replacement plan (would broaden scope / risk).

### B.7 What must remain (until later phases)

- Legacy **HTTP** routes and **Prisma** model.
- **`prisma/seed.ts`** / **`seed-full.js`** legacy journal writes (unless product approves dropping demo legacy journal).
- **E2E** legacy paths that are **not** journal-specific but still guard legacy **training** stack.

---

## C. In-repo dependency table

| Dependency | Type | Active at runtime (user UI)? | Seed/test only? | Blocks journal sunset? |
|------------|------|------------------------------|-----------------|-------------------------|
| `POST` / `PUT` `/api/training-journal*` | HTTP + Prisma | **No** CRM UI | **No** — seeds use **direct** `prisma.trainingJournal`, not HTTP | **Yes** — API + data model |
| `GET /api/legacy/coaches/[id]/trainings` | HTTP | **No** CRM UI | **No** automated e2e gate (5E) | **Soft** — no in-repo caller; unknown externals |
| `prisma.trainingJournal` in **`seed.ts`** | DB write | No | **Yes** | **Yes** until seed strategy changes |
| `prisma.trainingJournal` in **`seed-full.js`** | DB write | No | **Yes** | **Yes** until seed strategy changes |
| `coachLegacyTrainingsListUrl` | TS helper | No | No (unused) | **No** — cosmetic |
| `crm-e2e-sanity` legacy **training** endpoints | HTTP test | No | **Yes** | **Indirect** — legacy `Training` world still tested; not journal HTTP |
| Schedule / player edit **legacy training** fetches | CRM UI | **Yes** (non-journal) | No | **Separate** track from journal-only sunset |

---

## D. Deprecation classification

### 1. Deprecated-soon (in-repo: no product dependency; easy to delete **after** externals confirmed)

| Asset | Rationale |
|-------|-----------|
| **`coachLegacyTrainingsListUrl`** | Zero importers; e2e does not use URL string. |
| **`GET /api/legacy/coaches/[id]/trainings`** | **From in-repo perspective** — no UI, no e2e assertion; **still** returns valid data after seed. **Do not** delete until external traffic policy + optional replacement monitoring. |

### 2. Blocked-by-in-repo-dependencies

| Asset | Blocker |
|-------|---------|
| **`POST` / `PUT` `/api/training-journal`** | **`prisma/seed.ts`** + **`seed-full.js`** keep creating `TrainingJournal` rows; product may still want HTTP for admin/scripts. |
| **`TrainingJournal` model / all Prisma usage** | Seeds above; FK to `Training`; removal needs migration + retention. |
| **Journal “sunset” bundled with legacy training** | CRM **schedule detail** + **player** flows still use `/api/legacy/trainings/*` — journal removal is **not** sufficient to drop entire legacy training API surface. |

### 3. Externally-unknown

| Asset | Note |
|-------|------|
| **`POST` / `PUT` `/api/training-journal`** | Integrations, Postman, old clients — **not** visible in repo. |
| **`GET /api/legacy/coaches/[id]/trainings`** | Same. |

---

## E. Sunset preconditions

### E.1 Before **legacy journal writes** can be disabled (HTTP or seed)

1. **Product sign-off** that no workflow needs new `TrainingJournal` rows.  
2. **Telemetry or access logs** showing **zero/near-zero** `POST`/`PUT` `/api/training-journal` in production (or agreed grace period with warnings).  
3. **`prisma/seed.ts`** updated to **stop** `trainingJournal.upsert` **or** gate behind env (e.g. `SEED_LEGACY_JOURNAL=0`).  
4. **`scripts/seed-full.js`** same.  
5. **Export / archive** plan for existing `TrainingJournal` rows if required for compliance.  
6. **Session journal** confirmed SSOT everywhere CRM needs journal text.

### E.2 Before **`GET /api/legacy/coaches/[id]/trainings`** can stop shipping

1. Preconditions **E.1** satisfied **or** route returns list **without** journal embed and **without** breaking consumers that only need `Training` rows (unlikely — define contract).  
2. **No** undiscovered clients (logging).  
3. **E2E** explicitly not relying on route (already true for coach-detail list).  
4. **Replacement** documented for any script that still needed legacy list shape.

### E.3 Before **`TrainingJournal` model** removal (later phase)

1. **E.1** + **E.2** complete.  
2. **Prisma migration** drops FK, table, and `Coach`/`Training` relations.  
3. **No** code path references `prisma.trainingJournal`.  
4. **Backup** of historical data if needed.

**Sunset-ready (full):** **Not** met — seeds still write legacy journal; HTTP still open; externals unknown.

---

## F. What was safely cleaned up now (Phase 5F implementation)

- This **plan document** (single SSOT for final in-repo cleanup).  
- **Comments** in `prisma/seed.ts`, `scripts/seed-full.js`, `scripts/crm-e2e-sanity.ts`, and selected API/lib files referencing **Phase 5F** and this doc (no behavior change).

---

## G. Risks not resolved

- **Dual demo** in `seed.ts` may confuse readers unless documented (addressed in F + seed comment).  
- **Legacy training** CRM usage remains — journal sunset is **not** full legacy training sunset.  
- **seed-full** still produces legacy journal **without** session journal — CRM tab journal column empty for those rows unless sessions added elsewhere.

---

## H. Recommended next phase

1. **Production logging** on legacy journal HTTP + legacy coach-detail GET.  
2. **Optional env flag** to skip legacy journal in seeds for staging environments.  
3. **Migrate e2e** off legacy training CRUD where canonical equivalents exist (larger project).  
4. **Remove** `coachLegacyTrainingsListUrl` when route deleted and grep clean.  
5. **Schema phase** only after E.1–E.3 satisfied.
