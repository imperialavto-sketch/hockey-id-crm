import {
  getLatestExternalTrainingRequestForParentPlayer,
  resolveArenaCoachDisplayName,
  type ExternalTrainingRequestRecord,
} from "@/lib/arena/external-training-requests";
import { getExternalTrainingReportByRequestId } from "@/lib/arena/external-training-reports";
import {
  buildPlayerDevelopmentPhase,
  phaseLabelRu,
  type PlayerDevelopmentPhase,
} from "@/lib/arena/build-player-development-phase";
import { prisma } from "@/lib/prisma";

export type TrainerCandidateView = {
  coachId: string;
  coachName: string;
  shortDescription: string;
};

export type ExternalFollowUpRecommendationView = {
  type:
    | "follow_up_training"
    | "monitor_only"
    | "focus_closed"
    | "stop_recommended"
    | "defer_due_to_load";
  title: string;
  summary: string;
  actionLabel: string | null;
  deferLabel: string | null;
  sourceNote: string;
  /** Фаза развития по горизонту допконтура (для клиентов / будущего UI). */
  phaseLabel?: string;
  /** Короткие детерминированные причины текущего решения (explainability). */
  explanationPoints: string[];
  /**
   * Автономный поток: конкретный тренер из текущего контура (тот же coachId, что в активном запросе).
   * Внешний тренер ниже по приоритету, чем основной тренер команды — полный weighting не реализуем (TODO).
   */
  trainerCandidate?: TrainerCandidateView;
  /** Почему выбран этот тренер (presentation, детерминированно). */
  trainerPickExplanation?: string;
};

export type PlayerLoadSnapshot = {
  weeklySessions: number;
  recentExternalCount: number;
  lastExternalAtDaysAgo: number;
  /** Сколько внешних отчётов за последние 48 ч (для объяснений без смены порогов нагрузки). */
  externalReportsLast2Days: number;
  isHighLoad: boolean;
};

const SOURCE_NOTE_BASE =
  "Решение построено по активному запросу Арены и последнему отчёту дополнительного источника.";

const SOURCE_NOTE_STOP =
  "Учтены объём дополнительного контура, повторяемость внешнего фокуса и полнота последнего отчёта.";

const SOURCE_NOTE_LOAD =
  "Учтены календарь команды за последние семь дней и последние сигналы дополнительного контура по данным.";

const FOLLOW_UP_SUMMARY_STRONG =
  "Внешний тренер зафиксировал следующий фокус в отчёте. Ещё одно занятие по тому же направлению может помочь закрепить материал — без обещаний и в спокойном темпе.";

const FOLLOW_UP_SUMMARY_PASSIVE_WEAK =
  "Дополнительный контур давно не обновлялся; по сохранённому контексту отчёта можно бережно продолжить с Ареной — если тема для вас всё ещё актуальна.";

const TRAINER_SHORT_MAX = 100;
const TRAINER_PICK_EXPLANATION =
  "Арена опирается на текущий допконтур: этот тренер уже ведёт работу с ребёнком, последний отчёт сохранён — смена контакта не требуется.";

const MS_PER_DAY = 86_400_000;

