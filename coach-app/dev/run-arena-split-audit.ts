/**
 * Dev: прогон сценариев split-arena-observations-v1.
 * coach-app: npm run arena-split-audit
 */

import { runArenaSplitAudit, splitArenaObservations } from "./split-arena-observations-v1";

const { rows, summary } = runArenaSplitAudit();

console.log("\n=== Arena Observation Splitter V1 (dev) ===\n");
console.log(summary + "\n");

for (const r of rows) {
  const mark = r.pass ? "PASS" : "FAIL";
  console.log(`[${r.scenario.id}] ${mark}  ${r.scenario.category}\n  "${r.scenario.transcript}"`);
  console.log(`  expected: ${JSON.stringify(r.scenario.expectedTexts)}`);
  console.log(`  actual:   ${JSON.stringify(r.actual)}`);
  if (r.scenario.note) console.log(`  note: ${r.scenario.note}`);
  console.log("");
}

console.log("--- spot check ---\n");
console.log(
  splitArenaObservations({
    transcript: "17-й хорошо, а 23-й потерял игрока",
  })
);
