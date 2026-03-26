export type VoiceUploadStage = "pending_upload" | "uploaded" | "processing" | "processed" | "failed";
export type VoiceArtifactStage = "pending" | "ready" | "failed";

export interface VoiceArtifactStatus {
  status: VoiceArtifactStage;
  updatedAt: string | null;
  error: string | null;
}

export interface VoiceTranscriptStatus extends VoiceArtifactStatus {
  text: string | null;
}

export interface VoiceSummaryStatus extends VoiceArtifactStatus {
  text: string | null;
  highlights: string[] | null;
}

export interface VoiceDerivedArtifactsStatus {
  actionItems: VoiceArtifactStatus;
  reports: VoiceArtifactStatus;
  parentDrafts: VoiceArtifactStatus;
}

export interface VoiceProcessingStatus {
  upload: {
    uploadId: string;
    status: VoiceUploadStage;
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    durationSeconds: number | null;
    createdAt: string | null;
    updatedAt: string | null;
    provider: "openai_whisper" | "not_configured" | "stub";
  };
  transcript: VoiceTranscriptStatus;
  summary: VoiceSummaryStatus;
  derived: VoiceDerivedArtifactsStatus;
}

export interface VoiceUploadStatusResponse {
  ok: true;
  uploadId: string;
  processing: VoiceProcessingStatus;
}
