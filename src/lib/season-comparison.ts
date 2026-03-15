/**
 * Compares latest season stats with previous season.
 * Returns comparison data and interpretation texts.
 */

export type ComparisonVerdict = "positive" | "negative" | "neutral";

export interface MetricComparison {
  label: string;
  current: number;
  previous: number;
  diff: number;
  verdict: ComparisonVerdict;
  displayText: string;
}

export interface SeasonComparisonResult {
  hasComparison: boolean;
  latestSeason: string;
  previousSeason: string;
  metrics: MetricComparison[];
  interpretations: string[];
}

function getVerdict(
  metric: "games" | "goals" | "assists" | "points" | "pim",
  diff: number
): ComparisonVerdict {
  if (diff === 0) return "neutral";
  if (metric === "pim") return diff > 0 ? "negative" : "positive";
  return diff > 0 ? "positive" : "negative";
}

export function compareSeasons(
  stats: Array<{
    season?: string | null;
    games?: number | null;
    goals?: number | null;
    assists?: number | null;
    points?: number | null;
    pim?: number | null;
  }> | null | undefined
): SeasonComparisonResult {
  const list = Array.isArray(stats) ? stats : [];
  const latest = list[0];
  const previous = list[1];

  if (!latest || !previous) {
    return {
      hasComparison: false,
      latestSeason: "",
      previousSeason: "",
      metrics: [],
      interpretations: [],
    };
  }

  const metrics: Array<{
    key: "games" | "goals" | "assists" | "points" | "pim";
    label: string;
  }> = [
    { key: "games", label: "Игры" },
    { key: "goals", label: "Голы" },
    { key: "assists", label: "Передачи" },
    { key: "points", label: "Очки" },
    { key: "pim", label: "Штраф" },
  ];

  const result: MetricComparison[] = metrics.map(({ key, label }) => {
    const current = Number(latest?.[key]) ?? 0;
    const prev = Number(previous?.[key]) ?? 0;
    const diff = current - prev;
    const verdict = getVerdict(key, diff);
    const sign = diff > 0 ? "+" : "";
    const displayText = `${label}: ${current} vs ${prev} (${sign}${diff})`;
    return { label, current, previous: prev, diff, verdict, displayText };
  });

  const interpretations: string[] = [];
  const goalsDiff = (Number(latest?.goals) ?? 0) - (Number(previous?.goals) ?? 0);
  const assistsDiff = (Number(latest?.assists) ?? 0) - (Number(previous?.assists) ?? 0);
  const pointsDiff = (Number(latest?.points) ?? 0) - (Number(previous?.points) ?? 0);
  const pimDiff = (Number(latest?.pim) ?? 0) - (Number(previous?.pim) ?? 0);
  const gamesDiff = (Number(latest?.games) ?? 0) - (Number(previous?.games) ?? 0);

  if (pointsDiff > 0) interpretations.push("Есть прогресс в результативности");
  if (assistsDiff > 0) interpretations.push("Улучшается командная игра");
  if (pimDiff >= 5) interpretations.push("Нужно улучшить игровую дисциплину");
  if (gamesDiff < 0) interpretations.push("Стоит обратить внимание на стабильность участия");

  return {
    hasComparison: true,
    latestSeason: latest?.season ?? "—",
    previousSeason: previous?.season ?? "—",
    metrics: result,
    interpretations,
  };
}
