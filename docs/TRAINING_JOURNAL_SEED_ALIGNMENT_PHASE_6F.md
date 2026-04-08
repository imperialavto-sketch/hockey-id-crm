# Training Journal Seed Alignment — Phase 6F

## A. Goal

Remove **silent divergence** between `prisma/seed.ts` and `scripts/seed-full.js` for **`SEED_LEGACY_TRAINING_JOURNAL`**, and align **`seed-full.js`** with the **canonical** session + session-journal model so `npm run db:seed:full` produces a **minimal, deterministic** CRM-relevant journal row — **without** removing legacy seeding, **without** API/runtime changes, **without** schema migrations or backfill.

Prior art: Phase **6E** (`docs/TRAINING_JOURNAL_SEED_POLICY_PHASE_6E.md`).

---

## B. Audit findings

| Topic | Before 6F |
|-------|-----------|
| **Predicate** | Duplicated in `seed-full.js`; `prisma/seed.ts` imported `.ts` helper — two sources of truth. |
| **`seed-full.js`** | Legacy `Training` + optional `TrainingJournal`; **no** `TrainingSession` / `TrainingSessionCoachJournal`. |
| **`prisma/seed.ts`** | Legacy DEMO `Training` + optional `TrainingJournal` + `TrainingSessionCoachJournal` on `demo-mark-past-1`. |
| **Risk** | Developers running only `db:seed:full` saw **empty** canonical coach journal tab; policy could drift if one file changed. |

---

## C. Chosen strategy — **OPTION 1** (recommended)

**Align `seed-full.js` with the canonical system.**

**Why not OPTION 2:** OPTION 2 would leave `seed-full` as legacy-only and **document** misalignment — acceptable short-term but **increases** support cost and contradicts the goal of predictable developer experience before environment shutdown (Phase **6D**).

**OPTION 1 delivers:**

- One **SSOT** predicate: `prisma/seedLegacyTrainingJournalPolicy.cjs` (CommonJS, `require` from Node and `createRequire` from `prisma/seed.ts`).
- **`seed-full.js`** always upserts **one** fixed `TrainingSession` id **`seed-full-kazan-canonical-1`** (Мозякин + main Kazan team) and **one** `TrainingSessionCoachJournal` row — **no** mapping to legacy `Training` ids (no heuristic).
- Legacy **`Training`** + conditional **`TrainingJournal`** **unchanged** in intent (still seeded; still behind `SEED_LEGACY_TRAINING_JOURNAL`).

---

## D. Final seed behavior matrix

| Artifact | `prisma/seed.ts` (`db:seed`) | `scripts/seed-full.js` (`db:seed:full`) |
|----------|------------------------------|----------------------------------------|
| **Policy SSOT** | `prisma/seedLegacyTrainingJournalPolicy.cjs` | Same `.cjs` via `require` |
| **Legacy `Training`** | DEMO rows (Hockey Academy Moscow path) | Kazan team trainings (existing script) |
| **Legacy `TrainingJournal`** | If `SEED_LEGACY_TRAINING_JOURNAL` not false | Same flag |
| **`TrainingSession` (canonical demo)** | Many `demo-*` templates + foundation | **One** id: `seed-full-kazan-canonical-1` |
| **`TrainingSessionCoachJournal`** | `demo-mark-past-1` + demo coach | `seed-full-kazan-canonical-1` + Мозякин |

**Id collision:** Kazan seed uses **`seed-full-kazan-canonical-1`**; Moscow demo uses **`demo-*`** — **no** overlap by design.

---

## E. Policy consistency rules

1. **Never** copy/paste `shouldSeedLegacyTrainingJournal` into application code — edit **`prisma/seedLegacyTrainingJournalPolicy.cjs` only**.  
2. **`prisma/seed.ts`** must use `createRequire(import.meta.url)` to load the `.cjs` (tsx + CJS interop).  
3. **Session journal** in `seed-full` is **not** gated by `SEED_LEGACY_TRAINING_JOURNAL` (canonical SSOT; mirrors `prisma/seed.ts` where session journal is always seeded).  
4. **Changing** env semantics requires updating **6E** doc + this file + `.env.example`.

---

## F. Risks not resolved

- **`import.meta.url`** in `prisma/seed.ts` depends on **tsx** / ESM execution — if seed runner changes, revisit `createRequire` path.  
- **Two seed entrypoints** still produce **different** demo worlds (Moscow vs Kazan) — alignment is **policy + canonical journal presence**, not identical row counts.  
- **Full** parity with `prisma/seed.ts` session templates is **out of scope** (minimal row only).

---

## G. Recommended next phase

Execute **Phase 6D** operational steps (HTTP write kill-switch in prod, `SEED_LEGACY_TRAINING_JOURNAL=false` in CI as appropriate, export, etc.). No further seed-structure work is required for journal alignment before that.
