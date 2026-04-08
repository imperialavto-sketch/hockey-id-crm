/**
 * Arena Observation Splitter V1 — dev-only prototype.
 * Не подключать к production / useArenaVoiceAssistant / parseArenaIntent flow.
 *
 * Делит одну фразу тренера на несколько сегментов для будущего multi-observation pipeline.
 */

export type ArenaSplitInput = {
  transcript: string;
};

export type ArenaObservationSegment = {
  text: string;
  index: number;
};

/** Описание правила: разделитель удаляется; части склеиваются в сегменты. */
type SplitPattern = {
  id: string;
  /** Regex на весь оставшийся кусок; должен матчить разделитель между клаузами */
  pattern: RegExp;
};

/**
 * Порядок важен: сначала «жёсткие» и контрастные, потом более слабые.
 * Не дробим агрессивно: нет голого `, ` без контраста/новой клаузы.
 */
const SPLIT_PATTERNS: SplitPattern[] = [
  { id: "semicolon", pattern: /\s*;\s*/g },
  { id: "comma_no", pattern: /,\s*но\s+/gi },
  { id: "comma_a", pattern: /,\s*а\s+/gi },
  /** Точка как конец мысли; не трогаем десятичные дроби (цифра.цифра) */
  {
    id: "period_space",
    pattern: /(?<!\d)\.\s+(?=[\p{L}\p{N}А-Яа-яЁё0-9])/gu,
  },
  /**
   * Запятая перед новым номером на коньках: «…, 23-й …» (без \b после кириллицы — ненадёжен без /u).
   */
  {
    id: "comma_jersey",
    pattern: /,\s+(?=\d{1,2}-[йя](?:\s|[,.;!?]|$))/gi,
  },
];

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Применяет один паттерн ко всем сегментам (flat map).
 */
function applyPattern(segments: string[], pattern: RegExp): string[] {
  const out: string[] = [];
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  const re = new RegExp(pattern.source, flags);
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(re).map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      out.push(trimmed);
    } else {
      out.push(...parts);
    }
  }
  return out;
}

/**
 * Узкий случай: «17-й и 23-й …» как два номерных якоря (без variable-length lookbehind).
 */
function splitJerseyAndJerseySegment(seg: string): string[] {
  const trimmed = seg.trim();
  const re = /^(\d{1,2}-[йя])\s+и\s+(\d{1,2}-[йя].*)$/i;
  const m = trimmed.match(re);
  if (!m) return [trimmed];
  return [m[1]!.trim(), m[2]!.trim()].filter(Boolean);
}

function applyJerseyAndJersey(segments: string[]): string[] {
  const out: string[] = [];
  for (const seg of segments) {
    out.push(...splitJerseyAndJerseySegment(seg));
  }
  return out;
}

/**
 * Одна фраза → 1+ сегментов. Пустой ввод → [].
 */
export function splitArenaObservations(input: ArenaSplitInput): ArenaObservationSegment[] {
  const raw = input.transcript.trim();
  if (!raw) return [];

  let segments = [raw];
  for (const { pattern } of SPLIT_PATTERNS) {
    segments = applyPattern(segments, pattern);
  }
  segments = applyJerseyAndJersey(segments);

  const normalized = segments.map(normalizeWhitespace).filter(Boolean);
  return normalized.map((text, index) => ({ text, index }));
}

// --- Dev scenarios (ground truth для ручной проверки / будущего harness) ---

export type ArenaSplitScenario = {
  id: string;
  category: string;
  transcript: string;
  /** Ожидаемые тексты сегментов после split */
  expectedTexts: string[];
  note?: string;
};

