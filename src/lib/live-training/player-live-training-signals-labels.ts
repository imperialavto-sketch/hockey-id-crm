/**
 * Человекочитаемые подписи для Live Training signals (coach UI).
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";

export function liveTrainingSignalDirectionLabelRu(
  d: LiveTrainingObservationSentiment
): string {
  if (d === "positive") return "Позитивный сигнал";
  if (d === "negative") return "Требует внимания";
  return "Наблюдение";
}

export function liveTrainingMetricDomainLabelRu(domain: string): string {
  const m: Record<string, string> = {
    engagement: "Вовлечённость",
    behavior: "Поведение",
    workrate: "Работа и старание",
    ofp: "ОФП",
    skating: "Катание",
    shooting: "Броски",
    puck_control: "Контроль шайбы",
    pace: "Темп",
    coachability: "Реакция на коррекцию",
    general: "Общие наблюдения",
  };
  return m[domain] ?? domain;
}

export function liveTrainingMetricKeyLabelRu(key: string): string {
  const m: Record<string, string> = {
    coach_feedback_positive: "Похвала",
    correction_needed: "Коррекция",
    attention: "Внимание к заданию",
    discipline: "Дисциплина",
    effort: "Старание",
    technique_execution: "Техника тела",
    skating_execution: "Катание",
    shooting_execution: "Броски",
    puck_control_execution: "Ведение",
    pace: "Темп",
    coach_observation: "Наблюдение",
  };
  return m[key] ?? key;
}
