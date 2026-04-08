/**
 * Сценарии аудита Arena Intent Parser V1 (ground truth + сравнение с parseArenaIntent).
 * Запуск: npm run arena-intent-audit (из coach-app)
 */

import { detectArenaSentiment, normalizeArenaText } from "../lib/arena/arena-sentiment";
import type { ArenaIntent } from "../lib/arena/parse-arena-intent";
import { parseArenaIntent } from "../lib/arena/parse-arena-intent";

/** Типовой ростер для аудита (имена/номера как в реальных данных) */
export const AUDIT_ROSTER: {
  id: string;
  name: string;
  jerseyNumber?: number;
}[] = [
  { id: "p-mark", name: "Марк Голыш", jerseyNumber: 93 },
  { id: "p-grotov", name: "Иван Гротов", jerseyNumber: 17 },
  { id: "p-sidor", name: "Алексей Сидоров", jerseyNumber: 23 },
];

export type AuditGroup = "A_PLAYER" | "B_TEAM" | "C_AMBIGUOUS" | "D_MIXED" | "E_MULTI";

export type ExpectedIntentKind = ArenaIntent["kind"];

export type ArenaIntentAuditScenario = {
  id: string;
  group: AuditGroup;
  transcript: string;
  /** Ожидаемое «идеальное» поведение для сравнения (ручная разметка). */
  expected: {
    kind: ExpectedIntentKind;
    /** Для create_player_observation; null = без привязки (редко в V1) */
    playerId: string | null;
    sentiment: "positive" | "neutral" | "negative";
  };
  comment?: string;
};