export const ARENA_SPLIT_SCENARIOS: ArenaSplitScenario[] = [
  {
    id: "S01",
    category: "single",
    transcript: "Марк поздно сел в колени",
    expectedTexts: ["Марк поздно сел в колени"],
  },
  {
    id: "S02",
    category: "single",
    transcript: "команда сегодня медленно возвращается",
    expectedTexts: ["команда сегодня медленно возвращается"],
  },
  {
    id: "S03",
    category: "no_split_list",
    transcript: "молодцы, ребята, так держать",
    expectedTexts: ["молодцы, ребята, так держать"],
    note: "перечисление без контраста — не режем",
  },
  {
    id: "S04",
    category: "contrast_comma_a",
    transcript: "17-й хорошо, а 23-й потерял игрока",
    expectedTexts: ["17-й хорошо", "23-й потерял игрока"],
  },
  {
    id: "S05",
    category: "contrast_comma_no",
    transcript: "команда хорошо, но концовка слабая",
    expectedTexts: ["команда хорошо", "концовка слабая"],
  },
  {
    id: "S06",
    category: "two_player_comma_jersey",
    transcript: "Марк отлично в зоне, 17-й ошибся на сине",
    expectedTexts: ["Марк отлично в зоне", "17-й ошибся на сине"],
  },
  {
    id: "S07",
    category: "semicolon",
    transcript: "Гротов держит шайбу; Сидоров открылся под пас",
    expectedTexts: ["Гротов держит шайбу", "Сидоров открылся под пас"],
  },
  {
    id: "S08",
    category: "period",
    transcript: "Вброс выиграли. Поздно вышли из зоны",
    expectedTexts: ["Вброс выиграли", "Поздно вышли из зоны"],
  },
  {
    id: "S09",
    category: "no_split_decimal",
    transcript: "интервал 3.5 секунды на смену",
    expectedTexts: ["интервал 3.5 секунды на смену"],
    note: "точка в числе — не разделитель",
  },
  {
    id: "S10",
    category: "comma_a_chain",
    transcript: "один хорошо, а второй плохо, а третий нормально",
    expectedTexts: ["один хорошо", "второй плохо", "третий нормально"],
  },
  {
    id: "S11",
    category: "no_split_and_pair",
    transcript: "Марк и Гротов оба поздно сели",
    expectedTexts: ["Марк и Гротов оба поздно сели"],
    note: "одно наблюдение про пару — «и» не режем",
  },
  {
    id: "S12",
    category: "jersey_and_jersey",
    transcript: "17-й и 23-й не успели вернуться",
    expectedTexts: ["17-й", "23-й не успели вернуться"],
    note: "спорный продуктовый смысл; V1 демонстрирует только разрез",
  },
  {
    id: "S13",
    category: "team_plus_contrast",
    transcript: "все включились, но темп просел",
    expectedTexts: ["все включились", "темп просел"],
  },
  {
    id: "S14",
    category: "no_split_comma_only",
    transcript: "хорошо, очень хорошо по борьбе",
    expectedTexts: ["хорошо, очень хорошо по борьбе"],
  },
  {
    id: "S15",
    category: "comma_jersey_lower",
    transcript: "марк молодец, 93-й снова потерял",
    expectedTexts: ["марк молодец", "93-й снова потерял"],
  },
  {
    id: "S16",
    category: "mixed_delims",
    transcript: "первый период ок; второй слабый, а третий норм",
    expectedTexts: ["первый период ок", "второй слабый", "третий норм"],
  },
  {
    id: "S17",
    category: "comma_no_uppercase",
    transcript: "голыш открылся, гротов поздно сел",
    expectedTexts: ["голыш открылся, гротов поздно сел"],
    note: "без «а/но» и без номера после запятой — V1 не режет (ASR часто lower)",
  },
  {
    id: "S18",
    category: "a_lowercase_contrast",
    transcript: "защита плотная, а атака слабая",
    expectedTexts: ["защита плотная", "атака слабая"],
  },
  {
    id: "S19",
    category: "no_split_inside_quotes_like",
    transcript: "сказал: держись борта, не отпускай",
    expectedTexts: ["сказал: держись борта, не отпускай"],
  },
  {
    id: "S20",
    category: "semicolon_three",
    transcript: "разминка ок; старт вялый; третий норм",
    expectedTexts: ["разминка ок", "старт вялый", "третий норм"],
  },
];

function segmentsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (normalizeWhitespace(a[i]!) !== normalizeWhitespace(b[i]!)) return false;
  }
  return true;
}

/*
 * --- Design notes (V1) ---
 *
 * Хорошо режутся rule-based:
 * - контраст «, а » / «, но »;
 * - «;» и точка + пробел (новое предложение);
 * - «, N-й» при явном втором номере;
 * - узкая связка «N-й и M-й …» (отдельный шаг).
 *
 * Ошибки начнутся:
 * - lower-case ASR без «а/но» и без номера: «голыш открылся, гротов поздно»;
 * - вложенные перечисления и вежливые «и» между не-номерами;
 * - усечённые транскрипты без знаков препинания.
 *
 * Стыковка с parseArenaIntent:
 * - да: map segments → parseArenaIntent({ transcript: seg.text, roster }) и собрать массив intent-ов
 *   в отдельном адаптере (новый тип результата), не меняя текущий ArenaIntent в live-пути;
 * - порядок: split → затем sentiment/player на каждом сегменте; team+player в одном сегменте
 *   остаётся задачей парсера на куске текста.
 */

export function runArenaSplitAudit(): {
  rows: { scenario: ArenaSplitScenario; actual: string[]; pass: boolean }[];
  passCount: number;
  failCount: number;
  summary: string;
} {
  const rows = ARENA_SPLIT_SCENARIOS.map((scenario) => {
    const segs = splitArenaObservations({ transcript: scenario.transcript });
    const actual = segs.map((s) => s.text);
    const pass = segmentsEqual(actual, scenario.expectedTexts);
    return { scenario, actual, pass };
  });
  const passCount = rows.filter((r) => r.pass).length;
  const failCount = rows.length - passCount;
  return {
    rows,
    passCount,
    failCount,
    summary: `PASS ${passCount} / ${rows.length}, FAIL ${failCount}`,
  };
}