function clampTrainerLine(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildTrainerShortDescription(
  request: ExternalTrainingRequestRecord,
  nextLines: string[]
): string {
  const first = nextLines[0]?.trim();
  if (first) return clampTrainerLine(first, TRAINER_SHORT_MAX);
  const sk = request.skillKey?.trim();
  if (sk) return clampTrainerLine(`Фокус: ${sk}`, TRAINER_SHORT_MAX);
  const rs = request.reasonSummary?.trim();
  if (rs) return clampTrainerLine(rs, TRAINER_SHORT_MAX);
  return "Продолжение работы в дополнительном контуре.";
}

function withPhase(
  view: ExternalFollowUpRecommendationView,
  phase: PlayerDevelopmentPhase
): ExternalFollowUpRecommendationView {
  return { ...view, phaseLabel: phaseLabelRu(phase) };
}

function monitorOnlyRecommendation(opts?: {
  consolidationInsteadOfFollowUp?: boolean;
}): ExternalFollowUpRecommendationView {
  const consolidation = opts?.consolidationInsteadOfFollowUp === true;
  return {
    type: "monitor_only",
    title: "Арена рекомендует наблюдать динамику",
    summary:
      "Дополнительная работа зафиксирована в отчёте. Имеет смысл понаблюдать за динамикой в основном контуре, без нового назначения сейчас.",
    actionLabel: null,
    deferLabel: null,
    sourceNote: SOURCE_NOTE_BASE,
    explanationPoints: consolidation
      ? [
          "Арена учитывает фазу закрепления: сейчас видно окно без нового внешнего назначения.",
          "Отдельный внешний сигнал в отчёте уже зафиксирован; новых шагов во внешнем контуре сейчас не требуется.",
          "Лучше понаблюдать динамику в текущем ритме школы и вернуться к вопросу позже.",
        ]
      : [
          "Арена опирается на текущий отчёт: отдельный внешний сигнал уже зафиксирован.",
          "Во внешнем контуре сейчас не видно обязательного следующего шага в тексте отчёта.",
          "Удобнее понаблюдать динамику в основном контуре без нового назначения.",
        ],
  };
}

/**
 * Оценка текущей тренировочной нагрузки (детерминированно, без LLM).
 * weeklySessions — запланированные сессии команды игрока за скользящие 7 суток (не отменённые).
 */
export async function evaluatePlayerLoad(params: {
  playerId: string;
}): Promise<PlayerLoadSnapshot> {
  const playerId = params.playerId.trim();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
  const twoDaysAgo = new Date(now.getTime() - 2 * MS_PER_DAY);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });

  let weeklySessions = 0;
  if (player?.teamId) {
    weeklySessions = await prisma.trainingSession.count({
      where: {
        teamId: player.teamId,
        status: { not: "cancelled" },
        startAt: { gte: sevenDaysAgo, lte: now },
      },
    });
  }

  const recentExternalCount = await prisma.externalTrainingReport.count({
    where: {
      playerId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  /** Сколько внешних отчётов за последние 48 ч (сигнал сгущения допконтура). */
  const externalReportsLast2Days = await prisma.externalTrainingReport.count({
    where: {
      playerId,
      createdAt: { gte: twoDaysAgo },
    },
  });

  const latestExternal = await prisma.externalTrainingReport.findFirst({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const lastExternalAtDaysAgo = latestExternal
    ? (now.getTime() - latestExternal.createdAt.getTime()) / MS_PER_DAY
    : 999;

  /**
   * Высокая нагрузка:
   * — много командных сессий за 7 суток;
   * — ≥2 внешних отчёта за 7 суток;
   * — ≥2 внешних отчёта за 48 ч (эквивалент «недавний допконтур наслоился», без ложного срабатывания на один только что сохранённый отчёт).
   */
  const isHighLoad =
    weeklySessions >= 4 ||
    recentExternalCount >= 2 ||
    externalReportsLast2Days >= 2;

  return {
    weeklySessions,
    recentExternalCount,
    lastExternalAtDaysAgo,
    externalReportsLast2Days,
    isHighLoad,
  };
}

export function deferDueToLoadView(load: PlayerLoadSnapshot): ExternalFollowUpRecommendationView {
  const points: string[] = [
    "Арена опирается на расписание команды, последние данные и сигналы допконтура — ориентир по тренировочному контексту, а не оценка самочувствия.",
  ];
  if (load.weeklySessions >= 4) {
    points.push(
      "По календарю команды за неделю зафиксировано несколько тренировочных слотов — это ориентир по графику команды."
    );
  }
  if (load.recentExternalCount >= 2) {
    points.push("За последние семь дней зафиксировано несколько внешних отчётов.");
  }
  if (points.length < 3 && load.externalReportsLast2Days >= 2) {
    points.push(
      "За короткий промежуток накопилось несколько внешних отчётов — по ориентиру разумнее не сгущать допконтур сразу."
    );
  }
  if (points.length < 3) {
    points.push(
      "Имеет смысл спокойно пройти текущий отрезок в основном контуре и не форсировать дополнительный объём — опирайтесь на школу и своё наблюдение."
    );
  }
  return {
    type: "defer_due_to_load",
    title: "Арена предлагает не форсировать допконтур сейчас",
    summary:
      "По текущему тренировочному ритму команды и последним данным в основном контуре сейчас плотный режим, плюс недавние сигналы дополнительного источника. Ещё одна внешняя сессия сейчас легко окажется лишней: пока лучше не форсировать дополнительный объём — имеет смысл спокойно пройти этот отрезок и вернуться к вопросу позже, опираясь на школу и наблюдение. Это ориентир по режиму, а не оценка самочувствия.",
    actionLabel: null,
    deferLabel: null,
    sourceNote: SOURCE_NOTE_LOAD,
    explanationPoints: points.slice(0, 3),
  };
}

async function assessStopRecommendation(params: {
  playerId: string;
  parentId: string;
  request: ExternalTrainingRequestRecord;
  nextLines: string[];
  summaryTrimmed: string;
}): Promise<{ stop: boolean; explanationPoints: string[] }> {
  const { playerId, parentId, request, nextLines, summaryTrimmed } = params;
  const skillKeyNorm = request.skillKey?.trim() || null;

  const reportCount = await countExternalReportsForPlayerSkillKey(playerId, skillKeyNorm);
  if (reportCount >= 2) {
    return {
      stop: true,
      explanationPoints: [
        "Арена опирается на историю завершённых внешних отчётов по этому фокусу: в текущем цикле уже было несколько проходов.",
        "Один и тот же внешний фокус уже проходил несколько циклов — повторение сейчас вряд ли даст новую ценность.",
        "Основная опора остаётся в школе; дополнительный контур разумнее не наращивать без паузы.",
      ],
    };
  }

  const currentCreated = new Date(request.createdAt);
  if (
    await hasPriorCompletedCycleSameSkillForParent({
      playerId,
      parentId,
      skillKey: skillKeyNorm,
      currentRequestCreatedAt: currentCreated,
    })
  ) {
    return {
      stop: true,
      explanationPoints: [
        "Арена учитывает: по этому направлению уже был завершённый предыдущий внешний цикл.",
        "Сейчас видно риск зацикливания на том же фокусе без новой информации.",
        "Продолжение по этому направлению в допконтуре сейчас не рекомендуется.",
      ],
    };
  }

  if (nextLines.length === 0 && summaryTrimmed.length < 25) {
    return {
      stop: true,
      explanationPoints: [
        "Арена опирается на полноту последнего отчёта: следующих шагов в тексте нет, формулировка очень короткая.",
        "В таком виде внешний сигнал малоинформативен для следующего шага в допконтуре.",
        "Сейчас разумнее не строить продолжение только на этом фрагменте.",
      ],
    };
  }

  return { stop: false, explanationPoints: [] };
}

function stopRecommendedView(points: string[]): ExternalFollowUpRecommendationView {
  return {
    type: "stop_recommended",
    title: "Арена не рекомендует продолжать дополнительную работу",
    summary:
      "По этому внешнему фокусу материала уже достаточно: дальнейшее повторение сейчас вряд ли даст заметный эффект. Сейчас лучше опереться на наблюдение и основную работу в школе, без нового дополнительного цикла.",
    actionLabel: null,
    deferLabel: null,
    sourceNote: SOURCE_NOTE_STOP,
    explanationPoints: points,
  };
}

/** Завершённые отчёты по игроку с тем же skillKey у связанного запроса (защита от перетренированности). */
async function countExternalReportsForPlayerSkillKey(
  playerId: string,
  skillKey: string | null
): Promise<number> {
  const sk = skillKey?.trim() ?? null;
  const requests = await prisma.externalTrainingRequest.findMany({
    where: {
      playerId,
      ...(sk === null ? { skillKey: null } : { skillKey: sk }),
    },
    select: { id: true },
  });
  const ids = requests.map((r) => r.id);
  if (ids.length === 0) return 0;
  return prisma.externalTrainingReport.count({
    where: { playerId, requestId: { in: ids } },
  });
}

/**
 * Ранее был завершён цикл по тому же skillKey у этого родителя (риск зацикливания при re-request).
 */
async function hasPriorCompletedCycleSameSkillForParent(params: {
  playerId: string;
  parentId: string;
  skillKey: string | null;
  currentRequestCreatedAt: Date;
}): Promise<boolean> {
  const sk = params.skillKey?.trim() ?? null;
  const older = await prisma.externalTrainingRequest.findMany({
    where: {
      playerId: params.playerId,
      parentId: params.parentId,
      createdAt: { lt: params.currentRequestCreatedAt },
      ...(sk === null ? { skillKey: null } : { skillKey: sk }),
    },
    select: { id: true },
  });
  if (older.length === 0) return false;
  const olderIds = older.map((o) => o.id);
  const n = await prisma.externalTrainingReport.count({
    where: { requestId: { in: olderIds } },
  });
  return n > 0;
}

/** Non-empty lines / bullets in nextSteps (deterministic, no NLP). */
export function parseNextStepLines(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const t = raw.trim();
  if (!t) return [];
  return t
    .split(/(?:\r?\n|[•·]|(?<=[.!?])\s+)+/u)
    .map((s) => s.replace(/^[\s\-–—]+/u, "").trim())
    .filter((s) => s.length >= 3);
}

/** Достаточно текста в отчёте, чтобы спокойно предложить режим наблюдения (без NLP). */
function hasSubstantiveReportBody(summary: string, resultNotes: string | null): boolean {
  const s = summary.trim().length;
  const n = (resultNotes ?? "").trim().length;
  return s >= 18 || n >= 10;
}

function explicitNoContinuation(summary: string, resultNotes: string | null): boolean {
  const blob = `${summary}\n${resultNotes ?? ""}`.toLowerCase();
  const patterns = [
    "не требуется",
    "не требуются",
    "достаточно",
    "фокус закрыт",
    "внешний фокус закрыт",
    "закрыт",
    "завершён",
    "завершен",
    "завершена",
    "отработан",
    "отработано",
    "можно не продолж",
    "отдельное продолжение не",
    "дальнейших занятий не",
    "на этом этапе всё",
  ];
  return patterns.some((p) => blob.includes(p));
}

export async function buildExternalFollowUpRecommendation(params: {
  playerId: string;
  parentId: string;
}): Promise<ExternalFollowUpRecommendationView | null> {
  const playerId = params.playerId.trim();
  const parentId = params.parentId.trim();
  if (!playerId || !parentId) return null;

  const request = await getLatestExternalTrainingRequestForParentPlayer({
    parentId,
    playerId,
  });
  if (!request) return null;

  const report = await getExternalTrainingReportByRequestId(request.id);
  if (!report) return null;

  const nextLines = parseNextStepLines(report.nextSteps);
  const summary = report.summary?.trim() ?? "";
  const notes = report.resultNotes?.trim() ?? null;

  const phase = await buildPlayerDevelopmentPhase({ playerId, parentId });

  const stopAssessment = await assessStopRecommendation({
    playerId,
    parentId,
    request,
    nextLines,
    summaryTrimmed: summary,
  });
  if (stopAssessment.stop) {
    return withPhase(stopRecommendedView(stopAssessment.explanationPoints), phase);
  }

  const load = await evaluatePlayerLoad({ playerId });
  if (load.isHighLoad) {
    return withPhase(deferDueToLoadView(load), phase);
  }

  const allowFollowUpStrong = nextLines.length > 0;
  const allowFollowUpPassiveWeak =
    phase === "passive" &&
    !allowFollowUpStrong &&
    hasSubstantiveReportBody(summary, notes);
  const wantsFollowUp = allowFollowUpStrong || allowFollowUpPassiveWeak;

  if (wantsFollowUp) {
    if (phase === "consolidation") {
      return withPhase(
        monitorOnlyRecommendation({ consolidationInsteadOfFollowUp: true }),
        phase
      );
    }
    const followExplanation = allowFollowUpStrong
      ? [
          "Во внешнем отчёте в текущем цикле отмечен следующий фокус.",
          "Арена опирается на того же внешнего тренера в запросе — продолжение возможно без смены контакта.",
          "По нагрузке сейчас видно окно, в котором дополнительный шаг не выглядит лишним.",
        ]
      : [
          "Фаза по времени последнего внешнего отчёта позволяет аккуратно вернуться к теме.",
          "Арена учитывает сохранённый контекст отчёта: текст достаточно содержательный для разговора о продолжении.",
          "Решение о шаге остаётся за вами; допконтур не навязывает срочности.",
        ];
    const coachId = request.coachId?.trim();
    const trainerCandidate: TrainerCandidateView | undefined =
      allowFollowUpStrong && coachId
        ? {
            coachId,
            coachName: resolveArenaCoachDisplayName(coachId),
            shortDescription: buildTrainerShortDescription(request, nextLines),
          }
        : undefined;

    return withPhase(
      {
        type: "follow_up_training",
        title: allowFollowUpStrong
          ? "Арена организует следующую тренировку"
          : "Арена предлагает продолжить дополнительную работу",
        summary: allowFollowUpStrong
          ? FOLLOW_UP_SUMMARY_STRONG
          : FOLLOW_UP_SUMMARY_PASSIVE_WEAK,
        actionLabel: allowFollowUpStrong ? "Согласовать тренировку" : "Продолжить с Ареной",
        deferLabel: "Не сейчас",
        sourceNote: SOURCE_NOTE_BASE,
        explanationPoints: followExplanation,
        trainerCandidate,
        trainerPickExplanation: trainerCandidate ? TRAINER_PICK_EXPLANATION : undefined,
      },
      phase
    );
  }

  const closureExplicit =
    request.status === "in_progress" && explicitNoContinuation(summary, notes);

  if (hasSubstantiveReportBody(summary, notes) && !closureExplicit) {
    return withPhase(monitorOnlyRecommendation(), phase);
  }

  if (closureExplicit) {
    return withPhase(
      {
        type: "focus_closed",
        title: "Внешний фокус сейчас закрыт",
        summary:
          "По этому внешнему фокусу отдельное продолжение сейчас не требуется. Основной контур школы остаётся опорой; при необходимости следующий цикл можно обсудить позже.",
        actionLabel: null,
        deferLabel: null,
        sourceNote: SOURCE_NOTE_BASE,
        explanationPoints: [
          "В тексте отчёта и статусе запроса сейчас видно завершение внешнего фокуса.",
          "Арена опирается на явные формулировки в отчёте: продолжение по этому направлению сейчас не требуется.",
          "Основная работа остаётся в школе; дополнительный контур можно не расширять.",
        ],
      },
      phase
    );
  }

  return null;
}
