# Legacy Journal — Production Rollout Plan for HTTP Write Shutdown (Phase 7C)

## A. Goal

Provide an **operator-ready production rollout plan** for enabling:

`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`

so that **`POST` / `PUT` `/api/training-journal*`** return **403** with `code: LEGACY_TRAINING_JOURNAL_WRITES_DISABLED` (after successful RBAC) and **do not** write to the database — **without** executing the change in this phase.

**This document is a plan and checklist, not a production execution.**

**Explicitly out of scope for Phase 7C:**

- Enabling the flag in production (operators perform later, per approvals).
- Deleting routes or the `TrainingJournal` model.
- Schema migrations.
- Disabling legacy **read** (`GET /api/legacy/coaches/[id]/trainings`) or removing deprecation headers.

**Separation (mandatory):**

| Track | Phase 7C covers? |
|-------|------------------|
| **HTTP write shutdown** (`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`) | **Yes** |
| Legacy **read** retirement / read kill-switch | **No** — see `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md` §C steps **6–7** |
| **`TrainingJournal` model / table removal** | **No** — see **6D** §C step **9** |

**Authoritative inputs:**

- Staging runbook: `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md`
- Post-staging review / go-no-go: `docs/TRAINING_JOURNAL_STAGING_REVIEW_PHASE_7B.md`
- Sunset sequence and archive policy: `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md`
- Kill-switch contract: `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md`

---

## B. Preconditions (must-have before production)

Do **not** schedule production until **all** of the following are satisfied.

### B.1 Staging and review gates

| # | Gate | Evidence |
|---|------|----------|
| **S1** | **7A** staging run completed with kill-switch **on** | Checklist in `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md` §D |
| **S2** | **7B** outcome **PASS** or **PASS WITH NOTES** | Archived review using `docs/TRAINING_JOURNAL_STAGING_REVIEW_PHASE_7B.md` §C template |
| **S3** | **7B §D.4** production evidence | **P1–P2** (archived 7B + staging artifacts); **P3** (explicit product/ops approval for prod date); **P4** (export plan executed or scheduled per §D below); **P5** (comms: known API users notified **or** “none known” documented) |

**Staging PASS alone is insufficient** without **P3–P5** (`docs/TRAINING_JOURNAL_STAGING_REVIEW_PHASE_7B.md` §D.4).

### B.2 Technical and operational readiness

| # | Item |
|---|------|
| **T1** | All **production** app instances / workers that serve `POST`/`PUT` `/api/training-journal*` will receive the same env value after change (no mixed fleet). |
| **T2** | Runbook owner knows **how** production env is applied for this app (host dashboard, secrets manager, `render.yaml`, etc.) and that a **restart or redeploy** is required after env change. |
| **T3** | **On-call** or primary responder is identified for the **monitoring window** (§F). |
| **T4** | **Rollback** authority is clear (who can revert env + restart within minutes). |

### B.3 Optional but recommended

| # | Item |
|---|------|
| **O1** | Bounded **`LOG_LEGACY_TRAINING_JOURNAL=1`** sampling in **production** (or access logs) already reviewed — confirms whether unexpected traffic hits legacy journal writes (`docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md` §C step **1**, §F.1). |
| **O2** | **`SEED_LEGACY_TRAINING_JOURNAL`** policy for **production** deploy/seed jobs agreed (6D §D) — avoids operator confusion when DB seed runs after writes are off. **Not** required to flip the HTTP flag, but recommended near the same program. |

---

## C. Rollout steps

### C.1 Roles (who triggers the change)

| Role | Responsibility |
|------|----------------|
| **Change owner** | Schedules window, ensures preconditions (§B), coordinates export (§D) and comms (§E). |
| **Infra / deployment** | Updates production secrets/env, triggers redeploy or rolling restart so **every** Node/process picks up `DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`. |
| **Verifier** | Runs post-flip smoke checks (§C.4); captures evidence. |
| **Monitor** | Watches logs and metrics during §F window; escalates on anomalies. |

