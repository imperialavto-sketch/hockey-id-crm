/**
 * Фикстуры для Storybook и Jest-снапшотов `StructuredMetricsFoundationSection`.
 *
 * **Стабильные id:** не менять строки `SM_FIXTURE_PLAYER_*` — снапшоты и регрессии привязаны к ним.
 *
 * **QA / Storybook:** при включённом Storybook Metro — раздел Schedule → Structured Metrics; сравнить визуально
 * loading / error / empty / два игрока / save disabled / saving / success / полосы подсказок (applicable, matches, наблюдения↔quick, Hockey ID conflict).
 */

import type {
  TrainingEvaluation,
  TrainingStructuredMetricsPlayer,
} from "@/services/coachScheduleService";
import type { StructuredMetricsDraftMap } from "@/lib/structuredMetricsSessionUi";
import type {
  StructuredMetricsFoundationCopy,
  StructuredMetricsFoundationSectionProps,
} from "@/components/schedule/StructuredMetricsFoundationSection";
import type { VoiceBehavioralByPlayer } from "@/lib/behavioralStructuredSuggestions";

/** Игрок A — сценарии «применимо» и конфликт Hockey ID. */
export const SM_FIXTURE_PLAYER_ALPHA = "sm-fixture-player-alpha" as const;
/** Игрок B — сценарий «совпадает» и конфликт наблюдений vs быстрая оценка. */
export const SM_FIXTURE_PLAYER_BETA = "sm-fixture-player-beta" as const;

function player(
  id: string,
  name: string,
  behavioral: unknown
): TrainingStructuredMetricsPlayer {
  return {
    playerId: id,
    name,
    structuredMetrics: {
      schemaVersion: 1,
      source: "fixture",
      iceTechnical: {},
      tactical: {},
      ofpQualitative: {},
      physical: {},
      behavioral: behavioral as Record<string, unknown>,
      observation: {},
      voiceMeta: {},
    },
  };
}

/** Минимальный полный набор строк для рендера секции (RU, стабильный для снапшотов). */
export function createStructuredMetricsFixtureCopy(): StructuredMetricsFoundationCopy {
  return {
    sectionTitle: "STRUCTURED METRICS",
    sectionSubtitle: "Fixture · Hockey ID foundation",
    loading: "Загрузка метрик…",
    loadFailed: "Не удалось загрузить",
    empty: "Нет игроков в списке",
    saveCta: "Сохранить метрики",
    saving: "Сохранение…",
    savedHint: "Сохранено",
    iceSkating: "Коньки",
    icePassing: "Передача",
    iceShooting: "Бросок",
    tacPositioning: "Позиционирование",
    tacDecisions: "Решения",
    ofpEndurance: "Выносливость",
    ofpSpeed: "Скорость",
    behFocus: "Концентрация",
    behDiscipline: "Дисциплина",
    hintNoChanges: "Нет изменений для сохранения",
    structuredSuggestionFromQuickEyebrow: "ПОДСКАЗКА",
    structuredSuggestionApply: "Применить",
    structuredSuggestionApplying: "Применяю…",
    structuredSuggestionSourceQuick: "Быстрая оценка",
    structuredSuggestionSourceVoice: "Подтверждено после тренировки",
    structuredSuggestionSourceMerged: "Оценка и анализ тренировки",
    structuredSuggestionApplicableLead: "Можно применить:",
    structuredSuggestionProposedLead: "Предложено:",
    structuredSuggestionMatches: "Уже совпадает с метриками",
    structuredSuggestionConflictSourcesBadge: "Конфликт источников",
    structuredSuggestionConflictVoiceQuick:
      "Наблюдения из анализа тренировки и быстрая оценка не сходятся. Выставьте концентрацию и дисциплину вручную.",
    structuredSuggestionConflictHockeyId:
      "В Hockey ID уже другие значения — вручную.",
    structuredSuggestionApplyFailed: "Не удалось применить",
    structuredSuggestionExplainSource: "По наблюдениям тренировки",
    structuredSuggestionExplainLegend:
      "+ положительное наблюдение, − отрицательное",
    retryCta: "Повторить",
    networkRetryHint: "Проверьте сеть",
    authLine: "Требуется авторизация",
  };
}

