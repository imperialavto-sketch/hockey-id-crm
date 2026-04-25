/**
 * Video analysis service.
 *
 * Canonical SSOT (Bearer + optional x-parent-id):
 * - GET  /api/parent/mobile/player/:playerId/video-analysis — list
 * - POST /api/parent/mobile/player/:playerId/video-analysis — multipart upload + AI + PlayerVideoAnalysis
 * - GET  /api/parent/mobile/player/:playerId/video-analysis/:analysisId — detail { request, result }
 * - POST /api/parent/mobile/player/:playerId/video-analysis/:analysisId/retry — re-run AI
 *
 * Local AsyncStorage + mocks remain only for demo / __DEV__ fallbacks via withFallback and list/detail catch paths.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/lib/api";
import type {
  VideoAnalysisRequest,
  VideoAnalysisResult,
} from "@/types/video-analysis";
import { videoAnalysisProcessor } from "@/services/video-analysis-processor";
import { logApiError } from "@/lib/apiErrors";
import { isDev } from "@/config/api";
import { MOCK_VIDEO_ANALYSIS_REQUESTS, MOCK_VIDEO_ANALYSIS_RESULTS } from "@/data/mockVideoAnalyses";
import { withFallback } from "@/utils/withFallback";

const PARENT_ID_HEADER = "x-parent-id";

function headers(parentId?: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  if (parentId) h[PARENT_ID_HEADER] = parentId;
  return h;
}

/** Map API response to VideoAnalysisRequest */
function mapRequest(api: unknown): VideoAnalysisRequest {
  const a = api as Record<string, unknown>;
  return {
    id: String(a.id ?? ""),
    playerId: String(a.playerId ?? ""),
    uploadedByUserId: String(a.uploadedByUserId ?? a.parentId ?? ""),
    title: a.title as string | undefined,
    description: a.description as string | undefined,
    videoUrl: a.videoUrl as string | undefined,
    storageKey: a.storageKey as string | undefined,
    durationSeconds: Number(a.durationSeconds ?? 0),
    fileSizeBytes: Number(a.fileSizeBytes ?? 0),
    mimeType: String(a.mimeType ?? "video/mp4"),
    thumbnailUrl: a.thumbnailUrl as string | undefined,
    uploadStatus: (a.uploadStatus ?? "success") as VideoAnalysisRequest["uploadStatus"],
    analysisStatus: (a.analysisStatus ?? a.status ?? "processing") as VideoAnalysisRequest["analysisStatus"],
    errorMessage: a.errorMessage as string | undefined,
    createdAt: String(a.createdAt ?? new Date().toISOString()),
    updatedAt: String(a.updatedAt ?? new Date().toISOString()),
    completedAt: a.completedAt as string | undefined,
  };
}

/** Map API response to VideoAnalysisResult */
function mapResult(api: unknown): VideoAnalysisResult {
  const a = api as Record<string, unknown>;
  return {
    id: String(a.id ?? ""),
    analysisRequestId: String(a.analysisRequestId ?? a.analysisId ?? ""),
    summary: String(a.summary ?? ""),
    strengths: Array.isArray(a.strengths) ? a.strengths.map(String) : [],
    weaknesses: Array.isArray(a.weaknesses) ? a.weaknesses.map(String) : [],
    recommendations: Array.isArray(a.recommendations) ? a.recommendations.map(String) : [],
    keyMoments: Array.isArray(a.keyMoments) ? a.keyMoments.map(String) : [],
    confidenceScore: Number(a.confidenceScore ?? 0),
    createdAt: String(a.createdAt ?? new Date().toISOString()),
  };
}
const STORAGE_KEY = "@hockey_video_analysis_requests";
const RESULT_STORAGE_KEY = "@hockey_video_analysis_results";
const PROCESSING_DELAY_MS = 15000;
/** Mobile route runs file IO + OpenAI — allow long timeout. */
const VIDEO_ANALYSIS_POST_TIMEOUT_MS = 180_000;