One person may hold multiple roles; names and backups should be recorded in the change ticket.

### C.2 When (time window)

| Consideration | Guidance |
|---------------|----------|
| **Traffic** | Prefer a window when CRM coach journal usage is **lower** if your org has clear peaks (timezone + season). |
| **Support** | Ensure support / CS is aware if any external API users were notified (§E). |
| **Duration** | Env change + redeploy is typically **minutes**; reserve **30–60 minutes** for smoke tests and initial monitoring. |
| **Freeze** | Avoid stacking with unrelated high-risk releases the same hour unless explicitly coordinated. |

Exact date/time is **product + ops** decision (`docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md` §B.3).

### C.3 How (env change + restart)

1. Set **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`** to a **truthy** value in the **production** environment (`1`, `true`, or `yes` per `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md` §C).
2. **Redeploy** the application **or** **restart** all processes that load that env (platform-dependent: e.g. Render service restart, Docker rollout, k8s rollout).
3. Confirm **no** stale instances: health checks green; instance count matches expected; no canary left on old config.

**Do not** rely on “save env” without restart unless your platform **guarantees** hot reload of that variable (most do not).

### C.4 Recommended sequence (ordered)

Execute **in order**. **Export before flag** aligns with `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md` §C steps **3–4**.

| Step | Action | Owner |
|------|--------|-------|
| **1** | Confirm §B preconditions; open change ticket with rollback link (§G). | Change owner |
| **2** | Execute **§D export** (or confirm completed earlier same day); record artifact location and verification note. | Ops / DBA |
| **3** | Send **§E comms** (if applicable) **before** or **at** flip — align with stakeholder promise. | Change owner |
| **4** | Apply **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`** to **production** env. | Infra |
| **5** | **Redeploy / restart** all app instances. | Infra |
| **6** | **Smoke:** `POST`/`PUT` `/api/training-journal*` with valid `trainings.edit` → **403** + JSON `code` `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED` + header `Deprecation: true`. | Verifier |
| **7** | **Smoke:** `POST`/`PUT` `/api/training-session-journal*` → **200** for valid session/coach (same auth story as staging). | Verifier |
| **8** | **Smoke:** `GET /api/coaches/[id]/trainings` → **200**. | Verifier |
| **9** | **Optional:** `GET /api/legacy/coaches/[id]/trainings` → **200** (read path must remain available). | Verifier |
| **10** | Start **§F monitoring window**; log change completion time in ticket. | Monitor |

### C.5 Post-rollout record

Archive in the change ticket:

- Timestamp of env apply + deploy completion.
- Smoke test results (status codes + redacted snippet showing `code`).
- Link to export artifact metadata (not necessarily the file in the ticket).

---

## D. Export / backup steps

**Purpose:** one-time **retention / audit** snapshot before HTTP writes are turned off in production (`docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md` §E). The **database table remains**; export is **additive**.

### D.1 When to export

| Timing | Rule |
|--------|------|
| **Recommended** | **Before** step **C.4.4** (production flag enable), same maintenance window or immediately prior business day. |
| **Minimum** | Completed **no later than** the production flip; **6D** treats export as gate for production write shutdown. |

### D.2 How (high-level — no scripts required in-repo)

Choose one approach approved by your org (DBA / security):

| Method | Description |
|--------|-------------|
| **SQL dump slice** | `pg_dump` with table-only or custom format for `TrainingJournal` (and parent keys if needed for joins). |
| **`COPY` / CSV** | `COPY (SELECT * FROM "TrainingJournal") TO STDOUT` (or explicit column list) to encrypted object storage. |
| **Managed backup** | If production already has point-in-time recovery, document **PITR timestamp** **and** still recommend a **logical** table export for easy audit/CS lookup. |

Include identifiers needed for support: at minimum **`id`**, **`trainingId`**, **`coachId`**, journal text fields, **`createdAt`/`updatedAt`** (align with **6D** §E).

Store in **org-approved** storage with **access controls** and **retention label**.

