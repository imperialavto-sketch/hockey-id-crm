# Legacy Journal HTTP Write Kill-Switch — Phase 6B

## A. Goal

Provide an **environment-controlled** shutdown for **only** legacy journal **HTTP writes**:

- `POST /api/training-journal`
- `PUT /api/training-journal/[id]`

**Without** deleting routes or the `TrainingJournal` model, **without** changing **Prisma seed** scripts, and **without** schema migrations.

Prerequisite: `docs/TRAINING_JOURNAL_WRITE_SHUTDOWN_READINESS_PHASE_6A.md`.

---

## B. Audit findings

| Topic | Detail |
|-------|--------|
| **Current write behavior (flag off)** | Same as before Phase 6B: RBAC `trainings.edit` → upsert/update → JSON body + optional `LOG_LEGACY_TRAINING_JOURNAL` stderr log. |
| **Permission path** | `requirePermission(req, "trainings", "edit")` runs **first**; kill-switch runs **after** so unauthenticated callers still receive auth/RBAC responses before the kill-switch body. |
| **Guard placement** | Shared helper `src/lib/api/legacyTrainingJournalWriteGuard.ts`; early return in each handler after RBAC. |
| **Response when disabled** | **403** + JSON `{ error, code }` + header **`Deprecation: true`** (RFC 8594). Consistent for POST and PUT. |

---

## C. Env flag semantics

| Variable | Meaning |
|----------|---------|
| **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES`** | When set to a **truthy** string (`1`, `true`, `yes`, case-insensitive after trim), **HTTP** POST/PUT to `/api/training-journal*` return **403** and do **not** touch the database. |
| **Unset, empty, or other values** | Writes **allowed** (legacy behavior). |

**Production shutdown is not automatic:** the flag must be set in the deployment environment. **Having the code path does not imply production is off.**

---

## D. Route behavior when enabled vs disabled

| Flag | POST `/api/training-journal` | PUT `/api/training-journal/[id]` |
|------|------------------------------|----------------------------------|
| **Disabled / unset** | Upsert → 200 + journal JSON (or 4xx/5xx as before). | Update → 200 + journal JSON (or 4xx/5xx as before). |
| **`1` / `true` / `yes`** | After RBAC: **403** + `code: LEGACY_TRAINING_JOURNAL_WRITES_DISABLED` + `Deprecation: true`. No Prisma write. | Same. |

---

## E. What remains outside scope

| Item | Note |
|------|------|
| **`prisma/seed.ts` / `scripts/seed-full.js`** | Still call `prisma.trainingJournal.*` directly — **unchanged**. |
| **`TrainingJournal` model & table** | Still present; reads and legacy list embeds **unchanged**. |
| **`GET` / legacy coach trainings** | Unchanged. |
| **External callers** | Must observe **403** + `code` when flag is on; no in-repo guarantee they handle it. |

**HTTP write shutdown ≠ seed shutdown ≠ model removal** (see Phase 5F §E and Phase 6A).

---

## F. Risks not resolved

- Clients that ignore `code` may only show generic HTTP errors.  
- Operators may forget to set the flag in all app instances.  
- Seeds can still create rows that **read** paths expose while HTTP writes are blocked — **intentional** until a seed policy phase.

---

## G. Recommended next phase

1. Set flag in **staging**, monitor logs, then **production** after evidence (Phase 6A §F).  
2. Optional: env-guard **seed** legacy journal upserts (`SEED_LEGACY_TRAINING_JOURNAL=0`).  
3. Later: remove routes / drop model per sunset plan after retention and reads are addressed.
