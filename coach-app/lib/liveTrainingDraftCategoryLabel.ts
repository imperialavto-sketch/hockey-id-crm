/**
 * Человекочитаемые подписи для rule-based категорий живой тренировки (серверные slug).
 */

const LABELS: Record<string, string> = {
  praise: "Похвала",
  correction: "Коррекция",
  attention: "Внимание / слушание",
  discipline: "Дисциплина",
  effort: "Вклад / доработка",
  ofp_technique: "ОФП / техника тела",
  skating: "Катание",
  shooting: "Броски",
  puck_control: "Ведение / контроль шайбы",
  pace: "Темп / скорость",
  general_observation: "Общее наблюдение",
  общее: "Общее наблюдение",
};

export function formatLiveTrainingDraftCategory(category: string): string {
  const t = category.trim();
  return LABELS[t] ?? t;
}