### D.3 Verification of export completeness

| Check | Pass criteria |
|-------|----------------|
| **Row count** | Export row count **equals** `SELECT COUNT(*) FROM "TrainingJournal"` at export time (or documented filter if partial export was explicitly approved). |
| **Spot check** | Random sample of **N** IDs from DB present in export. |
| **Integrity** | File checksum or object version recorded in ticket. |
| **Restorability** | Someone knows **how** to open the artifact (format, encryption key location). |

If export **fails** or count mismatches, **do not** enable the production flag until resolved or explicitly waived by data owner with written rationale.

---

## E. Communication plan

### E.1 Do external clients need to be notified?

| Situation | Action |
|-----------|--------|
| **Known** integrators, partners, or customer scripts calling `POST`/`PUT` `/api/training-journal*` | **Yes** — notify **before** flip with §E.2 message; give **403** contract and date. |
| **No known callers** (per **7B P5** and internal grep / API gateway history) | Document **“none known”** in change ticket; still brief **internal** comms (§E.3). |

**In-repo CRM** uses canonical session journal APIs only (**6D** §B.1); end-user coaches are **not** expected to call legacy journal HTTP directly.

### E.2 Suggested message (if external notification applies)

> We are disabling legacy training journal **HTTP writes** on **[date UTC]**.  
> **`POST /api/training-journal`** and **`PUT /api/training-journal/{id}`** will return **HTTP 403** with JSON body containing **`"code":"LEGACY_TRAINING_JOURNAL_WRITES_DISABLED"`** and a **`Deprecation: true`** response header.  
> **Reads** of the legacy coach trainings list and canonical coach session APIs are **unchanged**.  
> Please migrate any remaining writes to **`POST`/`PUT` `/api/training-session-journal*`** (canonical session journal) or contact us for guidance.

Adjust URLs to your public API base.

### E.3 Internal stakeholders

| Audience | Message (short) |
|----------|-----------------|
| **Engineering** | Flag name, rollout time, rollback (§G), link to this doc + **7B** outcome. |
| **Support / CS** | Legacy journal **writes** via old API will error with specific **code**; coaches use CRM session journal; escalations for “403 on old integration.” |
| **Data / BI** | Export location and that **`TrainingJournal` table** still exists for reporting until a later sunset phase. |

---

## F. Monitoring plan

### F.1 What to observe after enabling the flag

| Signal | Expected after flip |
|--------|---------------------|
| **`POST`/`PUT` `/api/training-journal*`** | **403** for callers with `trainings.edit`; **no** new rows in `TrainingJournal` from HTTP |
| **`POST`/`PUT` `/api/training-session-journal*`** | **200** rate **stable** vs pre-flip baseline (allow for normal variance) |
| **`GET /api/coaches/[id]/trainings`** | **200**; error rate **not** spiking |
| **Application errors** | **No** spike in **5xx** attributable to journal routes |
| **Support** | Ticket themes: “403” + legacy integration vs unrelated auth |

### F.2 Logs / endpoints / error patterns

| Source | What to look for |
|--------|------------------|
| **Access / API gateway logs** | Status distribution on paths matching `training-journal` (not `training-session-journal`). Expect **403** increase if traffic existed; **200** should drop to ~zero for authenticated legacy writes. |
| **App stderr** (if **`LOG_LEGACY_TRAINING_JOURNAL=1`** enabled briefly) | Lines tagged legacy journal — correlate with any unexpected **200** after flip (would indicate misconfigured instance). |
| **Database** | Optional query: `SELECT COUNT(*) FROM "TrainingJournal" WHERE "updatedAt" > :flip_time` — should reflect **only** seeds/admin/imports, **not** steady HTTP-driven growth. |
| **Client-visible** | Responses include **`code":"LEGACY_TRAINING_JOURNAL_WRITES_DISABLED"`** — distinguishes kill-switch from generic RBAC **403**. |

### F.3 Observation window

