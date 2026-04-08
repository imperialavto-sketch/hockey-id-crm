/**
 * Guided suggestions → structured `behavioral.*` (focus, discipline).
 * Источники: быстрая оценка и/или подсказки из live-эфира (GET behavioral-suggestions; без авто-sync).
 *
 * Правило значения по оси: **подсказка эфира → затем quick**, если нет конфликта между источниками.
 * Если подсказка и quick расходятся по одной оси — статус конфликта, без «Применить».
 *
 * Подпись UI (`displaySource`): `voice_*` — внутренние идентификаторы; пользователю показываем анализ тренировки (Арена + live).
 */

import type {
  TrainingEvaluation,
  TrainingStructuredMetricsPlayer,
  VoiceBehavioralMapEntry,
} from '@/services/coachScheduleService';
import type {
  StructuredMetricsAxisDraft,
  StructuredMetricsDraftMap,
} from '@/lib/structuredMetricsSessionUi';

export type BehavioralSuggestionDisplaySource =
  | 'quick_evaluation'
  | 'voice_reviewed'
  | 'voice_and_quick_merged';

export type BehavioralSuggestionUiStatus =
  | 'empty'
  | 'applicable'
  | 'matches_existing'
  | 'conflicts_existing';

export type PlayerBehavioralStructuredSuggestion = {
  playerId: string;
  displaySource: BehavioralSuggestionDisplaySource;
  status: BehavioralSuggestionUiStatus;
  explanation: string;
  suggested: { focus?: number; discipline?: number };
  applicableBehavioral: { focus?: number; discipline?: number };
};

export type VoiceBehavioralByPlayer = ReadonlyMap<string, VoiceBehavioralMapEntry>;

function axis15(n: number | null | undefined): number | undefined {
  if (n == null) return undefined;
  if (!Number.isInteger(n) || n < 1 || n > 5) return undefined;
  return n;
}

function axisFromBucket(
  bucket: unknown,
  key: 'focus' | 'discipline'
): number | null | undefined {
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) {
    return undefined;
  }
  const v = (bucket as Record<string, unknown>)[key];
  if (v === null) return null;
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5) {
    return v;
  }
  return undefined;
}

function effectiveBehavioralAxis(
  draftRow: StructuredMetricsAxisDraft | undefined,
  serverBehavioral: unknown,
  key: 'focus' | 'discipline'
): number | null | undefined {
  const d = draftRow?.[key];
  if (d !== undefined) return d;
  return axisFromBucket(serverBehavioral, key);
}

function quickBehavioralHints(ev: {
  focus?: number;
  discipline?: number;
} | null | undefined): { focus?: number; discipline?: number } {
  const out: { focus?: number; discipline?: number } = {};
  const f = axis15(ev?.focus);
  const d = axis15(ev?.discipline);
  if (f !== undefined) out.focus = f;
  if (d !== undefined) out.discipline = d;
  return out;
}

export function mergeVoiceAndQuickBehavioral(
  voice: { focus?: number; discipline?: number } | null | undefined,
  quick: { focus?: number; discipline?: number }
): {
  suggested: { focus?: number; discipline?: number };
  voiceVsQuickConflict: boolean;
} {
  const vF = voice?.focus;
  const vD = voice?.discipline;
  const qF = quick.focus;
  const qD = quick.discipline;

  const focusConflict =
    vF !== undefined && qF !== undefined && vF !== qF;
  const disciplineConflict =
    vD !== undefined && qD !== undefined && vD !== qD;

  if (focusConflict || disciplineConflict) {
    return { suggested: {}, voiceVsQuickConflict: true };
  }

  const suggested: { focus?: number; discipline?: number } = {};
  if (vF !== undefined || qF !== undefined) {
    suggested.focus = vF ?? qF;
  }
  if (vD !== undefined || qD !== undefined) {
    suggested.discipline = vD ?? qD;
  }

  return { suggested, voiceVsQuickConflict: false };
}

export function computeBehavioralSuggestionDisplaySource(input: {
  suggested: { focus?: number; discipline?: number };
  voice: { focus?: number; discipline?: number };
  quick: { focus?: number; discipline?: number };
}): BehavioralSuggestionDisplaySource {
  const { suggested, voice, quick } = input;
  const vF = voice.focus;
  const vD = voice.discipline;
  const qF = quick.focus;
  const qD = quick.discipline;

  let focusFromVoice = false;
  let focusFromQuick = false;
  if (suggested.focus !== undefined) {
    focusFromVoice = vF !== undefined && suggested.focus === vF;
    focusFromQuick =
      !focusFromVoice && qF !== undefined && suggested.focus === qF;
  }

  let disciplineFromVoice = false;
  let disciplineFromQuick = false;
  if (suggested.discipline !== undefined) {
    disciplineFromVoice = vD !== undefined && suggested.discipline === vD;
    disciplineFromQuick =
      !disciplineFromVoice && qD !== undefined && suggested.discipline === qD;
  }

  const anyVoice = focusFromVoice || disciplineFromVoice;
  const anyQuick = focusFromQuick || disciplineFromQuick;

  if (anyVoice && anyQuick) return 'voice_and_quick_merged';
  if (anyVoice) return 'voice_reviewed';
  return 'quick_evaluation';
}

