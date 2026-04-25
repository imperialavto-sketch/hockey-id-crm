/**
 * Copy for CRM team card (`(dashboard)/teams/[id]/page`). No business logic.
 */

import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";
import type { TeamPlannedVsObservedContinuityDto } from "@/lib/live-training/arena-planned-vs-observed-continuity";

/** Deterministic RU for continuity over last N planned-vs-observed facts (no LLM). */
export function formatTeamPlannedVsObservedContinuityRu(
  dto: TeamPlannedVsObservedContinuityDto
): { headline: string; support?: string } {
  switch (dto.kind) {
    case "repeated_alignment":
      return {
        headline: "Последние подтверждённые live-сессии в целом совпадали с плановым фокусом.",
        support: `Подряд таких записей в выборке: ${dto.streak} (всего ${dto.sampleSize}).`,
      };
    case "repeated_gap":
      return {
        headline: "В нескольких последних live-сессиях наблюдалось расхождение между планом и фактом.",
        support: `Подряд таких записей в выборке: ${dto.streak} (всего ${dto.sampleSize}).`,
      };
    case "unstable":
      return {
        headline: "Итоги последних сессий чередуются: совпадение и расхождение с планом сменяют друг друга.",
        support: `Записей в выборке: ${dto.sampleSize}.`,
      };
    case "insufficient_history":
      if (dto.detail === "need_three") {
        return {
          headline: "Данных для устойчивого вывода по серии сессий пока недостаточно.",
          support: `Сохранено записей: ${dto.sampleSize}. Нужно минимум три подтверждённые сессии с фактом.`,
        };
      }
      return {
        headline: "По последним сессиям нет повторяющегося однотипного исхода и явного чередования.",
        support: "Смотрите строки ниже по каждой сессии.",
      };
    case "insufficient_data":
      if (dto.detail === "all_sessions") {
        return {
          headline: "По последним подтверждённым live-сессиям недостаточно сигналов для сравнения плана и факта.",
          support: "Нужны подтверждённые наблюдения со стороны тренера.",
        };
      }
      return {
        headline: "Серия содержит мало записей с полноценным сравнением плана и наблюдений.",
        support: "Часть сессий без достаточных сигналов для статуса сравнения.",
      };
  }
}

export const CRM_TEAM_DETAIL_COPY = {
  heroEyebrow: "Карточка команды",
  heroSubtitle: "Состав, слоты и посещаемость — дальше карточки игроков и тренировок.",
  loadingTitle: "Загружаем команду",
  loadingHint: "Состав, тренировки и сводные показатели.",
  errorTitle: "Не удалось загрузить команду",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  notFoundTitle: "Команда не найдена",
  notFoundHint: "Проверьте ссылку или вернитесь к списку школы.",
  backToList: "К списку команд",
  backShort: "Назад к командам",
  backSchedule: "К расписанию",
  notFoundScheduleCta: "К расписанию",
  editCta: "Редактировать",
  scheduleCta: "Расписание MVP",
  groupsCta: "Группы",
  assignmentsCta: "Распределение",
  addTrainingCta: "Тренировка",
  deleteCta: "Удалить",
  confirmDelete: "Удалить команду?",
  schoolFallback: "Школа не указана",
  rosterKicker: "Состав",
  rosterTitle: "Состав команды",
  rosterHint: "Переход в карточку игрока — посещаемость и оценки на тренировках.",
  statsKicker: "Показатели",
  statsTitle: "Командная статистика",
  statsHint: "Сводка по составу и последним тренировкам в CRM.",
  scheduleKicker: "Календарь",
  scheduleTitle: "Расписание команды",
  scheduleHint: "До 15 ближайших записей — полный журнал в карточке тренировки.",
  attendanceKicker: "Дисциплина",
  attendanceTitle: "Посещаемость по тренировкам",
  attendanceHint: "Краткая сводка по последним тренировкам.",
  emptyRoster: "Игроков в составе пока нет",
  emptySchedule: "Тренировок по команде нет",
  emptyAttendance: "Нет данных о посещаемости",
  statPlayers: "Игроков",
  statAttendance: "Посещаемость",
  statTrainingsMonth: "Тренировок в месяце",
  statTrainingsTotal: "Всего тренировок",
  tableTraining: "Тренировка",
  tableDate: "Дата",
  tablePresent: "Присутствовало",
  absentLabel: "отсутствовало",
  plannedVsObservedKicker: "План и факт",
  plannedVsObservedTitle: "Последняя подтверждённая live-сессия",
  plannedVsObservedHint:
    "Сравнение запланированного фокуса слота и наблюдений по сигналам сессии (данные после подтверждения тренером).",
  plannedVsObservedPlannedLabel: "План",
  plannedVsObservedObservedLabel: "Наблюдения",
  plannedVsObservedUnifiedLabel: "План и наблюдения",
  plannedVsObservedSignalsLabel: "Сигналы",
  plannedVsObservedDomainsLabel: "Домены наблюдений",
  plannedVsObservedRecordedAt: "Запись факта",
  plannedVsObservedConfirmedAt: "Подтверждение сессии",
  plannedVsObservedNoPlanned: "—",
  plannedVsObservedNoObserved: "—",
  plannedVsObservedContinuityKicker: "Серия последних сессий",
  plannedVsObservedHistoryKicker: "Ранее (без последней)",
} as const;
