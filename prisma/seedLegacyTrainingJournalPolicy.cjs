/**
 * SINGLE SOURCE OF TRUTH — `SEED_LEGACY_TRAINING_JOURNAL` predicate.
 * Consumers: `prisma/seed.ts` (createRequire), `scripts/seed-full.js` (require).
 * Docs: docs/TRAINING_JOURNAL_SEED_POLICY_PHASE_6E.md, docs/TRAINING_JOURNAL_SEED_ALIGNMENT_PHASE_6F.md
 */

function shouldSeedLegacyTrainingJournal() {
  const v = process.env.SEED_LEGACY_TRAINING_JOURNAL;
  if (v == null || String(v).trim() === "") return true;
  const n = String(v).trim().toLowerCase();
  if (n === "0" || n === "false" || n === "no") return false;
  return true;
}

module.exports = { shouldSeedLegacyTrainingJournal };
