# Training Journal Migration Design — Phase 5A (Design Only)

**Status:** Design and tradeoffs only. **No schema, API contract, or runtime migration in this phase.**  
**Prerequisite:** `docs/ARCHITECTURE_USAGE_ALIGNMENT_PHASE_4C.md`.

---

## 1. Current blocker (summary)

`TrainingJournal.trainingId` is a **Prisma foreign key to `Training.id` only**. The coach CRM «Тренировки» tab lists **legacy** `Training` rows so that `journalModal.training.id` is valid for **`POST /api/training-journal`**. Canonical schedule rows are **`TrainingSession`**; there is **no** schema link between `Training` and `TrainingSession`, so **session ids cannot** substitute for `trainingId` in the journal API today without model/schema change.

---

## 2. Current model dependencies (exact)

### 2.1 Prisma

| Model | Relevant fields / relations |
|-------|-----------------------------|
| **`TrainingJournal`** | `id`, `trainingId`, `coachId`, `topic`, `goals`, `notes`, `teamComment`, timestamps. **`training` → `Training`** (`fields: [trainingId] references: [id]`). **`coach` → `Coach`**. **`@@unique([trainingId, coachId])`**. |
| **`Training`** (legacy) | `journal TrainingJournal[]`. |
| **`Coach`** | `trainingJournal TrainingJournal[]`. |
| **`TrainingSession`** | **No** relation to `TrainingJournal`. Has `sessionReport` → **`TrainingSessionReport`** (different purpose/fields). |

### 2.2 Link between `Training` and `TrainingSession`

**None in Prisma.** The two models are independent; pairing is not stored as FK or join table in the current schema.

### 2.3 Overlapping session-level narrative (context only)

**`TrainingSessionReport`** is 1:1 with `TrainingSession` (`trainingId` → session id) with `summary`, `focusAreas`, `coachNote`, `parentMessage`. It is **not** the same row as `TrainingJournal` (different columns and product intent per schema comments) but **semantic overlap** exists; any merge is a **product** decision, not automatic.

---

## 3. Read / write paths (exact)

### 3.1 Writes

| Path | Method | Body / params | DB effect |
|------|--------|---------------|-----------|
| **`/api/training-journal`** | `POST` | `trainingId`, `coachId`, optional `topic`, `goals`, `notes`, `teamComment` | `upsert` on `trainingId_coachId`; **`trainingId` must exist on `Training`**. |
| **`/api/training-journal/[id]`** | `PUT` | `topic`, `goals`, `notes`, `teamComment` (partial) | `update` by journal row `id`. |

Both guarded (Phase 4C) with `requirePermission(..., "trainings", "edit")`.

### 3.2 Reads (journal payload to UI)

| Source | Mechanism |
|--------|-----------|
| **`GET /api/legacy/coaches/[id]/trainings`** | `include: { journal: { where: { coachId: id } } }` — embeds `TrainingJournal` rows for that coach on each **`Training`**. |
| **`GET /api/coaches/[id]/trainings`** (canonical) | Maps sessions; **`journal: []`** always — **no** read of `TrainingJournal`. |

### 3.3 CRM usage

| Location | Role |
|----------|------|
| **`src/app/(dashboard)/coaches/[id]/page.tsx`** | Loads legacy list; **«Журнал»** opens modal; **save** → `POST /api/training-journal` with `trainingId: journalModal.training.id`. |

### 3.4 Other

| Location | Role |
|----------|------|
| **`prisma/seed.ts`** | `trainingJournal.upsert` for demo **`Training`** rows only. |

**No** parent-app or coach-app usage of `TrainingJournal` found in repo grep for Phase 5A.

---

## 4. Migration options compared

### Option 1 — Keep legacy journal permanently (transitional freeze)

| Dimension | Assessment |
|-----------|------------|
| **Model idea** | No change; `TrainingJournal` stays on `Training.id` forever. |
| **Read strategy** | Coach tab keeps **`GET /api/legacy/coaches/[id]/trainings`**. |
| **Write strategy** | Unchanged `POST`/`PUT` training-journal. |
| **Backfill** | None. |
| **Coexistence** | Permanent **dual world**: schedule = `TrainingSession`, CRM journal tab = `Training`. |
| **Rollback** | N/A. |
| **Main risks** | Drift; new schools may only create **sessions** → **empty** legacy list → journal UX **starved**; operational confusion. |

---

### Option 2 — Parallel journal ownership for `TrainingSession` (new table or nullable second FK)

**2a) New model** e.g. **`TrainingSessionCoachJournal`** (or name TBD): `trainingSessionId` + `coachId`, same text fields, `@@unique([trainingSessionId, coachId])`.

| Dimension | Assessment |
|-----------|------------|
| **Read strategy** | Coach tab switches to **`GET /api/coaches/[id]/trainings`**; include/join session journal per row. Legacy list **retired** or kept read-only for admin. |
| **Write strategy** | New **`POST/PUT`** endpoints (or extended body with `trainingSessionId`) writing **only** to the new table during migration window. |
| **Backfill** | **Hard** without `Training`↔`TrainingSession` mapping: heuristic (team + time window) or **manual** or **forward-only** (new journals on sessions only). |
| **Coexistence** | **Two** journal stores until backfill + cutover; UI must not double-show. |
| **Rollback** | Stop writing new session journals; keep reading legacy for old rows. |
| **Main risks** | Duplicate UX if both shown; backfill errors; two code paths during transition. |

