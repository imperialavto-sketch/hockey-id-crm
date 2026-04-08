/**
 * Dev: прогон Arena Multi-Intent Adapter V1.
 * coach-app: npm run arena-multi-intent-audit
 */

import { runArenaMultiIntentAudit } from "./arena-multi-intent-adapter-v1";

const { rows, summary } = runArenaMultiIntentAudit();

console.log("\n=== Arena Multi-Intent Adapter V1 (dev) ===\n");
console.log(summary + "\n");

for (const r of rows) {
  const mark = r.pass ? "PASS" : "FAIL";
  const s = r.scenario;
  console.log(`[${s.id}] ${mark}  ${mark === "FAIL" ? r.failReason ?? "" : ""}`);
  console.log(`  transcript: "${s.transcript}"`);
  console.log(`  segments (${r.segments.length}):`, JSON.stringify(r.segments));
  console.log(
    `  intents:`,
    JSON.stringify(
      r.candidates.map((c) => ({
        kind: c.intent.kind,
        playerId: c.intent.kind === "create_player_observation" ? c.intent.playerId : undefined,
      }))
    )
  );
  if (s.comment) console.log(`  note: ${s.comment}`);
  console.log("");
}
