# Legacy Journal Write Shutdown Readiness — Phase 6A

## A. Goal

Prepare for a **future** shutdown of **legacy** `TrainingJournal` **HTTP writes** (`POST` / `PUT` `/api/training-journal*`) **without** removing routes or the model in this phase. Deliver: audit, seed/archive policy, evidence checklist, and **opt-in** instrumentation — **no** breaking API changes by default.

Prerequisite: `docs/TRAINING_JOURNAL_FINAL_CLEANUP_PLAN_PHASE_5F.md`.

---

## B. Audit findings

### B.1 Legacy HTTP write paths (exact)

| Method | Path | Prisma op | RBAC |
|--------|------|-----------|------|
| `POST` | `/api/training-journal` | `trainingJournal.upsert` | `trainings` `edit` |
| `PUT` | `/api/training-journal/[id]` | `trainingJournal.update` by row `id` | `trainings` `edit` |

### B.2 Non-HTTP legacy journal writes (in-repo)

| Source | Mechanism | Still relevant after HTTP shutdown? |
|--------|-----------|-------------------------------------|
| **`prisma/seed.ts`** | `prisma.trainingJournal.upsert` (4 demo rows on `Training`) | **Yes** until seed policy stops legacy journal. |
| **`scripts/seed-full.js`** | `prisma.trainingJournal.upsert` (mozyakin, up to 3 rows) | **Same**. |

**Note:** Seed writes **bypass** HTTP. **Disabling HTTP alone** does not stop DB rows from appearing on `prisma db seed` / `seed-full.js`.

### B.3 In-repo **runtime** callers of legacy journal **HTTP**

| Consumer | Calls `training-journal`? |
|----------|---------------------------|
| CRM `src/app` | **No** (grep / Phase 5C). |
| `coach-app` / `parent-app` | **No** matches. |
| `scripts/crm-e2e-sanity.ts` | **No** `training-journal` HTTP. |

**Conclusion:** **No** active in-repo **HTTP** consumer of legacy journal writes. Residual risk = **external** clients + **seeds** (direct Prisma).

### B.4 Evidence missing before safe write shutdown

1. **Production (or staging) request logs** — volume and identity of callers to `POST`/`PUT` `/api/training-journal*`.  
2. **Stakeholder sign-off** that no integration relies on legacy journal HTTP.  
3. **Seed policy** decision — stop or gate legacy `trainingJournal` in `seed.ts` / `seed-full.js`.  
4. **Retention** decision for existing `TrainingJournal` rows (read-only period, export, eventual drop with migration).

---

## C. Current write-path status

| Path | Status (Phase 6A) |
|------|-------------------|
| **HTTP POST/PUT** | **Live**; documented **deprecated** for new use; **opt-in** log via `LOG_LEGACY_TRAINING_JOURNAL=1` (server stderr). |
| **Seeds** | **Unchanged** behavior; comments document **temporary** dual strategy vs session journal SSOT. |

**Write shutdown** (future phase) = combine: **HTTP 403/410 or feature flag**, **seed changes**, and **evidence** from §B.4 — **not** claimed complete in 6A.

---

## D. Seed policy recommendation

| Phase | Policy |
|-------|--------|
| **Now (6A)** | **Keep** legacy journal in seeds for **demo parity** with legacy `Training` rows and FK demos; **keep** `TrainingSessionCoachJournal` on `demo-mark-past-1` for CRM tab SSOT (Phase 5E). **Dual strategy is intentional** until legacy `Training` demo is retired. |
| **Target (pre HTTP shutdown)** | Introduce **`SEED_LEGACY_TRAINING_JOURNAL=false`** (or equivalent) to skip legacy journal upserts in **`prisma/seed.ts`** while optional. |
| **Target (post HTTP shutdown)** | **`seed-full.js`**: either add minimal `TrainingSession` + session journal **or** drop journal demo there; align with product. |

---

## E. Archive / retention recommendation (design only)

| Option | When to use |
|--------|-------------|
| **Retain + read-only HTTP** | After writes disabled, keep `GET` paths that embed journal (e.g. legacy coach list) for a **defined window** if any consumer still reads. |
| **Export** | Before table drop: CSV/JSON dump keyed by `trainingId` / `coachId` / timestamps. |
| **Later migration** | Product-approved mapping to `TrainingSessionCoachJournal` — **out of scope** for 6A; **no** heuristic backfill in code without spec. |

**Before write shutdown:** at minimum **document** who owns historical data and whether CRM needs a read-only “legacy journal” surface.

---

## F. Evidence still needed before shutdown

1. **Traffic evidence** for `POST`/`PUT` `/api/training-journal*`.  
2. **Seed** flag or removal plan signed off.  
3. **Archive/retention** owner and SLA.  
4. **Communication** to API consumers (if any) with deprecation timeline.

**Shutdown-ready:** **Not** claimed in Phase 6A.

---

## G. Recommended next implementation phase (6B+)

1. **Phase 6B (implemented):** env `DISABLE_LEGACY_TRAINING_JOURNAL_WRITES` — when truthy, **403** + stable `code` + `Deprecation` header on POST/PUT `/api/training-journal*`. See `docs/TRAINING_JOURNAL_HTTP_WRITE_KILLSWITCH_PHASE_6B.md`.  
2. **Logging:** enable `LOG_LEGACY_TRAINING_JOURNAL=1` in staging briefly to sample traffic before enabling the kill-switch.  
3. **Seeds:** implement env-guarded skip for legacy journal upserts (still recommended; not part of 6B HTTP guard).  
4. **Remove** HTTP routes only after **read** paths and data retention are resolved (later phase).

---

## Exact future cut step (HTTP writes)

1. Confirm §F evidence.  
2. Deploy **6B** flag default **false** in production (or hard-disable routes).  
3. Update seeds to **not** call `prisma.trainingJournal.create/upsert` (or guard).  
4. Monitor errors for 403/410.  
5. **Later:** deprecate reads + migrate/drop model per `TRAINING_JOURNAL_FINAL_CLEANUP_PLAN_PHASE_5F.md` §E.3.

**Separation:** **Write shutdown** ≠ **model removal** — model can remain with **no** HTTP writes while reads/embeds still exist.