const noop = () => {};
const noopAsync = async () => {};

function baseCallbacks(): Pick<
  StructuredMetricsFoundationSectionProps,
  | "onRetry"
  | "setDraftByPlayer"
  | "onSave"
  | "onApplyBehavioralSuggestion"
> {
  return {
    onRetry: noop,
    setDraftByPlayer: noop,
    onSave: noop,
    onApplyBehavioralSuggestion: noopAsync,
  };
}

/** Состояние: спиннер загрузки. */
export function fixtureLoading(): StructuredMetricsFoundationSectionProps {
  return {
    copy: createStructuredMetricsFixtureCopy(),
    players: [],
    loading: true,
    error: null,
    draftByPlayer: {},
    saving: false,
    saveError: null,
    saveSucceeded: false,
    canSave: false,
    evaluations: [],
    applyingSuggestionPlayerId: null,
    suggestionApplyError: null,
    voiceBehavioralByPlayer: new Map(),
    ...baseCallbacks(),
  };
}

/** Состояние: ошибка + retry. */
export function fixtureError(): StructuredMetricsFoundationSectionProps {
  return {
    ...fixtureLoading(),
    loading: false,
    error: "Сеть недоступна",
  };
}

/** Состояние: успешно, список пуст. */
export function fixtureEmpty(): StructuredMetricsFoundationSectionProps {
  return {
    ...fixtureLoading(),
    loading: false,
    error: null,
  };
}

const draftTwoPlayers: StructuredMetricsDraftMap = {
  [SM_FIXTURE_PLAYER_ALPHA]: {
    skating: 3,
    passing: 3,
    shooting: 3,
    positioning: 3,
    decisionMaking: 3,
    endurance: 3,
    speed: 3,
    focus: null,
    discipline: null,
  },
  [SM_FIXTURE_PLAYER_BETA]: {
    skating: 2,
    passing: 2,
    shooting: 2,
    positioning: 2,
    decisionMaking: 2,
    endurance: 2,
    speed: 2,
    focus: 4,
    discipline: 3,
  },
};

const playersTwoBase: TrainingStructuredMetricsPlayer[] = [
  player(SM_FIXTURE_PLAYER_ALPHA, "Игрок Альфа", {
    focus: null,
    discipline: null,
  }),
  player(SM_FIXTURE_PLAYER_BETA, "Игрок Бета", {
    focus: 4,
    discipline: 3,
  }),
];

const evaluationsApplicable: TrainingEvaluation[] = [
  {
    playerId: SM_FIXTURE_PLAYER_ALPHA,
    name: "Игрок Альфа",
    evaluation: { focus: 4, discipline: 3, effort: 3 },
  },
  {
    playerId: SM_FIXTURE_PLAYER_BETA,
    name: "Игрок Бета",
    evaluation: { focus: 4, discipline: 3, effort: 4 },
  },
];

/** Два игрока, черновик с отличиями → `canSave: true`, полоса «применить» у Альфы. */
export function fixtureTwoPlayersCanSave(): StructuredMetricsFoundationSectionProps {
  return {
    copy: createStructuredMetricsFixtureCopy(),
    players: playersTwoBase,
    loading: false,
    error: null,
    onRetry: noop,
    setDraftByPlayer: noop,
    draftByPlayer: draftTwoPlayers,
    onSave: noop,
    saving: false,
    saveError: null,
    saveSucceeded: false,
    canSave: true,
    evaluations: evaluationsApplicable,
    onApplyBehavioralSuggestion: noopAsync,
    applyingSuggestionPlayerId: null,
    suggestionApplyError: null,
    voiceBehavioralByPlayer: new Map(),
  };
}

