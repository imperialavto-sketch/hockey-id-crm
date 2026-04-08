/**
 * Dev: прогон Arena Candidate Resolution V1.
 * coach-app: npm run arena-resolution-audit
 */

import { runArenaResolutionAudit } from "./arena-candidate-resolution-v1";

const { rows, summary } = runArenaResolutionAudit();

console.log("\n=== Arena Candidate Resolution V1 (dev) ===\n");
console.log(summary + "\n");

for (const r of rows) {
  const mark = r.pass ? "PASS" : "FAIL";
  const s = r.scenario;
  console.log(`[${s.id}] ${mark}`);
  console.log(`  transcript: "${s.input.transcript}"`);
  console.log(`  candidates: ${s.input.candidates.length}`);
  console.log(`  expected summary:`, s.expectedSummary);
  console.log(`  actual summary:  `, r.result.summary);
  console.log(`  item kinds:`, r.result.items.map((x) => x.kind).join(", "));
  if (s.comment) console.log(`  note: ${s.comment}`);
  if (!r.pass) console.log(`  FAIL: ${r.failReason}`);
  console.log("");
}
