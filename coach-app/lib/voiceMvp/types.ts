import { VOICE_MVP_SOURCE } from "./constants";

export type VoiceUiPhase = "idle" | "recording" | "processing" | "ready" | "failed";

export interface VoiceCoachDraftContext {
  playerId?: string;
  playerLabel?: string;
  /** Локальный черновик сессии (название), если есть */
  sessionHint?: string;
  /** Название команды, если когда-нибудь подтянем из хранилища */
  teamLabel?: string;
  /** Время старта черновика сессии из coach input (ms) */
  sessionStartedAt?: number;
}

export interface VoiceCoachDraft {
  id: string;
  createdAt: string;
  source: typeof VOICE_MVP_SOURCE;
  transcript: string;
  summary: string | null;
  extractedPoints: string[];
  recordingDurationSec: number;
  context?: VoiceCoachDraftContext;
}
