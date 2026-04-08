/**
 * Arena Multi-Intent Adapter V1 — dev-only prototype.
 * Не подключать к useArenaVoiceAssistant / production flow.
 *
 * split → parseArenaIntent по сегментам → массив кандидатов (контракт ArenaIntent не меняется).
 */

import type { ArenaIntent } from "../lib/arena/parse-arena-intent";
import { parseArenaIntent } from "../lib/arena/parse-arena-intent";
import { splitArenaObservations } from "./split-arena-observations-v1";

export type ArenaMultiIntentInput = {
  transcript: string;
  roster: {
    id: string;
    name: string;
    jerseyNumber?: number;
  }[];
};

export type ArenaIntentCandidate = {
  segmentText: string;
  segmentIndex: number;
  intent: ArenaIntent;
};

/**
 * 1) splitArenaObservations  2) parseArenaIntent на каждый сегмент  3) порядок сохраняется, merge нет.
 */
export function parseArenaMultiIntentPrototype(
  input: ArenaMultiIntentInput
): ArenaIntentCandidate[] {
  const trimmed = input.transcript.trim();
  if (!trimmed) return [];

  const segments = splitArenaObservations({ transcript: trimmed });
  return segments.map((seg) => ({
    segmentText: seg.text,
    segmentIndex: seg.index,
    intent: parseArenaIntent({
      transcript: seg.text,
      roster: input.roster,
    }),
  }));
}

// --- Dev audit scenarios (типовой ростер как в parser audit) ---

export type ArenaMultiIntentScenario = {
  id: string;
  transcript: string;
  /** Ожидаемое число кандидатов (= сегментов после split) */
  expectedCount: number;
  /** Опционально: ожидаемые kind по порядку */
  expectedKinds?: ArenaIntent["kind"][];
  /** Опционально: playerId для create_player_observation по индексу */
  expectedPlayerIds?: (string | null)[];
  comment?: string;
};

/** Тот же ростер, что в arena-intent-parser-v1-scenarios */
export const MULTI_INTENT_AUDIT_ROSTER: ArenaMultiIntentInput["roster"] = [
  { id: "p-mark", name: "Марк Голыш", jerseyNumber: 93 },
  { id: "p-grotov", name: "Иван Гротов", jerseyNumber: 17 },
  { id: "p-sidor", name: "Алексей Сидоров", jerseyNumber: 23 },
];

export const ARENA_MULTI_INTENT_SCENARIOS: ArenaMultiIntentScenario[] = [
  {
    id: "MI01",
    transcript: "Марк поздно сел в колени",
    expectedCount: 1,
    expectedKinds: ["create_player_observation"],
    expectedPlayerIds: ["p-mark"],
    comment: "single segment, один игрок",
  },
  {
    id: "MI02",
    transcript: "17-й хорошо, а 23-й потерял игрока",
    expectedCount: 2,
    expectedKinds: ["create_player_observation", "create_player_observation"],
    expectedPlayerIds: ["p-grotov", "p-sidor"],
    comment: "контраст «, а » — два игрока",
  },
  {
    id: "MI03",
    transcript: "команда хорошо, но концовка слабая",
    expectedCount: 2,
    expectedKinds: ["create_team_observation", "unknown"],
    comment: "team + второй кусок без team/player",
  },
  {
    id: "MI04",
    transcript: "Марк и Гротов оба поздно сели",
    expectedCount: 1,
    expectedKinds: ["create_player_observation"],
    expectedPlayerIds: ["p-mark"],
    comment: "splitter не режет пару «и» — один primary",
  },
  {
    id: "MI05",
    transcript: "запиши момент",
    expectedCount: 1,
    expectedKinds: ["unknown"],
    comment: "один unknown",
  },
  {
    id: "MI06",
    transcript: "хорошо сыграно; добавь это",
    expectedCount: 2,
    expectedKinds: ["unknown", "unknown"],
    comment: "два unknown после «;»",
  },
  {
    id: "MI07",
    transcript: "Гротов ошибка в зоне; Сидоров классно подключился",
    expectedCount: 2,
    expectedKinds: ["create_player_observation", "create_player_observation"],
    expectedPlayerIds: ["p-grotov", "p-sidor"],
    comment: "два игрока через точку с запятой",
  },
  {
    id: "MI08",
    transcript: "Марк отлично в зоне, 93-й ошибся на сине",
    expectedCount: 2,
    expectedKinds: ["create_player_observation", "create_player_observation"],
    expectedPlayerIds: ["p-mark", "p-mark"],
    comment: "один и тот же игрок в двух сегментах — риск дублей в продукте",
  },
  {
    id: "MI09",
    transcript: "команда плохо в зоне; Марк молодец в борьбе",
    expectedCount: 2,
    expectedKinds: ["create_team_observation", "create_player_observation"],
    expectedPlayerIds: [null, "p-mark"],
    comment: "team затем игрок",
  },
  {
    id: "MI10",
    transcript: "все хорошо включились, а Марк поздно сел",
    expectedCount: 2,
    expectedKinds: ["create_team_observation", "create_player_observation"],
    expectedPlayerIds: [null, "p-mark"],
    comment: "«все» + контраст с игроком",
  },
  {
    id: "MI11",
    transcript: "молодцы, ребята, так держать",
    expectedCount: 1,
    expectedKinds: ["unknown"],
    comment: "перечисление без split — один сегмент, не team (нет маркера команда/группа/все)",
  },
  {
    id: "MI12",
    transcript: "один хорошо, а второй плохо, а третий нормально",
    expectedCount: 3,
    expectedKinds: ["unknown", "unknown", "unknown"],
    comment: "тройной контраст — нет имён в ростере",
  },
  {
    id: "MI13",
    transcript: "",
    expectedCount: 0,
    comment: "пустой transcript",
  },
  {
    id: "MI14",
    transcript: "17-й и 23-й не успели вернуться",
    expectedCount: 2,
    expectedKinds: ["create_player_observation", "create_player_observation"],
    expectedPlayerIds: ["p-grotov", "p-sidor"],
    comment: "jersey+jersey split — общая оценка на хвосте у второго сегмента",
  },
  {
    id: "MI15",
    transcript: "Марк классно, команда в целом нет",
    expectedCount: 1,
    expectedKinds: ["create_player_observation"],
    expectedPlayerIds: ["p-mark"],
    comment: "запятая без паттерна split — остаётся один intent (player wins over team)",
  },
];

