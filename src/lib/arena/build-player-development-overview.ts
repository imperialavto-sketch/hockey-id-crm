import {
  buildPlayerDevelopmentPhase,
  phaseLabelRu,
  type PlayerDevelopmentPhase,
} from "@/lib/arena/build-player-development-phase";
import { evaluatePlayerLoad } from "@/lib/arena/build-external-follow-up-recommendation";
import { getLatestExternalTrainingRequestForParentPlayer } from "@/lib/arena/external-training-requests";
import { getLatestExternalTrainingReportForPlayer } from "@/lib/arena/external-training-reports";

export type PlayerDevelopmentOverview = {
  phase: PlayerDevelopmentPhase;
  phaseLabel: string;
  summary: string;
  signals: string[];
  /** Почему выбрана фаза — короткие причины, не дублируют signals дословно. */
  explanationPoints: string[];
};

const MS_PER_DAY = 86_400_000;

function daysSinceReportAt(createdAt: Date, nowMs: number): number {
  return (nowMs - createdAt.getTime()) / MS_PER_DAY;
}

/**
 * Детерминированная сборка обзора по уже загруженным входам (для regression guard и async-обёртки).
 * Поведение ветвлений совпадает с прежней реализацией `buildPlayerDevelopmentOverview`.
 */
export function composePlayerDevelopmentOverviewForRegressionGuard(params: {
  phase: PlayerDevelopmentPhase;
  load: { weeklySessions: number; isHighLoad: boolean };
  hasRequest: boolean;
  latestReport: { createdAt: Date } | null;
  nowMs: number;
}): PlayerDevelopmentOverview {
  const { phase, load, hasRequest, latestReport, nowMs } = params;
  const phaseLabel = phaseLabelRu(phase);
  const reportAgeDays = latestReport ? daysSinceReportAt(latestReport.createdAt, nowMs) : 999;
  const reportRecent = reportAgeDays < 7;

  let summary: string;
  const signals: string[] = [];
  const explanationPoints: string[] = [];

  switch (phase) {
    case "active_focus":
      summary = "Сейчас идёт активная проработка выбранного фокуса.";
      if (hasRequest) {
        signals.push("Подключён дополнительный контур: есть активный запрос в поле Арены.");
        explanationPoints.push("Арена учитывает активный запрос в дополнительном контуре для этого ребёнка.");
      } else {
        signals.push("Дополнительный контур в зоне внимания: недавний контекст по внешнему источнику.");
        explanationPoints.push(
          "Сейчас видно недавний внешний отчёт или короткий интервал с последнего результата."
        );
      }
      if (latestReport && reportAgeDays < 5) {
        explanationPoints.push("Последний внешний результат зафиксирован недавно — фаза остаётся «в работе».");
      } else if (hasRequest) {
        explanationPoints.push("Открытый запрос удерживает допконтур в активной фазе, даже если отчёт старше.");
      }
      if (reportRecent || load.weeklySessions >= 1) {
        signals.push(
          "По расписанию команды и последним данным недавно есть движение в основном или дополнительном контуре — сверяйте с вашей картиной."
        );
      } else {
        signals.push("Сверяйте календарь команды и блоки Арены ниже по мере необходимости.");
      }
      explanationPoints.push(
        "Основной тренировочный контекст по смыслу остаётся в работе команды; допконтур рядом."
      );
      if (load.isHighLoad) {
        signals.push(
          "По текущему тренировочному ритму команды сейчас плотный график — по ориентиру лучше не форсировать дополнительный слой поверх основного режима."
        );
      }
      break;

    case "consolidation":
      summary = "Сейчас идёт закрепление результата после дополнительной работы.";
      signals.push("Был внешний сигнал: дополнительный контур уже дал материал для опоры.");
      signals.push("Сейчас без новых назначений в дополнительном контуре — удобно наблюдать в школе.");
      explanationPoints.push(
        "Арена опирается на дату последнего внешнего отчёта: прошло от нескольких дней до двух недель."
      );
      explanationPoints.push("Сейчас новых внешних назначений нет — удобная пауза для закрепления.");
      explanationPoints.push("Ориентир по режиму: в первую очередь тренировки команды.");
      if (load.isHighLoad) {
        signals.push(
          "Сейчас у команды по календарю плотный тренировочный ритм — разумнее вернуться к вопросу допконтура позже."
        );
      }
      break;

    case "passive":
      summary = "Сейчас развитие идёт в основном в рамках тренировок команды.";
      signals.push("Внешний дополнительный контур сейчас не активен.");
      signals.push("Удобно опираться на наблюдение за динамикой в основной работе команды.");
      explanationPoints.push("Арена учитывает: открытого внешнего запроса сейчас нет.");
      if (!latestReport || reportAgeDays >= 14) {
        explanationPoints.push(
          "Последний внешний отчёт отсутствует или старше двух недель — допконтур в спокойной фазе."
        );
      }
      explanationPoints.push("Ориентир по режиму: в первую очередь тренировки команды.");
      if (load.weeklySessions >= 3) {
        signals.push(
          "За последнюю неделю в расписании команды несколько тренировок — это ориентир по тренировочному графику команды, а не про фактическое участие в каждой смене."
        );
      } else if (load.isHighLoad) {
        signals.push(
          "По тренировочному контексту команды сейчас плотнее обычного — дополнительный слой пока не в приоритете."
        );
      }
      break;
  }

  return {
    phase,
    phaseLabel,
    summary,
    signals: signals.slice(0, 3),
    explanationPoints: explanationPoints.slice(0, 3),
  };
}

/**
 * Единый обзор состояния развития для родителя (агрегация фазы, запроса, отчёта, нагрузки).
 * Не меняет правила Арены — только читает уже существующие сигналы.
 */
export async function buildPlayerDevelopmentOverview(params: {
  playerId: string;
  parentId: string;
}): Promise<PlayerDevelopmentOverview> {
  const playerId = params.playerId.trim();
  const parentId = params.parentId.trim();

  const [phase, load, request, latestReport] = await Promise.all([
    buildPlayerDevelopmentPhase({ playerId, parentId }),
    evaluatePlayerLoad({ playerId }),
    getLatestExternalTrainingRequestForParentPlayer({ playerId, parentId }),
    getLatestExternalTrainingReportForPlayer(playerId),
  ]);

  return composePlayerDevelopmentOverviewForRegressionGuard({
    phase,
    load,
    hasRequest: Boolean(request),
    latestReport: latestReport ? { createdAt: latestReport.createdAt } : null,
    nowMs: Date.now(),
  });
}