function mapFromMobileCreate(
  api: Record<string, unknown>,
  fallbackPlayerId: string,
  uploadedByUserId: string
): VideoAnalysisRequest {
  const now = new Date().toISOString();
  const createdAt = String(api.createdAt ?? now);
  const updatedAt = String(api.updatedAt ?? createdAt);
  return {
    id: String(api.id ?? ""),
    playerId: String(api.playerId ?? fallbackPlayerId),
    uploadedByUserId: String(uploadedByUserId || ""),
    title: api.title as string | undefined,
    description: api.description as string | undefined,
    videoUrl: api.videoUrl as string | undefined,
    storageKey: undefined,
    durationSeconds: Number(api.durationSeconds ?? 0),
    fileSizeBytes: Number(api.fileSizeBytes ?? 0),
    mimeType: String(api.mimeType ?? "video/mp4"),
    thumbnailUrl: undefined,
    uploadStatus: "success",
    analysisStatus: "completed",
    errorMessage: undefined,
    createdAt,
    updatedAt,
    completedAt: createdAt,
  };
}

async function getLocalRequests(): Promise<VideoAnalysisRequest[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return MOCK_VIDEO_ANALYSIS_REQUESTS;
  try {
    return JSON.parse(raw) as VideoAnalysisRequest[];
  } catch {
    return MOCK_VIDEO_ANALYSIS_REQUESTS;
  }
}

