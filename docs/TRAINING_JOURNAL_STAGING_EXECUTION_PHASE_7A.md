# Legacy Journal — Staging Execution Plan for HTTP Write Kill-Switch (Phase 7A)

## A. Goal

Provide a **staging-only** operational runbook to enable:

`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`

and verify behavior **before** any **production** change. **This document does not change production** and does **not** delete routes, disable legacy GET, or alter schema.

**Scope of this phase:** HTTP **write** kill-switch validation in **staging** only. **Not** legacy read retirement; **not** `TrainingJournal` model removal (see `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md`).

---

## B. Current readiness

| Item | Status |
|------|--------|
| **Kill-switch implementation** | `src/lib/api/legacyTrainingJournalWriteGuard.ts` + `POST`/`PUT` `/api/training-journal*` — see `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md`. |
| **403 contract** | JSON `code: LEGACY_TRAINING_JOURNAL_WRITES_DISABLED` + `Deprecation: true` after successful RBAC (`trainings.edit`). |
| **Canonical CRM path** | `GET /api/coaches/[id]/trainings` + `POST`/`PUT` `/api/training-session-journal*` — **unchanged** by write kill-switch. |
| **Legacy GET** | `GET /api/legacy/coaches/[id]/trainings` — **still live**; **not** disabled in 7A. |
| **Seeds** | `SEED_LEGACY_TRAINING_JOURNAL` + `prisma/seedLegacyTrainingJournalPolicy.cjs` — **independent** of HTTP kill-switch (6E/6F). |

**Staging-specific decisions still needed:** who approves the window, which staging deployment receives env vars, and whether to run **logging phase** (§C) before or overlapping the kill-switch flip.

---

## C. Recommended staging env config

Apply **only** on the **staging** deployment / `.env.staging` / host secrets — **never** production in Phase 7A.

| Variable | Recommended value for **write kill-switch validation** | Why |
|----------|------------------------------------------------------|-----|
| **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`** | **`true`** (or `1` / `yes`) | **Primary objective:** prove legacy journal HTTP writes return **403** in staging. |
| **`LOG_LEGACY_TRAINING_JOURNAL`** | **`1` during a short window** (optional but useful **before** or **after** flip, not required 24/7) | Correlates any **successful** legacy write attempts with stderr lines `[LEGACY_TRAINING_JOURNAL]` — should go **silent** once kill-switch is on (except RBAC failures hitting route before guard). |
| **`LOG_LEGACY_COACH_TRAININGS_READ`** | **`1` for a bounded window** (optional) | Baseline traffic on `GET /api/legacy/coaches/[id]/trainings` — **out of scope to disable** in 7A; logs support evidence pack for later read retirement. |
| **`SEED_LEGACY_TRAINING_JOURNAL`** | **`false`** (optional for this exercise) | **Recommended** if staging DB is re-seeded during the test: aligns “no new legacy journal via seed” with “no new legacy journal via HTTP” for **operator clarity**. **Not required** to validate HTTP kill-switch; seeds bypass HTTP regardless. **Unset/true** if you need legacy journal rows recreated on seed for other QA. |

**Production:** leave **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`** **unset/false** until Phase 7A staging sign-off and **6D** production steps.

---

## D. Verification checklist (staging)