/** Черновик = сервер → сохранять нечего, подсказка «совпадает» у Беты. */
export function fixtureTwoPlayersNoSave(): StructuredMetricsFoundationSectionProps {
  const draft: StructuredMetricsDraftMap = {
    [SM_FIXTURE_PLAYER_ALPHA]: { ...draftTwoPlayers[SM_FIXTURE_PLAYER_ALPHA]! },
    [SM_FIXTURE_PLAYER_BETA]: {
      skating: 2,
      passing: 2,
      shooting: 2,
      positioning: 2,
      decisionMaking: 2,
      endurance: 2,
      speed: 2,
      focus: 4,
      discipline: 3,
    },
  };
  return {
    ...fixtureTwoPlayersCanSave(),
    draftByPlayer: draft,
    canSave: false,
  };
}

/** Идёт сохранение. */
export function fixtureSaving(): StructuredMetricsFoundationSectionProps {
  return {
    ...fixtureTwoPlayersCanSave(),
    saving: true,
    canSave: true,
  };
}

/** Успешное сохранение (хинт). */
export function fixtureSaveSucceeded(): StructuredMetricsFoundationSectionProps {
  return {
    ...fixtureTwoPlayersCanSave(),
    saveSucceeded: true,
    canSave: false,
  };
}

/** Ошибка сохранения. */
export function fixtureSaveError(): StructuredMetricsFoundationSectionProps {
  return {
    ...fixtureTwoPlayersCanSave(),
    saveError: "Сервер недоступен",
    canSave: true,
  };
}

/** Конфликт наблюдений (live) и быстрой оценки у Беты. */
export function fixtureSuggestionVoiceVsQuick(): StructuredMetricsFoundationSectionProps {
  const voice: VoiceBehavioralByPlayer = new Map([
    [
      SM_FIXTURE_PLAYER_BETA,
      {
        playerId: SM_FIXTURE_PLAYER_BETA,
        behavioral: { focus: 2, discipline: 3 },
      },
    ],
  ]);
  const evaluations: TrainingEvaluation[] = [
    {
      playerId: SM_FIXTURE_PLAYER_BETA,
      name: "Игрок Бета",
      evaluation: { focus: 5, discipline: 3, effort: 4 },
    },
  ];
  return {
    ...fixtureTwoPlayersCanSave(),
    evaluations,
    voiceBehavioralByPlayer: voice,
  };
}

/** Конфликт с уже записанным Hockey ID у Альфы (сервер 2, подсказка 4/3). */
export function fixtureSuggestionHockeyIdConflict(): StructuredMetricsFoundationSectionProps {
  const players: TrainingStructuredMetricsPlayer[] = [
    player(SM_FIXTURE_PLAYER_ALPHA, "Игрок Альфа", {
      focus: 2,
      discipline: 2,
    }),
    playersTwoBase[1]!,
  ];
  const draft: StructuredMetricsDraftMap = {
    ...draftTwoPlayers,
    [SM_FIXTURE_PLAYER_ALPHA]: {
      ...draftTwoPlayers[SM_FIXTURE_PLAYER_ALPHA]!,
      focus: 2,
      discipline: 2,
    },
  };
  return {
    ...fixtureTwoPlayersCanSave(),
    players,
    draftByPlayer: draft,
    evaluations: evaluationsApplicable,
    voiceBehavioralByPlayer: new Map(),
  };
}

/** Ошибка применения подсказки (нижний текст). */
export function fixtureSuggestionApplyError(): StructuredMetricsFoundationSectionProps {
  return {
    ...fixtureTwoPlayersCanSave(),
    suggestionApplyError: "PATCH не выполнен",
  };
}

/** Идёт применение подсказки у Альфы. */
export function fixtureApplyingSuggestion(): StructuredMetricsFoundationSectionProps {
  return {
    ...fixtureTwoPlayersCanSave(),
    applyingSuggestionPlayerId: SM_FIXTURE_PLAYER_ALPHA,
  };
}
