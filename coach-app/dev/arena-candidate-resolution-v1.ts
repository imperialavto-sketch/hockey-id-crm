/**
 * Arena Candidate Resolution Policy V1 — dev-only.
 * Не подключать к production / useArenaVoiceAssistant.
 *
 * Политика поверх массива candidate intents: keep / merge / ambiguous.
 */

import type { ArenaIntent } from "../lib/arena/parse-arena-intent";
import type { ArenaIntentCandidate } from "./arena-multi-intent-adapter-v1";

export type { ArenaIntentCandidate };

export type ArenaResolutionInput = {
  transcript: string;
  candidates: ArenaIntentCandidate[];
};

export type ArenaResolvedCandidate =
  | {
      kind: "keep";
      reason: string;
      candidate: ArenaIntentCandidate;
    }
  | {
      kind: "merge";
      reason: string;
      sourceIndexes: number[];
      mergedIntoIndex: number;
    }
  | {
      kind: "ambiguous";
      reason: string;
      candidate: ArenaIntentCandidate;
    };

export type ArenaResolutionResult = {
  items: ArenaResolvedCandidate[];
  summary: {
    kept: number;
    merged: number;
    ambiguous: number;
  };
};

const REASON = {
  clean: "отдельное наблюдение без конфликтующих правил V1",
  duplicatePlayer:
    "два соседних сегмента — один и тот же playerId; стабильная политика V1: merge в первый",
  sharedPair:
    "транскрипт вида «N-й и M-й …» — общая оценка пары; требуется review",
  teamContinuation:
    "продолжение team-контраста во втором сегменте (unknown); возможная одна оценка команды",
  explicitSplit:
    "явное разделение (; / контраст / разные игроки) — keep",
} as const;

/** Старт транскрипта как «N-й и M-й» (тот же узор, что в splitter). */
const SHARED_PAIR_TRANSCRIPT_RE = /^\s*\d{1,2}-[йя]\s+и\s+\d{1,2}-[йя]/i;

function isPlayerIntent(intent: ArenaIntent): intent is Extract<
  ArenaIntent,
  { kind: "create_player_observation" }
> {
  return intent.kind === "create_player_observation";
}

function isDuplicateAdjacentPlayer(a: ArenaIntentCandidate, b: ArenaIntentCandidate): boolean {
  if (!isPlayerIntent(a.intent) || !isPlayerIntent(b.intent)) return false;
  const ida = a.intent.playerId;
  const idb = b.intent.playerId;
  if (!ida || !idb || ida !== idb) return false;
  return b.segmentIndex === a.segmentIndex + 1;
}

function isSharedPairCase(
  transcript: string,
  a: ArenaIntentCandidate,
  b: ArenaIntentCandidate
): boolean {
  if (!SHARED_PAIR_TRANSCRIPT_RE.test(transcript.trim())) return false;
  if (!isPlayerIntent(a.intent) || !isPlayerIntent(b.intent)) return false;
  if (!a.intent.playerId || !b.intent.playerId) return false;
  return a.intent.playerId !== b.intent.playerId;
}

const TEAM_CONTINUATION_TEXT_RE =
  /концовк|слаб|темп|просел|упал|вял|провал|слабо|слабая|слабый|догон/i;

function isTeamContinuation(a: ArenaIntentCandidate, b: ArenaIntentCandidate): boolean {
  if (a.intent.kind !== "create_team_observation") return false;
  if (b.intent.kind !== "unknown") return false;
  const t = b.segmentText.trim();
  if (t.length === 0) return false;
  return TEAM_CONTINUATION_TEXT_RE.test(t);
}

export function resolveArenaIntentCandidatesV1(input: ArenaResolutionInput): ArenaResolutionResult {
  const transcript = input.transcript.trim();
  const candidates = input.candidates;
  const items: ArenaResolvedCandidate[] = [];
  let kept = 0;
  let merged = 0;
  let ambiguous = 0;

  const n = candidates.length;
  let i = 0;
  while (i < n) {
    if (i + 1 < n) {
      const a = candidates[i]!;
      const b = candidates[i + 1]!;

      if (isSharedPairCase(transcript, a, b)) {
        items.push({
          kind: "ambiguous",
          reason: REASON.sharedPair,
          candidate: a,
        });
        items.push({
          kind: "ambiguous",
          reason: REASON.sharedPair,
          candidate: b,
        });
        ambiguous += 2;
        i += 2;
        continue;
      }

      if (isDuplicateAdjacentPlayer(a, b)) {
        items.push({
          kind: "merge",
          reason: REASON.duplicatePlayer,
          sourceIndexes: [i, i + 1],
          mergedIntoIndex: i,
        });
        merged += 1;
        i += 2;
        continue;
      }

      if (isTeamContinuation(a, b)) {
        items.push({
          kind: "keep",
          reason: REASON.teamContinuation + " (первый сегмент)",
          candidate: a,
        });
        items.push({
          kind: "ambiguous",
          reason: REASON.teamContinuation,
          candidate: b,
        });
        kept += 1;
        ambiguous += 1;
        i += 2;
        continue;
      }
    }

    items.push({
      kind: "keep",
      reason: REASON.clean,
      candidate: candidates[i]!,
    });
    kept += 1;
    i += 1;
  }

  return {
    items,
    summary: { kept, merged, ambiguous },
  };
}