function playerIdOf(intent: ArenaIntent): string | null {
  if (intent.kind === "create_player_observation") return intent.playerId;
  return null;
}

function scenarioPasses(
  scenario: ArenaMultiIntentScenario,
  candidates: ArenaIntentCandidate[]
): { pass: boolean; reason?: string } {
  if (candidates.length !== scenario.expectedCount) {
    return {
      pass: false,
      reason: `count: got ${candidates.length}, want ${scenario.expectedCount}`,
    };
  }

  if (scenario.expectedKinds) {
    for (let i = 0; i < scenario.expectedKinds.length; i++) {
      const want = scenario.expectedKinds[i]!;
      const got = candidates[i]?.intent.kind;
      if (got !== want) {
        return { pass: false, reason: `kind[${i}]: got ${got}, want ${want}` };
      }
    }
  }

  if (scenario.expectedPlayerIds) {
    for (let i = 0; i < scenario.expectedPlayerIds.length; i++) {
      const want = scenario.expectedPlayerIds[i];
      if (want === undefined) continue;
      const got = playerIdOf(candidates[i]!.intent);
      if (got !== want) {
        return { pass: false, reason: `playerId[${i}]: got ${got}, want ${want}` };
      }
    }
  }

  return { pass: true };
}

export type ArenaMultiIntentAuditRow = {
  scenario: ArenaMultiIntentScenario;
  candidates: ArenaIntentCandidate[];
  segments: string[];
  pass: boolean;
  failReason?: string;
};

export function runArenaMultiIntentAudit(): {
  rows: ArenaMultiIntentAuditRow[];
  passCount: number;
  failCount: number;
  summary: string;
} {
  const rows: ArenaMultiIntentAuditRow[] = [];
  for (const sc of ARENA_MULTI_INTENT_SCENARIOS) {
    const candidates = parseArenaMultiIntentPrototype({
      transcript: sc.transcript,
      roster: MULTI_INTENT_AUDIT_ROSTER,
    });
    const segments = candidates.map((c) => c.segmentText);
    const { pass, reason } = scenarioPasses(sc, candidates);
    rows.push({
      scenario: sc,
      candidates,
      segments,
      pass,
      failReason: pass ? undefined : reason,
    });
  }
  const passCount = rows.filter((r) => r.pass).length;
  const failCount = rows.length - passCount;
  return {
    rows,
    passCount,
    failCount,
    summary: `PASS ${passCount} / ${rows.length}, FAIL ${failCount}`,
  };
}

/*
 * --- Design notes ---
 *
 * Полезно уже сейчас: когда в фразе явные разделители ( «, а », «, но », «;», «, N-й» )
 * и нужен черновик списка наблюдений для прототипа UI или офлайн-разбор сессии.
 *
 * Дубли / ложные split: один игрок в двух сегментах (MI08); «17-й и 23-й» режет даже если
 * смысл — одна оценка пары; второй сегмент без субъекта («концовка слабая») даёт unknown.
 *
 * До production: политика merge/dedupe по playerId+time, opt-in split из настроек,
 * метрики качества на реальных транскриптах, согласование с голосовым UX (подтверждение списка).
 */