Complete after deploying staging env with **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`**. Use a user/session with **`trainings.edit`** (e.g. CRM admin). Replace `STAGING_URL`, `COACH_ID`, `LEGACY_TRAINING_ID`, `LEGACY_JOURNAL_ID`, `SESSION_ID` with real staging ids.

### D.1 Legacy HTTP writes — expect **403**

1. **`POST /api/training-journal`**  
   - Request: `POST {STAGING_URL}/api/training-journal` with JSON body `{ "trainingId": "<legacy Training.id>", "coachId": "<coach id>", "topic": "test" }` and auth (`Cookie` session or `Authorization: Bearer` per your staging auth).  
   - **Expect:** **403**; body includes `"code":"LEGACY_TRAINING_JOURNAL_WRITES_DISABLED"`; response header **`Deprecation: true`**.  
   - **Expect:** **No** new/updated row in `TrainingJournal` for this attempt (verify via DB or legacy GET if a row existed).

2. **`PUT /api/training-journal/[id]`**  
   - Request: `PUT {STAGING_URL}/api/training-journal/<existing TrainingJournal.id>` with JSON partial fields.  
   - **Expect:** **403** + same `code` + `Deprecation`.  
   - **Expect:** Row **unchanged** in DB.

3. **Unauthenticated / wrong role**  
   - Repeat without auth or with user **without** `trainings.edit`.  
   - **Expect:** **401/403 from RBAC** (not necessarily `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED`) — confirms kill-switch runs **after** permission check.

### D.2 Canonical flow — expect **success** (unchanged)

4. **`GET /api/coaches/[id]/trainings`**  
   - **Expect:** **200**; array of session-shaped rows; `journal` array 0 or 1 from `TrainingSessionCoachJournal`.

5. **`POST /api/training-session-journal`**  
   - Upsert for a valid `trainingSessionId` + `coachId` for that coach’s team.  
   - **Expect:** **200** and journal persisted.

6. **`PUT /api/training-session-journal/[id]`**  
   - **Expect:** **200** when journal row exists.

7. **CRM UI (manual)**  
   - Open coach → **Тренировки** tab; open journal modal; save.  
   - **Expect:** Works (uses session journal APIs only).

### D.3 Legacy read path — unchanged in 7A

8. **`GET /api/legacy/coaches/[id]/trainings`**  
   - **Expect:** **200**; JSON shape unchanged; **optional** `Deprecation` + `Link` headers on success (6C).  
   - **Confirms:** read path **not** disabled in this phase.

### D.4 Seeds vs HTTP (explicit)

9. **Document:** Run `npx prisma db seed` (or your staging seed job) with **`SEED_LEGACY_TRAINING_JOURNAL=true`** (or unset).  
   - **Expect:** `TrainingJournal` rows **can still appear** from Prisma — **HTTP kill-switch does not block seeds.**  
   - Optional contrast: run seed with **`SEED_LEGACY_TRAINING_JOURNAL=false`** and confirm **no** new legacy journal rows from seed while HTTP remains 403.

---

## E. Rollback checklist (staging)

| Step | Action |
|------|--------|
| 1 | Set **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`** to **false** or **remove** the variable from staging env. |
| 2 | Redeploy or restart the staging app so process env picks up change. |
| 3 | Re-run **D.1**: `POST`/`PUT` `/api/training-journal*` with `trainings.edit` — **expect:** **200** (or normal 4xx for bad ids), **not** `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED`. |
| 4 | Unset **`LOG_LEGACY_TRAINING_JOURNAL`** / **`LOG_LEGACY_COACH_TRAININGS_READ`** if they were enabled for the test. |
| 5 | Record rollback time and owner in change log. |

---

## F. Evidence to collect (before production)

Archive for **6D** gate / prod cutover:

1. **Screenshots or HAR** showing **403** + `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED` for POST and PUT.  
2. **Logs** (if logging enabled): count of legacy write attempts before vs after flip.  
3. **Confirmation** canonical session journal POST/PUT succeeded in same window.  
4. **Confirmation** legacy GET still 200 (if tested).  
5. **Note** on seed behavior used during test (`SEED_LEGACY_TRAINING_JOURNAL` value).  
6. **Sign-off** name + date: staging write kill-switch validated.

---

## G. Risks not resolved

- Staging traffic may **not** represent production integrators.  
- **False negatives:** no calls in staging does not prove zero prod usage.  
- **Operator confusion** if seeds still create `TrainingJournal` while HTTP is 403 — mitigate with §C `SEED_LEGACY_TRAINING_JOURNAL=false` during the exercise.

---

## H. Recommended next phase

1. After executing this runbook, record outcomes in **`docs/TRAINING_JOURNAL_STAGING_REVIEW_PHASE_7B.md`** (go/no-go template and criteria).  
2. **Production:** follow **`docs/TRAINING_JOURNAL_PRODUCTION_ROLLOUT_PHASE_7C.md`** — export, comms, then **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`** in **production** only after **7B** **PASS** or **PASS WITH NOTES** **and** mandatory evidence **7B §D.4**. **6D** is the overall sunset plan; **7C** is the prod operator runbook for this flag. Legacy **read** retirement and **model** drop remain **later** phases.
