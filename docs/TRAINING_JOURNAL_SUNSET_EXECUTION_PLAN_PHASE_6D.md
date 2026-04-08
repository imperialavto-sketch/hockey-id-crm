# Legacy Journal — Sunset Execution Plan (Phase 6D)

## A. Goal

Produce an **operational execution plan** for retiring the **legacy journal contour** (`TrainingJournal`, `/api/training-journal*`, journal embed via `GET /api/legacy/coaches/[id]/trainings`) in **ordered steps**, with **gates**, **rollback**, and **concrete policy choices** — **without** executing shutdown in this phase (no route/model deletion, no disablement, no schema change, no backfill).

**This document is a plan, not the shutdown itself.**

Authoritative prior phases:

- `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md` — HTTP write kill-switch.
- `docs/TRAINING_JOURNAL_LEGACY_READ_READINESS_PHASE_6C.md` — legacy coach-detail read deprecation headers + optional logging.
- `docs/TRAINING_JOURNAL_FINAL_CLEANUP_PLAN_PHASE_5F.md` — in-repo inventory and classification.

**Staging runbook:** `docs/TRAINING_JOURNAL_STAGING_EXECUTION_PHASE_7A.md` — **staging only**. **Post-run review / go-no-go:** `docs/TRAINING_JOURNAL_STAGING_REVIEW_PHASE_7B.md`. **Production write-flag rollout (planning only until executed):** `docs/TRAINING_JOURNAL_PRODUCTION_ROLLOUT_PHASE_7C.md`.

---

## B. Audit findings

### B.1 Already ready

| Capability | Where |
|------------|--------|
| **HTTP write kill-switch** | `DISABLE_LEGACY_TRAINING_JOURNAL_WRITES` — 403 + stable `code` + `Deprecation` header (6B). |
| **Write observability (opt-in)** | `LOG_LEGACY_TRAINING_JOURNAL=1` (6A/6B). |
| **Read-path deprecation signal** | `GET /api/legacy/coaches/[id]/trainings` — `Deprecation` + `Link` → canonical on 200 (6C). |
| **Read observability (opt-in)** | `LOG_LEGACY_COACH_TRAININGS_READ=1` (6C). |
| **CRM UI** | Canonical session list + `TrainingSessionCoachJournal` only (5C). |
| **In-repo HTTP consumers** | None for journal writes or legacy coach-detail list (5F/6C). |

### B.2 What still blocks a “real” shutdown

| Blocker | Detail |
|---------|--------|
| **External HTTP callers** | Unknown integrations may still call write or read endpoints. |
| **Seeds** | `TrainingJournal` via Prisma when `SEED_LEGACY_TRAINING_JOURNAL` allows; **`TrainingSessionCoachJournal`** always in `prisma/seed.ts` and in `seed-full` (**6F**) for canonical demo id. |
| **`Training` + other legacy APIs** | Schedule/player flows still use legacy **training** APIs; journal is a **slice** of that world — full legacy training retirement is a **wider** program. |
| **Data retention owner** | No executed export/retention runbook in-repo until ops performs it. |

### B.3 Open decisions (product / ops)

| Decision | Owner |
|----------|--------|
| **Calendar** for enabling write kill-switch in **production**. | Product + ops. |
| **Whether** any customer needs **read** access to legacy journal JSON after writes are off. | Product / CS. |
| **Whether** historical `TrainingJournal` rows must be **migrated** into `TrainingSessionCoachJournal` (requires approved mapping — **not** heuristic). | Product + data. |
| **When** to drop **`Training`** demo rows that only exist for legacy journal demos. | Product. |

### B.4 Missing operational evidence

1. Request volume / error rates for `POST`/`PUT` `/api/training-journal*` (staging → prod).  
2. Request volume for `GET /api/legacy/coaches/[id]/trainings` with logging enabled.  
3. Confirmation **no** internal dashboards or scripts outside this repo depend on these endpoints.

---

## C. Sunset sequence (recommended order)

Execute **in order**; do **not** skip gates.

| Step | Action | Gate (evidence before proceed) | Rollback (see §G) |
|------|--------|--------------------------------|-------------------|
| **1** | **Staging:** enable `LOG_LEGACY_TRAINING_JOURNAL=1` and optionally `LOG_LEGACY_COACH_TRAININGS_READ=1` for a **bounded window**. | Logs reviewed; baseline traffic documented. | Unset env vars. |
| **2** | **Staging:** set `DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`. | No failing internal tests; no stakeholder objection; 403 + `code` understood. | Unset flag → writes work again. |
| **3** | **Production:** one-time **export** of `TrainingJournal` (and related keys) per §E. | Export artifact stored per retention policy. | N/A (additive). |
| **4** | **Production:** enable `DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`. | Step 3 complete; comms sent if any known API users. **Operator runbook:** `docs/TRAINING_JOURNAL_PRODUCTION_ROLLOUT_PHASE_7C.md`. | Unset flag. |
| **5** | **Seeds:** **Phase 6E** — set `SEED_LEGACY_TRAINING_JOURNAL=false` in environments that should not create new legacy journal rows; verify `db seed` + CRM session journal demo. | Staging `db seed` + CRM tab still show session journal; legacy journal absent when flag off. | Set env **unset** or `true` / revert commit. |
| **6** | **Read path:** enable optional **read kill-switch** (future implementation: e.g. `DISABLE_LEGACY_COACH_TRAININGS_READ=1` → 404/410 + JSON hint) **or** leave route 200 with headers until traffic is zero. | Log evidence shows **zero** or accepted volume; product approves stricter response. | Unset read flag or redeploy prior build. |
| **7** | **Remove** `GET /api/legacy/coaches/[id]/trainings` route (and helper) **only** after read gate satisfied **and** no dependency on journal embed for support. | Grep + external sign-off. | Redeploy with route restored (emergency). |
| **8** | **Remove** `POST`/`PUT` `/api/training-journal` routes after write flag has been **on** in prod for agreed period **and** seeds no longer rely on HTTP (they never did — confirm no external docs reference HTTP). | Same as above. | Redeploy. |
| **9** | **Schema phase:** Prisma migration to drop `TrainingJournal` table + relations **after** retention satisfied and **no** code references. | Migration tested on copy of prod DB. | Restore from backup / down migration (if designed). |

