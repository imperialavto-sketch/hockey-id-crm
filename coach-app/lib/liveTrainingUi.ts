import type { LiveTrainingMode } from "@/types/liveTraining";

export const LIVE_TRAINING_MODE_LABELS: Record<LiveTrainingMode, string> = {
  ice: "Лёд",
  ofp: "ОФП",
  mixed: "Смешанная",
};

export function formatLiveTrainingMode(mode: LiveTrainingMode): string {
  return LIVE_TRAINING_MODE_LABELS[mode];
}