| Parameter | Recommendation |
|-----------|----------------|
| **Minimum active watch** | **24 hours** from flip (business-hours check-ins if overnight deploy). |
| **Extended watch** | **72 hours** if you had **any** known external API users or uncertain traffic (**6D** §F.1). |
| **Stop condition** | No unresolved incidents; smoke checks documented; ticket closed with “monitoring complete” or handoff to steady-state on-call. |

---

## G. Rollback plan (production)

### G.1 When to rollback

| Trigger | Action |
|---------|--------|
| **Canonical** session journal writes or coach trainings **GET** broken | Rollback **immediately** after quick triage if flag is suspected. |
| **Critical** partner cannot operate and **temporary** legacy write restore is explicitly approved | Rollback per §G.2; schedule remediation. |
| **Misconfigured** fleet (some instances without flag, some with) | Fix config **or** rollback uniformly — **do not** leave split-brain long. |

**403 on legacy write alone** is **expected** after flip — **not** a rollback trigger unless the change was **unintended** or **wrong environment**.

### G.2 Rollback steps

| Step | Action |
|------|--------|
| **1** | Set **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`** to **false** or **remove** the variable from **production** env. |
| **2** | **Redeploy / restart** all instances (same discipline as forward rollout). |
| **3** | **Verify:** `POST`/`PUT` `/api/training-journal*` with valid `trainings.edit` → **200** (or normal 4xx for bad ids) — response body **must not** contain `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED`. |
| **4** | Re-run session journal smoke (**200** still). |
| **5** | Record rollback time, reason, and owner in change ticket. |

### G.3 How fast rollback can be executed

| Phase | Typical duration |
|-------|------------------|
| Env revert + redeploy | **5–15 minutes** on many PaaS setups (platform-dependent) |
| Verification | **5–10 minutes** |

Target **RTO** for “restore legacy HTTP writes”: **under 30 minutes** if staffing and access are pre-arranged.

### G.4 How to verify recovery

- Legacy write **200** (or expected 4xx) restored as in §G.2 step **3**.
- No lingering instances on kill-switch (check instance env or feature-flag dashboard).
- Stakeholders notified if external comms had promised permanent shutdown.

---

## H. Risks not resolved

| Risk | Note |
|------|------|
| **Unknown HTTP clients** | Production traffic may differ from staging; **403** may surface only when a rare job runs. |
| **Multi-instance drift** | One instance without the flag allows writes until corrected — mitigated by post-deploy verification and platform rollout checks. |
| **Seeds / direct DB** | **`TrainingJournal` rows** can still appear from **Prisma seed** or **SQL** — not blocked by this flag (**6B** §E); operators should align **`SEED_LEGACY_TRAINING_JOURNAL`** policy separately (**6D** §D). |
| **Read path still live** | Legacy **GET** and embeds remain; **write** shutdown does **not** remove compliance surface area for reads. |
| **Export gaps** | Partial or failed export without detection risks audit gaps — mitigated by §D.3. |

---

## I. Recommended next phase

1. **Steady state:** Keep **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`** in production; retain **§F** monitoring playbook for the first release cycle.  
2. **Seed alignment:** Apply **`SEED_LEGACY_TRAINING_JOURNAL=false`** (or org policy) in environments where new legacy journal rows should not appear — **`docs/TRAINING_JOURNAL_SEED_POLICY_PHASE_6E.md`**, **`docs/TRAINING_JOURNAL_SEED_ALIGNMENT_PHASE_6F.md`**.  
3. **Legacy read program:** When ready, follow **`docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md`** §C steps **6–7** (read kill-switch or route removal) — **separate** change and comms.  
4. **Model removal:** **Last** — **6D** §C step **9** only after routes retired, exports retained, and code references gone.

---

## Reference

| Document | Role |
|----------|------|
| `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md` | Staging runbook |
| `docs/TRAINING_JOURNAL_STAGING_REVIEW_PHASE_7B.md` | Go/no-go + **P1–P5** |
| `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md` | Full sunset sequence |
| `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md` | Flag semantics and HTTP contract |
