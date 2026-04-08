# Legacy Journal Seed Policy — Phase 6E

## A. Goal

Add an **environment-controlled** policy for **`TrainingJournal`** rows created **only in seeds** (`prisma/seed.ts`, `scripts/seed-full.js`), so operators can align seeding with the **sunset execution plan** without deleting routes/models and **without** changing Next.js API runtime behavior.

Execution plan context: `docs/TRAINING_JOURNAL_SUNSET_EXECUTION_PLAN_PHASE_6D.md`.

---

## B. Audit findings (pre-implementation)

| Location | Legacy `TrainingJournal` | `TrainingSessionCoachJournal` |
|----------|-------------------------|------------------------------|
| **`prisma/seed.ts`** | Four `upsert` calls inside the demo `legacyTrainings` loop (one per created `Training`). | One `upsert` on `demo-mark-past-1` (demo coach). |
| **`scripts/seed-full.js`** | Up to three `upsert` for mozyakin on existing `Training` rows. | None (no `TrainingSession` in script). |

**Default before 6E:** legacy journal rows always seeded when the respective loops ran.

---

## C. Env flag semantics

| Variable | Meaning |
|----------|---------|
| **`SEED_LEGACY_TRAINING_JOURNAL`** | **Unset or empty** → **seed** legacy `TrainingJournal` (unchanged from pre-6E default). **`0`**, **`false`**, or **`no`** (trimmed, case-insensitive) → **skip** all legacy `TrainingJournal` upserts in **both** seed entrypoints. Any other non-empty value (e.g. `1`, `true`, `yes`) → **seed**. |

**Single source of truth:** `prisma/seedLegacyTrainingJournalPolicy.cjs` — loaded by `prisma/seed.ts` via `createRequire` and by `scripts/seed-full.js` via `require`. Phase **6F** alignment: `docs/TRAINING_JOURNAL_SEED_ALIGNMENT_PHASE_6F.md`.

---

## D. Default seed behavior

- **Default = legacy journal ON** — `SEED_LEGACY_TRAINING_JOURNAL` unset preserves historical `db:seed` / `seed-full` usefulness and avoids surprising empty legacy journal embeds in demos that still use legacy `Training` APIs.
- **`prisma/seed.ts`:** Demo **`Training`** rows (DEMO: …) are **always** created; only **`trainingJournal.upsert`** is conditional.
- **`trainingSessionCoachJournal`** in **`prisma/seed.ts`** is **always** upserted — **not** gated by `SEED_LEGACY_TRAINING_JOURNAL` (session SSOT for CRM tab).

---

## E. Future shutdown-aligned behavior

- CI/staging/prod-like environments that run `prisma db seed` can set **`SEED_LEGACY_TRAINING_JOURNAL=false`** to match **`DISABLE_LEGACY_TRAINING_JOURNAL_WRITES=true`** (HTTP) so new environments do not accumulate legacy journal rows while the contour is retired.
- **Full seed script** (`seed-full.js`) follows the **same** flag so behavior is consistent.
- **Not** the same as HTTP kill-switch execution — ops enables flags per **6D** sequence.

---

## F. Risks not resolved

- **Existing DB rows** from prior seeds are **not** deleted when the flag is false (no destructive cleanup).  
- **Moscow vs Kazan** demo datasets remain different; see **6F** for canonical session row in `seed-full`.

---

## G. Recommended next phase

1. **Phase 6F** — `seed-full` alignment: `docs/TRAINING_JOURNAL_SEED_ALIGNMENT_PHASE_6F.md`.  
2. Proceed with **6D** sequence steps (logging → HTTP write-off → export → …).  
3. Optional: CI sets **`SEED_LEGACY_TRAINING_JOURNAL=false`** when canonical-only demo is sufficient.
