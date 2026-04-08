/**
 * PHASE 15: read-only action candidates из live training (без persistence, без LLM).
 */

export type LiveTrainingActionCandidateType =
  | "follow_up_check"
  | "focus_next_training"
  | "reinforce_positive"
  | "monitor_attention"
  | "monitor_effort"
  | "monitor_technique";

export type LiveTrainingActionCandidateDto = {
  id: string;
  /** null — командная строка из SessionMeaning (задача без привязки к игроку). */
  playerId: string | null;
  playerName: string;
  source: "live_training";
  actionType: LiveTrainingActionCandidateType;
  title: string;
  body: string;
  tone: "positive" | "attention" | "neutral";
  priority: "high" | "medium" | "low";
  basedOn: {
    signalCount: number;
    domains: string[];
    lastSessionAt: string | null;
  };
};

export type LiveTrainingActionCandidatesResponse = {
  items: LiveTrainingActionCandidateDto[];
  lowData: boolean;
};