export const ARENA_INTENT_AUDIT_SCENARIOS: ArenaIntentAuditScenario[] = [
  // --- A. PLAYER OBSERVATION ---
  {
    id: "A1",
    group: "A_PLAYER",
    transcript: "Марк поздно сел в колени",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "negative" },
  },
  {
    id: "A2",
    group: "A_PLAYER",
    transcript: "Голыш хорошо открылся",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "positive" },
  },
  {
    id: "A3",
    group: "A_PLAYER",
    transcript: "93-й снова потерял позицию",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "negative" },
    comment: "номер «93» без пробела до -й — проверка regex",
  },
  {
    id: "A4",
    group: "A_PLAYER",
    transcript: "Марк отлично прочитал момент",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "positive" },
  },
  {
    id: "A5",
    group: "A_PLAYER",
    transcript: "Гротов ошибка в зоне",
    expected: { kind: "create_player_observation", playerId: "p-grotov", sentiment: "negative" },
  },
  {
    id: "A6",
    group: "A_PLAYER",
    transcript: "номер 17 впереди всех",
    expected: { kind: "create_player_observation", playerId: "p-grotov", sentiment: "positive" },
  },
  {
    id: "A7",
    group: "A_PLAYER",
    transcript: "Сидоров не так закрыл",
    expected: { kind: "create_player_observation", playerId: "p-sidor", sentiment: "negative" },
  },
  {
    id: "A8",
    group: "A_PLAYER",
    transcript: "23 классно подключился",
    expected: { kind: "create_player_observation", playerId: "p-sidor", sentiment: "positive" },
  },
  // --- B. TEAM OBSERVATION ---
  {
    id: "B1",
    group: "B_TEAM",
    transcript: "команда сегодня медленно возвращается",
    expected: { kind: "create_team_observation", playerId: null, sentiment: "neutral" },
  },
  {
    id: "B2",
    group: "B_TEAM",
    transcript: "вся группа плохо держит темп",
    expected: { kind: "create_team_observation", playerId: null, sentiment: "negative" },
  },
  {
    id: "B3",
    group: "B_TEAM",
    transcript: "все хорошо включились в работу",
    expected: { kind: "create_team_observation", playerId: null, sentiment: "positive" },
  },
  {
    id: "B4",
    group: "B_TEAM",
    transcript: "команда молодцы в третьем",
    expected: { kind: "create_team_observation", playerId: null, sentiment: "positive" },
  },
  {
    id: "B5",
    group: "B_TEAM",
    transcript: "группа теряет концентрацию",
    expected: { kind: "create_team_observation", playerId: null, sentiment: "neutral" },
  },
  // --- C. AMBIGUOUS ---
  {
    id: "C1",
    group: "C_AMBIGUOUS",
    transcript: "хорошо сыграно",
    expected: { kind: "unknown", playerId: null, sentiment: "positive" },
  },
  {
    id: "C2",
    group: "C_AMBIGUOUS",
    transcript: "поздно",
    expected: { kind: "unknown", playerId: null, sentiment: "negative" },
  },
  {
    id: "C3",
    group: "C_AMBIGUOUS",
    transcript: "добавь это",
    expected: { kind: "unknown", playerId: null, sentiment: "neutral" },
  },
  {
    id: "C4",
    group: "C_AMBIGUOUS",
    transcript: "запиши момент",
    expected: { kind: "unknown", playerId: null, sentiment: "neutral" },
  },
  {
    id: "C5",
    group: "C_AMBIGUOUS",
    transcript: "смотри борт",
    expected: { kind: "unknown", playerId: null, sentiment: "neutral" },
  },
  {
    id: "C6",
    group: "C_AMBIGUOUS",
    transcript: "ещё раз",
    expected: { kind: "unknown", playerId: null, sentiment: "neutral" },
  },
  // --- D. MIXED / HARD ---
  {
    id: "D1",
    group: "D_MIXED",
    transcript: "Марк и Гротов оба поздно сели",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "negative" },
    comment: "идеал: оба игрока; V1 возьмёт одного",
  },
  {
    id: "D2",
    group: "D_MIXED",
    transcript: "17-й хорошо, а 23-й потерял игрока",
    expected: { kind: "create_player_observation", playerId: "p-grotov", sentiment: "negative" },
    comment: "идеал: два факта; V1 — первый номер в тексте",
  },
  {
    id: "D3",
    group: "D_MIXED",
    transcript: "команда хорошо, но концовка слабая",
    expected: { kind: "create_team_observation", playerId: null, sentiment: "negative" },
  },
  {
    id: "D4",
    group: "D_MIXED",
    transcript: "Марк классно, команда в целом нет",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "negative" },
    comment: "смешано: приоритет игрока в V1",
  },
  {
    id: "D5",
    group: "D_MIXED",
    transcript: "не успел закрыть как надо",
    expected: { kind: "unknown", playerId: null, sentiment: "negative" },
  },
  {
    id: "D6",
    group: "D_MIXED",
    transcript: "не хорошо в средней зоне",
    expected: { kind: "unknown", playerId: null, sentiment: "negative" },
  },
  {
    id: "D7",
    group: "D_MIXED",
    transcript: "бросок с клюшки вне игры",
    expected: { kind: "unknown", playerId: null, sentiment: "neutral" },
  },
  {
    id: "D8",
    group: "D_MIXED",
    transcript: "вброс выиграли, но поздно",
    expected: { kind: "unknown", playerId: null, sentiment: "negative" },
  },
  {
    id: "D9",
    group: "D_MIXED",
    transcript: "связка голыш гротов острая",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "neutral" },
    comment: "два фамилии подряд — кого первого матчит V1",
  },
  // --- E. MULTI-PLAYER ORDERING (V3) ---
  {
    id: "E1",
    group: "E_MULTI",
    transcript: "Марк и Гротов поздно сели",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "negative" },
    comment: "первый по тексту до «и»",
  },
  {
    id: "E2",
    group: "E_MULTI",
    transcript: "Голыш, Гротов — оба хорошо открылись",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "positive" },
    comment: "запятая, без союза «и» у второго имени",
  },
  {
    id: "E3",
    group: "E_MULTI",
    transcript: "17-й и 23-й не успели вернуться",
    expected: { kind: "create_player_observation", playerId: "p-grotov", sentiment: "negative" },
    comment: "первый номер в симметричной паре",
  },
  {
    id: "E4",
    group: "E_MULTI",
    transcript: "Гротов и Марк хорошо включились",
    expected: { kind: "create_player_observation", playerId: "p-grotov", sentiment: "positive" },
    comment: "инверсия: первым назван Гротов",
  },
  {
    id: "E5",
    group: "E_MULTI",
    transcript: "Марк, 17-й, хорошо",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "positive" },
    comment: "имя раньше чужого номера в тексте",
  },
  {
    id: "E6",
    group: "E_MULTI",
    transcript: "93-й и Голыш сильны в борьбе",
    expected: { kind: "create_player_observation", playerId: "p-mark", sentiment: "positive" },
    comment: "один игрок: схлопывание, primary по раннему упоминанию",
  },
];

