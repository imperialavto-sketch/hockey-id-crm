/**
 * Canonical parent progress headline (RU). Used by server audience views and
 * coach-app only when API omits `parentView.progressHeadlineRu` or synthesizes views.
 */

export type ParentProgressForHeadline = {
  team: string[];
  players: Array<{ progress: "improved" | "no_change" | "regressed" }>;
};

export function buildParentProgressHeadlineRu(
  pr: ParentProgressForHeadline | undefined
): string | undefined {
  if (!pr || (pr.team.length === 0 && pr.players.length === 0)) return undefined;
  if (pr.players.some((x) => x.progress === "regressed")) return "Требует внимания";
  if (
    pr.players.some((x) => x.progress === "improved") ||
    pr.team.some((t) => /меньше|узнаваем/i.test(t))
  ) {
    return "Есть прогресс";
  }
  return "Без изменений";
}
