import type { Recommendation } from "@/types";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

const recs: Recommendation[] = [
  { id: "1", text: PLAYER_MARK_GOLYSH.aiCoachReport.recommendation },
  { id: "2", text: PLAYER_MARK_GOLYSH.aiCoachReport.improvements[0] ?? "Усилить бросок" },
  { id: "3", text: PLAYER_MARK_GOLYSH.aiCoachReport.improvements[1] ?? "Работа у борта" },
];

export const mockRecommendations: Record<string, Recommendation[]> = {
  [PLAYER_MARK_GOLYSH.id]: recs,
  "1": recs,
};