**Separation (mandatory):**  
- **Steps 2–4** = HTTP **write** shutdown.  
- **Steps 6–7** = legacy **read** list retirement (journal embed goes away with route).  
- **Step 9** = **model** removal — **last**.

---

## D. Seed policy decision (concrete)

| Source | **Current** | **Target (recommended)** |
|--------|-------------|---------------------------|
| **`prisma/seed.ts`** | Dual: legacy `Training` + `TrainingJournal` **and** `TrainingSessionCoachJournal` on `demo-mark-past-1`. | **Phase 6E implemented:** env **`SEED_LEGACY_TRAINING_JOURNAL`** — default **on**; `false`/`0`/`no` skips legacy journal upserts only. Session journal on `demo-mark-past-1` **not** gated. Details: `docs/TRAINING_JOURNAL_SEED_POLICY_PHASE_6E.md`. **Dual remains temporary** until legacy `Training` demo scope is reduced in a separate program. |
| **`scripts/seed-full.js`** | Legacy `Training` + optional `TrainingJournal` + canonical session row. | **Phase 6E–6F:** `prisma/seedLegacyTrainingJournalPolicy.cjs` + **`seed-full-kazan-canonical-1`** `TrainingSession` + `TrainingSessionCoachJournal` — `docs/TRAINING_JOURNAL_SEED_ALIGNMENT_PHASE_6F.md`. |

**Why end dual before model removal:** HTTP writes can be off while seeds still insert legacy journal rows — that **confuses** operators (“writes disabled but data appears”). Align seed policy **before or with** prod write-disable.

---

## E. Archive / retention decision (concrete)

**Recommended approach: export snapshot + DB retain-only until programmatic read retirement, then schema drop (optional migration branch).**

1. **Before** first **production** `DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`, run a **one-time export** of `TrainingJournal` (e.g. SQL `COPY`, `pg_dump` table slice, or small admin script) including `id`, `trainingId`, `coachId`, text fields, timestamps — store in org-approved storage with access controls.  
2. **Retain** rows in PostgreSQL **unchanged** (read-only operationally: no new writes via HTTP after step 4; seeds stopped per §D) until legacy **read** route is removed or replaced.  
3. **Later migration** into `TrainingSessionCoachJournal` **only** if product delivers an **explicit** mapping spec (no heuristic backfill in code without it).  
4. **If no migration:** drop table in step 9 after route removal and retention window.

**Why:** Minimizes **data-loss** risk, satisfies audit/debug needs, avoids premature deletion while headers and kill-switches roll out.

---

## F. Shutdown checklist

### F.1 Preconditions to **enable write kill-switch** in an environment

- [ ] `LOG_LEGACY_TRAINING_JOURNAL=1` sampling completed (if desired) and reviewed.  
- [ ] Staging run with `DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true` clean.  
- [ ] **Export** completed for **production** (if production).  
- [ ] Stakeholders notified; known API users (if any) informed of `403` + `LEGACY_TRAINING_JOURNAL_WRITES_DISABLED`.  
- [ ] Runbook: who toggles env and who monitors errors for 24–72h.

### F.2 Preconditions to **restrict legacy coach-detail GET** further (future read kill-switch or removal)

- [ ] Write kill-switch **on** in target env for agreed period without incident **or** independent proof of zero read traffic.  
- [ ] `LOG_LEGACY_COACH_TRAININGS_READ=1` (or access logs) shows acceptable volume.  
- [ ] Consumers confirmed migrated to `GET /api/coaches/[id]/trainings` **or** do not need journal embed.  
- [ ] Product approves **404/410** or route removal.

### F.3 Preconditions for **eventual `TrainingJournal` model removal**

- [ ] HTTP write routes **removed** or permanently disabled.  
- [ ] Legacy coach-detail **read** route **removed** or no longer embeds journal.  
- [ ] **No** `prisma.trainingJournal` in seeds/scripts/application code.  
- [ ] **Export** archived; retention period satisfied.  
- [ ] Migration tested; rollback DB plan exists.

---

## G. Rollback strategy

| Change | Rollback |
|--------|----------|
| **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`** | Set to false / unset; redeploy or env update — **immediate** restoration of HTTP writes. |
| **Seed flag** skipping legacy journal | Re-enable env or revert commit — restores demo rows on next seed. |
| **Read kill-switch / route removal** | Redeploy previous artifact with route + previous behavior — **emergency** only; prefer feature flag over delete until stable. |
| **Schema drop** | Restore DB from backup or run down migration — **last resort**; test on clone first. |

---

## H. Risks not resolved

- **Unknown clients** may fail silently on 403 until reported.  
- **seed-full** now includes a minimal canonical session journal row (**6F**); Moscow vs Kazan datasets still differ.  
- **Legacy `Training`** APIs remain; journal sunset does **not** retire full legacy training stack.

---

## I. Recommended next implementation phase

1. **Implement `SEED_LEGACY_TRAINING_JOURNAL`** (or equivalent) in `prisma/seed.ts` + document in `.env.example`.  
2. **Ops:** run export playbook once in staging.  
3. **Implement optional read kill-switch** env (6C §D) when product requests stricter than headers-only.  
4. **Schedule/player** legacy program — separate epic from journal-only work.
