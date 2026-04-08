/**
 * Подписи metricDomain из rule-based маппинга live training (серверные slug).
 */

const LABELS: Record<string, string> = {
  engagement: "Вовлечённость",
  coachability: "Коучабельность",
  behavior: "Поведение",
  workrate: "Работоспособность",
  ofp: "ОФП",
  skating: "Катание",
  shooting: "Броски",
  puck_control: "Ведение",
  pace: "Темп",
  general: "Общее",
};

export function formatLiveTrainingMetricDomain(domain: string): string {
  const t = domain.trim();
  return LABELS[t] ?? t;
}