function actualPlayerId(intent: ArenaIntent): string | null {
  if (intent.kind === "create_player_observation") return intent.playerId;
  return null;
}

function actualSentiment(intent: ArenaIntent, transcript: string): "positive" | "neutral" | "negative" {
  if (intent.kind === "unknown") {
    return detectArenaSentiment(normalizeArenaText(transcript));
  }
  return intent.sentiment ?? "neutral";
}

function intentsMatch(
  actual: ArenaIntent,
  exp: ArenaIntentAuditScenario["expected"],
  transcript: string
): boolean {
  if (actual.kind !== exp.kind) return false;
  const s = actualSentiment(actual, transcript);
  if (s !== exp.sentiment) return false;
  if (exp.kind === "create_player_observation" && actual.kind === "create_player_observation") {
    return actual.playerId === exp.playerId;
  }
  return true;
}

export type AuditRow = {
  scenario: ArenaIntentAuditScenario;
  actual: ArenaIntent;
  pass: boolean;
  failReason?: string;
};

export function runArenaIntentAudit(): {
  rows: AuditRow[];
  passCount: number;
  failCount: number;
  summary: string;
} {
  const rows: AuditRow[] = [];
  for (const sc of ARENA_INTENT_AUDIT_SCENARIOS) {
    const actual = parseArenaIntent({ transcript: sc.transcript, roster: AUDIT_ROSTER });
    const pass = intentsMatch(actual, sc.expected, sc.transcript);
    let failReason: string | undefined;
    if (!pass) {
      const parts: string[] = [];
      if (actual.kind !== sc.expected.kind) {
        parts.push(`kind: got ${actual.kind}, want ${sc.expected.kind}`);
      } else if (actualSentiment(actual, sc.transcript) !== sc.expected.sentiment) {
        parts.push(`sentiment: got ${actualSentiment(actual, sc.transcript)}, want ${sc.expected.sentiment}`);
      } else if (
        sc.expected.kind === "create_player_observation" &&
        actual.kind === "create_player_observation" &&
        actual.playerId !== sc.expected.playerId
      ) {
        parts.push(`playerId: got ${actual.playerId}, want ${sc.expected.playerId}`);
      }
      failReason = parts.join("; ");
    }
    rows.push({ scenario: sc, actual, pass, failReason });
  }
  const passCount = rows.filter((r) => r.pass).length;
  const failCount = rows.length - passCount;
  const summary = `PASS ${passCount} / ${rows.length}, FAIL ${failCount}`;
  return { rows, passCount, failCount, summary };
}

export function formatArenaIntentAuditMarkdown(): string {
  const { rows, summary } = runArenaIntentAudit();
  const lines: string[] = [
    "# Arena Intent Parser — audit run (sentiment V2 + primary player V3)",
    "",
    `**${summary}** (см. ground truth в scenarios.ts)`,
    "",
    "| ID | Group | Transcript | Expected kind / player / ~sentiment | Actual | Pass | Notes |",
    "|----|-------|------------|-------------------------------------|--------|------|-------|",
  ];
  for (const r of rows) {
    const s = r.scenario;
    const exp = `${s.expected.kind} · ${s.expected.playerId ?? "—"} · ${s.expected.sentiment}`;
    const lex = actualSentiment(r.actual, r.scenario.transcript);
    const act =
      r.actual.kind === "create_player_observation"
        ? `${r.actual.kind} · ${r.actual.playerId} · ${r.actual.sentiment ?? "neutral"} · conf ${r.actual.confidence}`
        : r.actual.kind === "create_team_observation"
          ? `${r.actual.kind} · ${r.actual.sentiment ?? "neutral"}`
          : `${r.actual.kind} · ~sentiment ${lex}`;
    const notes = [s.comment, r.failReason].filter(Boolean).join(" — ");
    lines.push(
      `| ${s.id} | ${s.group} | ${s.transcript.replace(/\|/g, "\\|")} | ${exp} | ${act.replace(/\|/g, "\\|")} | ${r.pass ? "✓" : "✗"} | ${notes.replace(/\|/g, "\\|")} |`
    );
  }
  return lines.join("\n");
}
