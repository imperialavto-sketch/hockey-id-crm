export type VoiceProcessingInput = {
  text: string;
  playerName?: string;
};

export type VoiceProcessingResult = {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  actions: {
    title: string;
    priority?: "low" | "medium" | "high";
  }[];
  parentDraft: string;
};

/** Контракт будущего AI-провайдера (HTTP/SDK). */
export type VoiceProcessingProvider = (
  input: VoiceProcessingInput
) => Promise<VoiceProcessingResult>;