export function buildPlayerBehavioralStructuredSuggestion(input: {
  playerId: string;
  draftRow: StructuredMetricsAxisDraft | undefined;
  serverBehavioral: unknown;
  quickEvaluation: { focus?: number; discipline?: number } | null | undefined;
  voiceBehavioral?: { focus?: number; discipline?: number } | null;
}): PlayerBehavioralStructuredSuggestion {
  const quick = quickBehavioralHints(input.quickEvaluation);

  let voice: { focus?: number; discipline?: number } | null = null;
  if (input.voiceBehavioral) {
    const f = axis15(input.voiceBehavioral.focus);
    const d = axis15(input.voiceBehavioral.discipline);
    const v: { focus?: number; discipline?: number } = {};
    if (f !== undefined) v.focus = f;
    if (d !== undefined) v.discipline = d;
    if (Object.keys(v).length > 0) voice = v;
  }

  const { suggested, voiceVsQuickConflict } = mergeVoiceAndQuickBehavioral(
    voice,
    quick
  );

  if (voiceVsQuickConflict) {
    return {
      playerId: input.playerId,
      displaySource: 'quick_evaluation',
      status: 'conflicts_existing',
      explanation:
        'Быстрая оценка и наблюдения из анализа тренировки дают разные значения — выставьте оси в Hockey ID вручную.',
      suggested: {},
      applicableBehavioral: {},
    };
  }

  const keys = Object.keys(suggested) as ('focus' | 'discipline')[];
  if (keys.length === 0) {
    return {
      playerId: input.playerId,
      displaySource: 'quick_evaluation',
      status: 'empty',
      explanation: '',
      suggested: {},
      applicableBehavioral: {},
    };
  }

  const displaySource = computeBehavioralSuggestionDisplaySource({
    suggested,
    voice: voice ?? {},
    quick,
  });

  let conflictStructured = false;
  const applicableBehavioral: { focus?: number; discipline?: number } = {};

  for (const key of keys) {
    const want = suggested[key]!;
    const eff = effectiveBehavioralAxis(
      input.draftRow,
      input.serverBehavioral,
      key
    );
    if (typeof eff === 'number' && eff !== want) {
      conflictStructured = true;
    } else if (eff === undefined || eff === null) {
      applicableBehavioral[key] = want;
    }
  }

  if (conflictStructured) {
    return {
      playerId: input.playerId,
      displaySource,
      status: 'conflicts_existing',
      explanation:
        'В Hockey ID уже заданы другие значения фокуса/дисциплины — подсказка не применяется автоматически.',
      suggested,
      applicableBehavioral: {},
    };
  }

  if (Object.keys(applicableBehavioral).length > 0) {
    return {
      playerId: input.playerId,
      displaySource,
      status: 'applicable',
      explanation:
        'Перенос в structured metrics только по кнопке «Применить».',
      suggested,
      applicableBehavioral,
    };
  }

  return {
    playerId: input.playerId,
    displaySource,
    status: 'matches_existing',
    explanation:
      'Совпадает с текущими структурированными метриками (или уже перенесено).',
    suggested,
    applicableBehavioral: {},
  };
}

/** Короткая строка осей для UI (те же названия, что на плашке оценки). */
export function formatBehavioralAxesShort(axes: {
  focus?: number;
  discipline?: number;
}): string {
  const parts: string[] = [];
  const f = axis15(axes.focus);
  const d = axis15(axes.discipline);
  if (f !== undefined) parts.push(`Концентрация ${f}`);
  if (d !== undefined) parts.push(`Дисциплина ${d}`);
  return parts.join(' · ');
}

export function suggestionLabelFromApplicable(s: {
  applicableBehavioral: { focus?: number; discipline?: number };
}): string {
  return formatBehavioralAxesShort(s.applicableBehavioral);
}

/**
 * Два разных `conflicts_existing`: расхождение наблюдений (live/Арена) и быстрой оценки (нет merged suggested)
 * vs уже заполненный Hockey ID не совпадает с подсказкой.
 */
export function isBehavioralSuggestionVoiceVsQuickConflict(
  s: PlayerBehavioralStructuredSuggestion
): boolean {
  if (s.status !== 'conflicts_existing') return false;
  return (
    s.suggested.focus === undefined && s.suggested.discipline === undefined
  );
}

export function buildBehavioralSuggestionMap(
  structuredPlayers: TrainingStructuredMetricsPlayer[],
  evaluations: TrainingEvaluation[],
  draftByPlayer: StructuredMetricsDraftMap,
  voiceBehavioralByPlayer?: VoiceBehavioralByPlayer
): Map<string, PlayerBehavioralStructuredSuggestion> {
  const evalById = new Map(evaluations.map((e) => [e.playerId, e]));
  const out = new Map<string, PlayerBehavioralStructuredSuggestion>();
  const voiceMap = voiceBehavioralByPlayer ?? new Map();

  for (const p of structuredPlayers) {
    const evRow = evalById.get(p.playerId);
    const vb = voiceMap.get(p.playerId);
    const s = buildPlayerBehavioralStructuredSuggestion({
      playerId: p.playerId,
      draftRow: draftByPlayer[p.playerId],
      serverBehavioral: p.structuredMetrics?.behavioral,
      quickEvaluation: evRow?.evaluation ?? null,
      voiceBehavioral: vb ?? null,
    });
    out.set(p.playerId, s);
  }

  return out;
}
