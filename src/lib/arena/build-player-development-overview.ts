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

function daysSinceReport(createdAt: Date): number {
  return (Date.now() - createdAt.getTime()) / MS_PER_DAY;
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

  const phaseLabel = phaseLabelRu(phase);
  const reportAgeDays = latestReport ? daysSinceReport(latestReport.createdAt) : 999;
  const reportRecent = reportAgeDays < 7;

  let summary: string;
  const signals: string[] = [];
  const explanationPoints: string[] = [];

  switch (phase) {
    case "active_focus":
      summary = "Сейчас идёт активная проработка выбранного фокуса.";
      if (request) {
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
      } else if (request) {
        explanationPoints.push("Открытый запрос удерживает допконтур в активной фазе, даже если отчёт старше.");
      }
      if (reportRecent || load.weeklySessions >= 1) {
        signals.push(
          "Недавно была активность по расписанию команды или по дополнительному источнику."
        );
      } else {
        signals.push("Сверяйте календарь команды и блоки Арены ниже по мере необходимости.");
      }
      explanationPoints.push("Основная нагрузка по смыслу остаётся в тренировках команды; допконтур рядом.");
      if (load.isHighLoad) {
        signals.push(
          "Текущая нагрузка в основном контуре заметная — сейчас лучше не наращивать дополнительный слой."
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
      explanationPoints.push("Основная нагрузка остаётся в тренировках команды.");
      if (load.isHighLoad) {
        signals.push(
          "Нагрузка по расписанию команды сейчас существенная — вернитесь к вопросу допконтура позже."
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
      explanationPoints.push("Основная нагрузка остаётся в тренировках команды.");
      if (load.weeklySessions >= 3) {
        signals.push("В календаре команды за последнюю неделю несколько тренировок — ритм регулярный.");
      } else if (load.isHighLoad) {
        signals.push("По расписанию команды нагрузка заметная — дополнительный слой пока не приоритетен.");
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
