/**
 * Copy for coach training session detail (`schedule/[id]`). No business logic.
 */

import { COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';
import { COACH_SCHEDULE_AUTH_LINE } from '@/lib/coachScheduleUi';

export { COACH_SCHEDULE_AUTH_LINE };

export const COACH_SESSION_DETAIL_COPY = {
  heroEyebrow: 'Тренировка',
  loadingTitle: 'Загружаем сессию',
  loadingSubtitle: 'Команда, посещаемость, отчёт и оценки.',
  noIdTitle: 'Не удалось открыть тренировку',
  noIdSubtitle: 'Вернитесь к расписанию и выберите слот снова.',
  loadErrorFallback: 'Не удалось загрузить тренировку',
  loadErrorTitle: 'Сессия недоступна',
  retryCta: COACH_DASHBOARD_COPY.retryCta,
  backToSchedule: 'К расписанию',
  networkRetryHint: COACH_DASHBOARD_COPY.networkRetryHint,
  notFoundShort: 'Не найдено',
  /** Shown when report block fails to load (inner try/catch). */
  reportBlockLoadFailed: 'Не удалось загрузить отчёт',
  /** Shown when evaluations list fails to load. */
  evaluationsBlockLoadFailed: 'Не удалось загрузить оценки',
  /** Save operations (report, eval note, scores). */
  saveFailed: 'Не удалось сохранить',
  bulkSaveFailed: 'Не удалось сохранить массово',
  metaTeam: 'Команда',
  metaGroup: 'Группа',
  metaCoach: 'Тренер',
  metaLocation: 'Место',
  metaStatus: 'Статус',
  sectionAttendance: 'Посещаемость',
  bulkAllPresent: 'Все были',
  bulkAllAbsent: 'Все отсутствовали',
  attendanceListFailed: 'Не удалось загрузить список игроков',
  attendanceEmptyHint:
    'На эту неделю игроки не распределены по группам. Сначала назначьте группы в CRM.',
  attendancePresent: 'Был',
  attendanceAbsent: 'Нет',
  sectionReport: 'Отчёт по тренировке',
  reportLoading: 'Загружаем…',
  reportLabelFocus: 'Что делали',
  reportLabelSummary: 'Итог тренировки',
  reportLabelCoach: 'Комментарий тренера',
  reportLabelParents: 'Сообщение родителям',
  reportPlaceholderFocus: 'Например: работа в средней зоне, броски',
  reportPlaceholderSummary: 'Краткий итог',
  reportPlaceholderCoach: 'Внутренний комментарий (опционально)',
  reportPlaceholderParents: 'Текст для родителей в приложении',
  reportSaveCta: 'Сохранить отчёт',
  reportSaving: 'Сохраняем…',
  reportSaved: 'Сохранено',
  sectionEval: 'Оценка игроков',
  evalLoading: 'Загружаем оценки…',
  evalEmpty: 'Нет игроков группы на эту неделю для оценки.',
  evalEffort: 'Старание',
  evalFocus: 'Концентрация',
  evalDiscipline: 'Дисциплина',
  notePlaceholder: 'Комментарий тренера',
  noteCancel: 'Отмена',
  noteSave: 'Сохранить',
  commentCta: 'Комментарий',
  commentSavedMark: ' · сохранён',
  evalSectionHint: 'Баллы и заметки сохраняются в CRM; подсказки эфира — только контекст.',
  evalLiveContextPrefix: 'Эфир:',
  reportSectionHint: 'Текст отчёта видят родители там, где включена публикация полей.',
  liveTrainingKicker: 'Живая тренировка',
  /** Prefix for aggregated behavioral explainability on live report draft screen. */
  liveReportDraftTeamBehaviorContextPrefix: 'По отметкам эфира (концентрация и дисциплина):',
} as const;
