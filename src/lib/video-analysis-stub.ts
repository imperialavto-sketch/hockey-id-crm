/**
 * In-memory stub store for video analysis flow (POST /api/video/upload,
 * POST /api/video-analysis, GET /api/video-analysis/:id, POST retry).
 * Replace with DB (e.g. new table or PlayerVideoAnalysis extension) for persistence.
 */

export interface StubVideoAnalysisRequest {
  id: string;
  playerId: string;
  uploadedByUserId: string;
  videoUrl?: string;
  uploadStatus: string;
  analysisStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface StubVideoAnalysisResult {
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

const requests = new Map<string, StubVideoAnalysisRequest>();
const results = new Map<string, StubVideoAnalysisResult>();

export function getVideoAnalysisRequest(id: string): StubVideoAnalysisRequest | undefined {
  return requests.get(id);
}

export function getVideoAnalysisResult(requestId: string): StubVideoAnalysisResult | undefined {
  return results.get(requestId);
}

export function setVideoAnalysisRequest(req: StubVideoAnalysisRequest): void {
  requests.set(req.id, req);
}

export function setVideoAnalysisResult(res: StubVideoAnalysisResult): void {
  results.set(res.analysisRequestId, res);
}

export function updateVideoAnalysisRequest(
  id: string,
  patch: Partial<StubVideoAnalysisRequest>
): StubVideoAnalysisRequest | undefined {
  const existing = requests.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  requests.set(id, updated);
  return updated;
}
