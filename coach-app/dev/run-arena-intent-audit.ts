/**
 * Локальный audit harness для parseArenaIntent (без Jest).
 * Запуск из каталога coach-app: npm run arena-intent-audit
 */

import { formatArenaIntentAuditMarkdown, runArenaIntentAudit } from "./arena-intent-parser-v1-scenarios";

const { rows, summary } = runArenaIntentAudit();

console.log("\n=== Arena Intent Parser — audit (V2 sentiment + V3 primary) ===\n");
console.log(summary + "\n");

for (const r of rows) {
  const mark = r.pass ? "PASS" : "FAIL";
  const s = r.scenario;
  console.log(
    `[${s.id}] ${mark}  ${s.group}\n  "${s.transcript}"\n  expected: ${JSON.stringify(s.expected)}\n  actual:   ${JSON.stringify(r.actual)}`
  );
  if (!r.pass && r.failReason) console.log(`  reason: ${r.failReason}`);
  console.log("");
}

console.log("--- Markdown (paste into docs) ---\n");
console.log(formatArenaIntentAuditMarkdown());