**2b) Single table, add nullable `trainingSessionId`** and eventually deprecate `trainingId` — same tradeoffs, **stronger** migration complexity (nullable FKs, check constraints in app).

---

### Option 3 — Replace ownership: point `TrainingJournal` at `TrainingSession`

| Dimension | Assessment |
|-----------|------------|
| **Model idea** | Change FK: `trainingId` column now references **`TrainingSession.id`** (rename column in migration for clarity). |
| **Read strategy** | Session-based lists load journal via session id. |
| **Write strategy** | Same upsert key shape but values must be **session** ids. |
| **Backfill** | **Every** existing `TrainingJournal` row needs a **valid** `TrainingSession.id** or row is **orphaned/deleted**. No reliable 1:1 map from schema today. |
| **Coexistence** | **Destructive** cutover; hard to run both meanings in one column. |
| **Rollback** | Requires DB restore or second migration reverting FK. |
| **Main risks** | **Data loss** or **incorrect** pairing if backfill is guessed; long downtime or complex dual-write window. |

**Verdict:** Only viable if product accepts **dropping** or **re-entering** historical journal text, or invests in a **trusted** mapping pipeline first.

---

### Option 4 — Bridge / mapping table `Training` ↔ `TrainingSession`

| Dimension | Assessment |
|-----------|------------|
| **Model idea** | e.g. `LegacyTrainingSessionLink(legacyTrainingId, trainingSessionId)` with uniqueness rules. |
| **Read strategy** | Resolve session → optional legacy id → load **old** `TrainingJournal`; or inverse for tab migration. |
| **Write strategy** | After link exists, write journal against **one** chosen owner (prefer session) and optionally **sync** or **stop** legacy writes. |
| **Backfill** | Populate links via rules, imports, or manual tooling. |
| **Coexistence** | **High** complexity: journal read must know which id is authoritative. |
| **Rollback** | Drop table; revert reads. |
| **Main risks** | **Many-to-many** ambiguity if multiple sessions match one legacy slot; stale links. |

Useful mainly if business **must** preserve legacy journal text **and** attach it to a **specific** session for audit.

---

### Option 5 — Consolidate into `TrainingSessionReport` (no new journal table)

| Dimension | Assessment |
|-----------|------------|
| **Model idea** | Extend **`TrainingSessionReport`** with journal-like fields or map `topic/goals/notes/teamComment` into existing columns. |
| **Read strategy** | Single session report fetch for tab. |
| **Write strategy** | Reuse report **PATCH/POST** APIs; deprecate `TrainingJournal` for school CRM. |
| **Backfill** | Map old journal text into `summary`/`coachNote`/etc. — **lossy** or requires new columns anyway. |
| **Coexistence** | Overlap with parent-facing **published** report workflow — **risk of conflating** internal notes vs parent narrative (see schema comment on `TrainingSessionReport`). |
| **Main risks** | Product/permission blur; may still need **separate** internal fields → converges toward Option 2. |

---

## 5. Recommended path

**Recommend Option 2a: new `TrainingSessionCoachJournal` (or equivalent name) with `trainingSessionId` + `coachId` and the same text fields as `TrainingJournal`, with `@@unique([trainingSessionId, coachId])`.**

**Why**

1. **Does not violate FK reality:** existing `TrainingJournal` rows stay valid on `Training.id`; no fake session ids in the current column.  
2. **Avoids destructive Option 3** backfill on a single column without a trusted map.  
3. **Clearer than Option 4** for the **common** case: new work is **session-native**; legacy journal remains read-only until explicitly backfilled or abandoned.  
4. **Safer than Option 5** for separating **internal CRM journal** from **`TrainingSessionReport`** semantics unless product explicitly merges them.

**What the next implementation phase should do (outline)**

1. **Schema (Phase 5B+):** add new model + migration; **do not** drop `TrainingJournal` yet.  
2. **API:** add `POST/PUT` (or extend with discriminated `owner: legacy | session`) for session journal; keep legacy endpoints during transition.  
3. **Reads:** extend **`GET /api/coaches/[id]/trainings`** to join **session** journal rows (same shape as legacy embed for UI).  
4. **CRM tab:** switch data source to canonical list + session journal; keep **read-only** legacy list or export path for unmigrated rows (product choice).  
5. **Backfill:** define explicit policy — **forward-only** (recommended minimum) vs heuristic link vs manual CSV.  
6. **Deprecate:** after retention window, stop `POST` to legacy journal; archive or read-only legacy API.

---

## 6. Phased implementation outline (next phases)

| Phase | Scope |
|-------|--------|
| **5B** | Prisma migration + new model; feature flag or env to toggle writes. |
| **5C** | API routes + `GET /api/coaches/[id]/trainings` includes session journal; CRM tab behind flag. |
| **5D** | Remove legacy tab fetch when backfill policy satisfied; document sunset for `POST /api/training-journal` (legacy). |

---

## 7. Explicit non-goals (Phase 5A)

- No pretending that **`TrainingSession.id`** can replace **`TrainingJournal.trainingId`** today.  
- No application-level “bridge” that stores session id in **`TrainingJournal.trainingId`** without schema support — **would break FK**.  
- No merge of **`TrainingSessionReport`** and journal without a signed-off product spec.