// --- Dev audit ---

export type ArenaResolutionScenario = {
  id: string;
  input: ArenaResolutionInput;
  expectedSummary: ArenaResolutionResult["summary"];
  expectedItemKinds: Array<"keep" | "merge" | "ambiguous">;
  comment?: string;
};

function playerCand(
  text: string,
  idx: number,
  playerId: string | null
): ArenaIntentCandidate {
  return {
    segmentText: text,
    segmentIndex: idx,
    intent: {
      kind: "create_player_observation",
      playerId,
      confidence: 0.85,
      sentiment: "neutral",
      text,
    },
  };
}

function teamCand(text: string, idx: number): ArenaIntentCandidate {
  return {
    segmentText: text,
    segmentIndex: idx,
    intent: { kind: "create_team_observation", text, sentiment: "neutral" },
  };
}

function unknownCand(text: string, idx: number): ArenaIntentCandidate {
  return {
    segmentText: text,
    segmentIndex: idx,
    intent: { kind: "unknown", text },
  };
}

export const ARENA_RESOLUTION_SCENARIOS: ArenaResolutionScenario[] = [
  {
    id: "RS01",
    input: {
      transcript: "Марк поздно сел",
      candidates: [playerCand("Марк поздно сел", 0, "p-mark")],
    },
    expectedSummary: { kept: 1, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep"],
    comment: "один кандидат",
  },
  {
    id: "RS02",
    input: {
      transcript: "17-й хорошо, а 23-й потерял игрока",
      candidates: [
        playerCand("17-й хорошо", 0, "p-grotov"),
        playerCand("23-й потерял игрока", 1, "p-sidor"),
      ],
    },
    expectedSummary: { kept: 2, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep", "keep"],
    comment: "два разных игрока — оба keep",
  },
  {
    id: "RS03",
    input: {
      transcript: "Марк отлично в зоне, 93-й ошибся на сине",
      candidates: [
        playerCand("Марк отлично в зоне", 0, "p-mark"),
        playerCand("93-й ошибся на сине", 1, "p-mark"),
      ],
    },
    expectedSummary: { kept: 0, merged: 1, ambiguous: 0 },
    expectedItemKinds: ["merge"],
    comment: "duplicate player rule → merge в первый индекс",
  },
  {
    id: "RS04",
    input: {
      transcript: "17-й и 23-й не успели вернуться",
      candidates: [
        playerCand("17-й", 0, "p-grotov"),
        playerCand("23-й не успели вернуться", 1, "p-sidor"),
      ],
    },
    expectedSummary: { kept: 0, merged: 0, ambiguous: 2 },
    expectedItemKinds: ["ambiguous", "ambiguous"],
    comment: "shared-pair шаблон — оба ambiguous",
  },
  {
    id: "RS05",
    input: {
      transcript: "команда хорошо, но концовка слабая",
      candidates: [
        teamCand("команда хорошо", 0),
        unknownCand("концовка слабая", 1),
      ],
    },
    expectedSummary: { kept: 1, merged: 0, ambiguous: 1 },
    expectedItemKinds: ["keep", "ambiguous"],
    comment: "team continuation → второй сегмент ambiguous",
  },
  {
    id: "RS06",
    input: {
      transcript: "команда хорошо, но темп просел",
      candidates: [teamCand("команда хорошо", 0), unknownCand("темп просел", 1)],
    },
    expectedSummary: { kept: 1, merged: 0, ambiguous: 1 },
    expectedItemKinds: ["keep", "ambiguous"],
    comment: "team + unknown с темпом",
  },
  {
    id: "RS07",
    input: {
      transcript: "Гротов ошибка в зоне; Сидоров классно подключился",
      candidates: [
        playerCand("Гротов ошибка в зоне", 0, "p-grotov"),
        playerCand("Сидоров классно подключился", 1, "p-sidor"),
      ],
    },
    expectedSummary: { kept: 2, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep", "keep"],
    comment: "явный «;», разные игроки — clean keep",
  },
  {
    id: "RS08",
    input: {
      transcript: "команда плохо в зоне; запиши это",
      candidates: [teamCand("команда плохо в зоне", 0), unknownCand("запиши это", 1)],
    },
    expectedSummary: { kept: 2, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep", "keep"],
    comment: "unknown не похож на продолжение оценки команды — оба keep",
  },
  {
    id: "RS09",
    input: {
      transcript: "запиши момент",
      candidates: [unknownCand("запиши момент", 0)],
    },
    expectedSummary: { kept: 1, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep"],
    comment: "unknown noise — keep",
  },
  {
    id: "RS10",
    input: {
      transcript: "синтетический merge+keep",
      candidates: [
        playerCand("Марк молодец", 0, "p-mark"),
        playerCand("93-й ошибся", 1, "p-mark"),
        playerCand("Сидоров отлично", 2, "p-sidor"),
      ],
    },
    expectedSummary: { kept: 1, merged: 1, ambiguous: 0 },
    expectedItemKinds: ["merge", "keep"],
    comment: "сначала merge двух марков, затем keep сидорова",
  },
  {
    id: "RS11",
    input: {
      transcript: "",
      candidates: [],
    },
    expectedSummary: { kept: 0, merged: 0, ambiguous: 0 },
    expectedItemKinds: [],
    comment: "пустой ввод",
  },
  {
    id: "RS12",
    input: {
      transcript: "Марк и Гротов оба поздно сели",
      candidates: [playerCand("Марк и Гротов оба поздно сели", 0, "p-mark")],
    },
    expectedSummary: { kept: 1, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep"],
    comment: "один сегмент — один keep",
  },
  {
    id: "RS13",
    input: {
      transcript: "один хорошо, а второй плохо, а третий нормально",
      candidates: [
        unknownCand("один хорошо", 0),
        unknownCand("второй плохо", 1),
        unknownCand("третий нормально", 2),
      ],
    },
    expectedSummary: { kept: 3, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep", "keep", "keep"],
    comment: "три unknown — правила пары не срабатывают",
  },
  {
    id: "RS14",
    input: {
      transcript: "команда ок; Марк молодец",
      candidates: [teamCand("команда ок", 0), playerCand("Марк молодец", 1, "p-mark")],
    },
    expectedSummary: { kept: 2, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep", "keep"],
    comment: "team + игрок после «;» — разные сущности, keep",
  },
  {
    id: "RS15",
    input: {
      transcript: "17-й и 23-й не успели",
      candidates: [playerCand("17-й и 23-й не успели", 0, "p-grotov")],
    },
    expectedSummary: { kept: 1, merged: 0, ambiguous: 0 },
    expectedItemKinds: ["keep"],
    comment: "splitter не сработал — один сегмент; shared-pair только при двух кандидатах",
  },
];

function summaryEqual(
  a: ArenaResolutionResult["summary"],
  b: ArenaResolutionResult["summary"]
): boolean {
  return a.kept === b.kept && a.merged === b.merged && a.ambiguous === b.ambiguous;
}

function itemKindsMatch(
  items: ArenaResolvedCandidate[],
  expected: Array<"keep" | "merge" | "ambiguous">
): boolean {
  if (items.length !== expected.length) return false;
  for (let i = 0; i < items.length; i++) {
    if (items[i]!.kind !== expected[i]) return false;
  }
  return true;
}

export function runArenaResolutionAudit(): {
  rows: {
    scenario: ArenaResolutionScenario;
    result: ArenaResolutionResult;
    pass: boolean;
    failReason?: string;
  }[];
  passCount: number;
  failCount: number;
  summary: string;
} {
  const rows: {
    scenario: ArenaResolutionScenario;
    result: ArenaResolutionResult;
    pass: boolean;
    failReason?: string;
  }[] = [];

  for (const scenario of ARENA_RESOLUTION_SCENARIOS) {
    const result = resolveArenaIntentCandidatesV1(scenario.input);
    let pass = true;
    let failReason: string | undefined;
    if (!summaryEqual(result.summary, scenario.expectedSummary)) {
      pass = false;
      failReason = `summary: got ${JSON.stringify(result.summary)}, want ${JSON.stringify(scenario.expectedSummary)}`;
    } else if (!itemKindsMatch(result.items, scenario.expectedItemKinds)) {
      pass = false;
      failReason = `itemKinds: got ${JSON.stringify(result.items.map((x) => x.kind))}, want ${JSON.stringify(scenario.expectedItemKinds)}`;
    }
    rows.push({ scenario, result, pass, failReason });
  }

  const passCount = rows.filter((r) => r.pass).length;
  return {
    rows,
    passCount,
    failCount: rows.length - passCount,
    summary: `PASS ${passCount} / ${rows.length}, FAIL ${rows.length - passCount}`,
  };
}

/*
 * --- Design notes ---
 *
 * Безопасно keep: один сегмент; два разных игрока после контраста/«;»; team+команда unrelated unknown.
 * Обязательно review: shared-pair (два ambiguous); team continuation (второй ambiguous); любой ambiguous.
 *
 * Для production multi-observation в контракте позже: массив resolved items с merge metadata,
 * optional userConfirmationRequired[], link на исходный transcript range, timestamp.
 */
