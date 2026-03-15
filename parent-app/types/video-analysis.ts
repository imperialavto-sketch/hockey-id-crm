export type VideoAnalysisStatus =
  | "draft"
  | "uploading"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export type UploadStatus = "idle" | "picking" | "ready" | "uploading" | "success" | "error";

export interface AnalysisInsight {
  id: string;
  type: "strength" | "weakness" | "recommendation" | "moment";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  scoreDelta?: number;
}

export interface VideoAnalysisRequest {
  id: string;
  playerId: string;
  uploadedByUserId: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  storageKey?: string;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
  thumbnailUrl?: string;
  uploadStatus: UploadStatus;
  analysisStatus: VideoAnalysisStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface VideoAnalysisResult {
  id: string;
  analysisRequestId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  keyMoments: string[];
  confidenceScore: number;
  createdAt: string;
}

export interface VideoUploadInitPayload {
  playerId: string;
  title?: string;
  description?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  durationSeconds: number;
}

export interface VideoUploadInitResponse {
  analysisRequestId: string;
  uploadUrl: string;
  storageKey: string;
  fields?: Record<string, string>;
}