async function setLocalRequests(items: VideoAnalysisRequest[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function getLocalResults(): Promise<VideoAnalysisResult[]> {
  const raw = await AsyncStorage.getItem(RESULT_STORAGE_KEY);
  if (!raw) return MOCK_VIDEO_ANALYSIS_RESULTS;
  try {
    return JSON.parse(raw) as VideoAnalysisResult[];
  } catch {
    return MOCK_VIDEO_ANALYSIS_RESULTS;
  }
}

async function setLocalResults(items: VideoAnalysisResult[]): Promise<void> {
  await AsyncStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(items));
}

async function patchRequest(
  requestId: string,
  patch: Partial<VideoAnalysisRequest>
): Promise<VideoAnalysisRequest | null> {
  const requests = await getLocalRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx < 0) return null;
  const updated: VideoAnalysisRequest = {
    ...requests[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  requests[idx] = updated;
  await setLocalRequests(requests);
  return updated;
}

async function maybeAutoCompleteProcessing(playerId: string): Promise<void> {
  const requests = await getLocalRequests();
  const results = await getLocalResults();
  const now = Date.now();
  let changed = false;
  let resultChanged = false;

  for (const req of requests) {
    if (req.playerId !== playerId || req.analysisStatus !== "processing") continue;
    if (now - new Date(req.updatedAt).getTime() < PROCESSING_DELAY_MS) continue;
    req.analysisStatus = "completed";
    req.completedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    changed = true;

    if (!results.some((r) => r.analysisRequestId === req.id)) {
      const generated = await videoAnalysisProcessor.getAnalysisResult(req.id);
      if (generated) {
        results.push(generated);
        resultChanged = true;
      }
    }
  }

  if (changed) await setLocalRequests(requests);
  if (resultChanged) await setLocalResults(results);
}

/**
 * Get video analyses for player.
 * Canonical: GET /api/parent/mobile/player/:playerId/video-analysis
 * Fallback: local AsyncStorage only in demo / __DEV__ (withFallback + catch paths).
 */
export async function getVideoAnalyses(
  playerId: string,
  parentId?: string | null
): Promise<VideoAnalysisRequest[]> {
  return withFallback(
    async () => {
      try {
        const data = await apiFetch<unknown[]>(
          `/api/parent/mobile/player/${encodeURIComponent(playerId)}/video-analysis`,
          { headers: headers(parentId) }
        );
        return Array.isArray(data) ? data.map(mapRequest) : [];
      } catch (err) {
        logApiError("video-analysis", err);
        if (isDev) {
          await maybeAutoCompleteProcessing(playerId);
          const requests = await getLocalRequests();
          return requests
            .filter((r) => r.playerId === playerId)
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        }
        throw err;
      }
    },
    async () => {
      await maybeAutoCompleteProcessing(playerId);
      const requests = await getLocalRequests();
      return requests
        .filter((r) => r.playerId === playerId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
  );
}

/**
 * Get video analysis by id.
 * Canonical: GET /api/parent/mobile/player/:playerId/video-analysis/:id
 * Fallback: local AsyncStorage only in demo / __DEV__ (withFallback + catch paths).
 */
export async function getVideoAnalysisById(
  id: string,
  parentId?: string | null,
  playerId?: string | null
): Promise<{ request: VideoAnalysisRequest | null; result: VideoAnalysisResult | null }> {
  return withFallback(
    async () => {
      try {
        if (!playerId?.trim()) {
          throw new Error("Не указан игрок (playerId) для загрузки анализа");
        }
        const data = await apiFetch<unknown>(
          `/api/parent/mobile/player/${encodeURIComponent(playerId)}/video-analysis/${encodeURIComponent(id)}`,
          { headers: headers(parentId) }
        );
        if (!data || typeof data !== "object") return { request: null, result: null };
        const d = data as Record<string, unknown>;
        const request = d.request ? mapRequest(d.request) : mapRequest(data);
        const result = d.result ? mapResult(d.result) : null;
        return { request, result };
      } catch (err) {
        logApiError("video-analysis", err);
        if (isDev) {
          const requests = await getLocalRequests();
          const results = await getLocalResults();
          const request = requests.find((r) => r.id === id) ?? null;
          const result = results.find((r) => r.analysisRequestId === id) ?? null;
          return { request, result };
        }
        throw err;
      }
    },
    async () => {
      const requests = await getLocalRequests();
      const results = await getLocalResults();
      const request = requests.find((r) => r.id === id) ?? null;
      const result = results.find((r) => r.analysisRequestId === id) ?? null;
      return { request, result };
    }
  );
}

/**
 * Retry video analysis — canonical POST .../video-analysis/:analysisId/retry
 * Dev fallback: local patch only if mobile fails.
 */
export async function retryVideoAnalysis(
  analysisId: string,
  parentId?: string | null,
  playerId?: string | null
): Promise<void> {
  if (!playerId?.trim()) {
    throw new Error("Не указан игрок (playerId) для повтора анализа");
  }
  try {
    await apiFetch(
      `/api/parent/mobile/player/${encodeURIComponent(playerId)}/video-analysis/${encodeURIComponent(analysisId)}/retry`,
      {
        method: "POST",
        headers: { ...headers(parentId), "Content-Type": "application/json" },
        body: JSON.stringify({}),
        timeoutMs: VIDEO_ANALYSIS_POST_TIMEOUT_MS,
      }
    );
  } catch (err) {
    logApiError("videoAnalysisService.retryVideoAnalysis", err);
    if (isDev) {
      await patchRequest(analysisId, { analysisStatus: "processing", errorMessage: undefined });
    } else {
      throw err;
    }
  }
}

/**
 * Create analysis: canonical POST /api/parent/mobile/player/:playerId/video-analysis (multipart).
 */
export async function createAndUploadVideoAnalysis(params: {
  playerId: string;
  parentId: string;
  title?: string;
  description?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  durationSeconds: number;
  videoUri: string;
}): Promise<VideoAnalysisRequest> {
  try {
    const formData = new FormData();
    formData.append(
      "video",
      {
        uri: params.videoUri,
        name: params.fileName,
        type: params.mimeType,
      } as unknown as Blob
    );
    if (params.description?.trim()) {
      formData.append("description", params.description.trim());
    }
    if (params.title?.trim()) {
      formData.append("exerciseType", params.title.trim());
    }

    const raw = await apiFetch<Record<string, unknown>>(
      `/api/parent/mobile/player/${encodeURIComponent(params.playerId)}/video-analysis`,
      {
        method: "POST",
        body: formData,
        headers: headers(params.parentId),
        timeoutMs: VIDEO_ANALYSIS_POST_TIMEOUT_MS,
      }
    );

    return mapFromMobileCreate(raw, params.playerId, params.parentId);
  } catch (err) {
    logApiError("video-analysis createAndUpload", err);
    throw new Error("Не удалось создать запрос анализа");
  }
}
