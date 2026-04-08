# Legacy Journal — Staging Execution Review & Go/No-Go (Phase 7B)

## A. Goal

Provide a **review framework** and **decision criteria** after operators have run the **Phase 7A** staging flip (`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`). This document is **not** the execution plan (see `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md`) and **not** a production change.

**Purpose:** formalize outcomes, evidence, and **GO / PASS WITH NOTES / BLOCKED** for **whether the project may proceed toward** a **production HTTP write-shutdown** step (per `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md`).

**Separation:**

- **Staging success** = checks in §C pass in **staging**.
- **Production readiness** = staging outcome **plus** mandatory evidence in §D **plus** product/ops approvals — **not** automatic when staging passes.

---

## B. Expected staging checks (evaluation lens)

Operators should have exercised the following. Reviewers score each **Pass / Fail / Not run**.

| # | Check | Expected when kill-switch **ON** |
|---|--------|-----------------------------------|
| **1** | `POST /api/training-journal` with valid `trainings.edit` | **403**; JSON `code` = `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED`; header `Deprecation: true` |
| **2** | `PUT /api/training-journal/[id]` with valid `trainings.edit` | Same as **1** |
| **3** | `POST`/`PUT` without auth or without `trainings.edit` | **401/403** from RBAC (body may **not** contain `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED`) |
| **4** | `GET /api/coaches/{coachId}/trainings` | **200**; array; session-shaped rows; `journal` 0 or 1 as data allows |
| **5** | `POST /api/training-session-journal` (valid session + coach) | **200**; persists |
| **6** | `PUT /api/training-session-journal/[id]` | **200** when row exists |
| **7** | CRM: coach → **Тренировки** → journal modal save | Success (uses session APIs) |
| **8** | `GET /api/legacy/coaches/{coachId}/trainings` | **200**; legacy JSON shape; optional `Deprecation` + `Link` (6C) |
| **9** | Seeds interpretation | Documented: `db seed` with `SEED_LEGACY_TRAINING_JOURNAL` unset/true **may** still create `TrainingJournal` rows — **not** a failure of HTTP kill-switch |

**Success baseline:** **1**, **2**, **4**, **5**, **6**, **7**, **8** = **Pass**. **3** = **Pass** if behavior matches expectation. **9** = **Pass** if operator note explains seed env used.

---

## C. Result template (copy for each staging run)

```markdown
## Staging run metadata
- Environment name / URL base:
- Date (UTC):
- Kill-switch: DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true confirmed in runtime: [ ] yes [ ] no
- Other env: LOG_LEGACY_TRAINING_JOURNAL= | LOG_LEGACY_COACH_TRAININGS_READ= | SEED_LEGACY_TRAINING_JOURNAL=
- Reviewer:
- Operator:

## Results (Pass / Fail / Not run)
| # | Check | Result | Notes |
|---|--------|--------|-------|
| 1 | POST legacy journal | | |
| 2 | PUT legacy journal | | |
| 3 | RBAC before kill-switch | | |
| 4 | GET canonical coach trainings | | |
| 5 | POST session journal | | |
| 6 | PUT session journal | | |
| 7 | CRM tab journal save | | |
| 8 | GET legacy coach trainings list | | |
| 9 | Seed note | | |

## Evidence attachments
- [ ] Screenshot or HAR: 403 + code on POST
- [ ] Screenshot or HAR: 403 + code on PUT
- [ ] Proof session journal POST/PUT 200
- [ ] Proof legacy GET 200
- [ ] Optional: log excerpts (legacy write / legacy read)

## Overall outcome (reviewer fills §D)
Chosen: [ ] PASS  [ ] PASS WITH NOTES  [ ] BLOCKED
```

---

## D. Go / no-go criteria

### D.1 **PASS** (staging)

All of:

- **1** and **2** are **Pass** with correct **`code`** and **403** (not merely generic error).
- **4**, **5**, **6**, **7** are **Pass**.
- **8** is **Pass** (**200**).
- **3** is **Pass** or **Not run** with documented reason.

**Meaning:** Staging validates HTTP write kill-switch **without** breaking canonical journal or legacy read.

### D.2 **PASS WITH NOTES**

- **1**–**8** **Pass**, but:
  - **9** uncovered confusion (e.g. new `TrainingJournal` rows after seed mistaken for HTTP) — **resolved in notes**, **or**
  - **7** skipped but **5**/**6** proven via API with same auth, **or**
  - Cosmetic issues only (wording, logging noise).

**Meaning:** Proceed toward production planning **after** notes are filed; **no** code change required for kill-switch itself.

### D.3 **BLOCKED**

Any of:

- **1** or **2** returns **200** (writes still applied) or **500** without documented cause.
- **4**, **5**, **6**, or **7** **Fail** (canonical path broken).
- **8** **Fail** (legacy read broken unintentionally — would be unexpected; investigate deployment/routing).
- **1**/**2** return **403** but **wrong** or **missing** `code` **and** client contracts depend on `code`.

**Meaning:** **Do not** schedule production write-shutdown until root cause fixed and staging re-run **PASS** or **PASS WITH NOTES**.

### D.4 Production step — **mandatory evidence** (even after staging PASS)

Before **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true` in production**:

| # | Evidence |
|---|----------|
| P1 | Completed **7B** review with outcome **PASS** or **PASS WITH NOTES** (archived). |
| P2 | Staging artifacts attached (§C checklist). |
| P3 | Product/ops **explicit approval** for prod date. |
| P4 | **`TrainingJournal` export** plan executed or scheduled per **6D** §E (org policy). |
| P5 | Comms plan for any **known** API consumers (if none, document “none known”). |

**Staging PASS alone is insufficient** if **P3–P5** are not satisfied.

---

## E. Common failure interpretations

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| **403** but **no** `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED` | RBAC or auth failure before kill-switch branch | Fix auth; retest with `trainings.edit` |
| **200** on `POST /api/training-journal` | Kill-switch **not** loaded (wrong env, wrong service, stale deploy) | Verify process env; redeploy |
| **500** on legacy write | DB/Prisma error **before** guard unlikely; check logs | Treat as **BLOCKED** until explained |
| Session journal **403** | Unrelated RBAC or bad `trainingSessionId` / team ownership | Not caused by legacy write flag; fix data/auth |
| CRM journal **fails** but API **5**/**6** pass | Browser cookie/session issue | Retest CRM; compare token to API client |
| New `TrainingJournal` rows after test | **Seed** or **direct DB** — not HTTP | Document `SEED_LEGACY_TRAINING_JOURNAL`; not a kill-switch defect |
| Legacy GET **404** | Wrong URL or route not deployed | Compare to 7A; **BLOCKED** until 200 restored |

---

## F. Recommended next phase

1. If **PASS** or **PASS WITH NOTES:** follow **`docs/TRAINING_JOURNAL_PRODUCTION_ROLLOUT_PHASE_7C.md`** (production rollout plan: export → comms → prod env → monitor). **6D** remains the sunset umbrella; **7C** is the operator-ready prod cutover for the write flag only.  
2. If **BLOCKED:** fix, redeploy staging, re-run **7A** checklist, then new **7B** review.  
3. **Do not** conflate this review with legacy **read** retirement or **model** drop — separate gates in **6D**.

---

## Reference

- Execution plan: `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md`  
- Kill-switch spec: `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md`  
- Sunset sequence: `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md`  
- Production rollout (write flag): `docs/TRAINING_JOURNAL_PRODUCTION_ROLLOUT_PHASE_7C.md`
