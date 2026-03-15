/**
 * Video analysis service.
 * Primary path: real backend with x-parent-id header.
 * Fallback: local/AsyncStorage + mocks only when backend fails and isDev.
 *
 * Primary endpoints:
 * - POST /api/video/upload (FormData; file upload)
 * - POST /api/video-analysis (body: { playerId, videoId })
 * - GET /api/video-analysis/:id
 * - POST /api/video-analysis/:id/retry
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, getApiBase } from "@/lib/api";
import { delay } from "@/services/api";
import type { PlayerVideoAnalysis } from "@/types";
import type {
  VideoAnalysisRequest,
  VideoAnalysisResult,
  VideoUploadInitPayload,
  VideoUploadInitResponse,
} from "@/types/video-analysis";
import { videoStorageProvider } from "@/services/video-storage";
import { videoAnalysisProcessor } from "@/services/video-analysis-processor";
import { logApiError } from "@/lib/apiErrors";
import { isDev } from "@/config/api";
import { MOCK_VIDEO_ANALYSIS_REQUESTS, MOCK_VIDEO_ANALYSIS_RESULTS } from "@/data/mockVideoAnalyses";

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

function toLegacyModel(req: VideoAnalysisRequest, result?: VideoAnalysisResult): PlayerVideoAnalysis {
  return {
    id: req.id,
    videoUrl: req.videoUrl ?? "",
    analysisText: result?.summary ?? null,
    strengths: result?.strengths ?? [],
    growthAreas: result?.weaknesses ?? [],
    recommendations: result?.recommendations ?? [],
    createdAt: req.createdAt,
  };
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
 * Upload video file.
 * Primary: POST /api/video/upload with x-parent-id. FormData for file.
 * Fallback: mock videoId only when backend fails and isDev.
 */
export async function uploadVideo(
  file: { uri: string; fileName: string; mimeType: string },
  playerId: string,
  parentId?: string | null
): Promise<{ videoId: string } | null> {
  try {
    const formData = new FormData();
    formData.append("video", {
      uri: file.uri,
      name: file.fileName,
      type: file.mimeType,
    } as unknown as Blob);
    formData.append("playerId", playerId);

    const h: Record<string, string> = {};
    if (parentId) h[PARENT_ID_HEADER] = parentId;

    const res = await fetch(`${getApiBase()}/api/video/upload`, {
      method: "POST",
      headers: h,
      body: formData,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Ошибка ${res.status}`);
    const videoId = (data as { videoId?: string }).videoId;
    if (!videoId) throw new Error("Нет videoId в ответе");
    return { videoId };
  } catch (err) {
    logApiError("video-analysis", err);
    if (isDev) return { videoId: "vid_" + Date.now() };
    return null;
  }
}

/**
 * Create video analysis.
 * Primary: POST /api/video-analysis with x-parent-id, body { playerId, videoId }.
 * Fallback: local mock request only when backend fails and isDev.
 */
export async function createVideoAnalysis(
  playerId: string,
  videoId: string,
  parentId?: string | null
): Promise<VideoAnalysisRequest | null> {
  try {
    const data = await apiFetch<unknown>("/api/video-analysis", {
      method: "POST",
      headers: { ...headers(parentId), "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, videoId }),
    });
    if (data && typeof data === "object" && "id" in (data as object)) return mapRequest(data);
    return null;
  } catch (err) {
    logApiError("video-analysis", err);
    if (isDev) {
      const now = new Date().toISOString();
      const req: VideoAnalysisRequest = {
        id: "va_" + Date.now(),
        playerId,
        uploadedByUserId: parentId ?? "parent_1",
        videoUrl: `https://storage.hockeyid.mock/video/${videoId}.mp4`,
        durationSeconds: 30,
        fileSizeBytes: 0,
        mimeType: "video/mp4",
        uploadStatus: "success",
        analysisStatus: "processing",
        createdAt: now,
        updatedAt: now,
      };
      const requests = await getLocalRequests();
      requests.unshift(req);
      await setLocalRequests(requests);
      return req;
    }
    return null;
  }
}

/**
 * Get video analyses for player.
 * Primary: GET /api/parent/mobile/player/:playerId/video-analysis with x-parent-id.
 * Fallback: local requests only when backend fails and isDev.
 */
export async function getVideoAnalyses(
  playerId: string,
  parentId?: string | null
): Promise<VideoAnalysisRequest[]> {
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
    return [];
  }
}

/**
 * Get video analysis by id.
 * Primary: GET /api/video-analysis/:id with x-parent-id.
 * Fallback: local requests/results only when backend fails and isDev.
 */
export async function getVideoAnalysisById(
  id: string,
  parentId?: string | null
): Promise<{ request: VideoAnalysisRequest | null; result: VideoAnalysisResult | null }> {
  try {
    const data = await apiFetch<unknown>(`/api/video-analysis/${id}`, {
      headers: headers(parentId),
    });
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
    return { request: null, result: null };
  }
}

/**
 * LEGACY FALLBACK: Used only when uploadVideo + createVideoAnalysis API fails in __DEV__.
 * create-upload / mark-uploaded / start-processing flow.
 */
export async function createVideoUpload(
  payload: VideoUploadInitPayload,
  parentId?: string | null
): Promise<VideoUploadInitResponse> {
  try {
    const headers: Record<string, string> = {};
    if (parentId) headers[PARENT_ID_HEADER] = parentId;
    return await apiFetch<VideoUploadInitResponse>("/api/video-analysis/create-upload", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logApiError("videoAnalysisService.createVideoUpload", err);
    const target = await videoStorageProvider.createUploadTarget(payload);
    const requests = await getLocalRequests();
    const now = new Date().toISOString();
    requests.unshift({
      id: target.analysisRequestId,
      playerId: payload.playerId,
      uploadedByUserId: parentId ?? "parent_1",
      title: payload.title,
      description: payload.description,
      storageKey: target.storageKey,
      durationSeconds: payload.durationSeconds,
      fileSizeBytes: payload.fileSizeBytes,
      mimeType: payload.mimeType,
      uploadStatus: "ready",
      analysisStatus: "draft",
      createdAt: now,
      updatedAt: now,
    });
    await setLocalRequests(requests);
    return target;
  }
}

/** LEGACY FALLBACK: Mock upload step. */
export async function uploadVideoToTarget(
  _uploadUrl: string,
  _videoUri: string
): Promise<void> {
  await delay(1200);
}

/** LEGACY FALLBACK: Used in createAndUploadVideoAnalysis when new API fails. */
export async function markVideoUploaded(
  analysisRequestId: string,
  parentId?: string | null
): Promise<void> {
  try {
    const headers: Record<string, string> = {};
    if (parentId) headers[PARENT_ID_HEADER] = parentId;
    await apiFetch("/api/video-analysis/mark-uploaded", {
      method: "POST",
      headers,
      body: JSON.stringify({ analysisRequestId }),
    });
  } catch (err) {
    logApiError("videoAnalysisService.markVideoUploaded", err);
    const req = await patchRequest(analysisRequestId, {
      uploadStatus: "success",
      analysisStatus: "uploaded",
    });
    if (req?.storageKey) {
      const finalized = await videoStorageProvider.finalizeUpload(req.storageKey);
      await patchRequest(analysisRequestId, { videoUrl: finalized.videoUrl });
    }
  }
}

/** LEGACY FALLBACK: Used in createAndUploadVideoAnalysis when new API fails. */
export async function startVideoProcessing(
  analysisRequestId: string,
  parentId?: string | null
): Promise<void> {
  try {
    const headers: Record<string, string> = {};
    if (parentId) headers[PARENT_ID_HEADER] = parentId;
    await apiFetch("/api/video-analysis/start-processing", {
      method: "POST",
      headers,
      body: JSON.stringify({ analysisRequestId }),
    });
  } catch (err) {
    logApiError("videoAnalysisService.startVideoProcessing", err);
    await patchRequest(analysisRequestId, {
      analysisStatus: "processing",
      uploadStatus: "success",
    });
    await videoAnalysisProcessor.enqueueAnalysis(analysisRequestId);
  }
}

export async function getPlayerVideoAnalyses(
  playerId: string,
  parentId?: string | null
): Promise<VideoAnalysisRequest[]> {
  return getVideoAnalyses(playerId, parentId);
}

export async function getVideoAnalysisDetails(
  analysisId: string,
  parentId?: string | null
): Promise<{ request: VideoAnalysisRequest | null; result: VideoAnalysisResult | null }> {
  return getVideoAnalysisById(analysisId, parentId);
}

/**
 * Retry video analysis.
 * Primary: POST /api/video-analysis/:id/retry with x-parent-id.
 * Fallback: patch local request only when backend fails and isDev.
 */
export async function retryVideoAnalysis(
  analysisId: string,
  parentId?: string | null
): Promise<void> {
  try {
    await apiFetch(`/api/video-analysis/${analysisId}/retry`, {
      method: "POST",
      headers: { ...headers(parentId), "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId }),
    });
  } catch (err) {
    logApiError("videoAnalysisService.retryVideoAnalysis", err);
    if (isDev) {
      await patchRequest(analysisId, { analysisStatus: "processing", errorMessage: undefined });
    }
  }
}

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
  const uploadResult = await uploadVideo(
    { uri: params.videoUri, fileName: params.fileName, mimeType: params.mimeType },
    params.playerId,
    params.parentId
  );
  if (uploadResult) {
    const analysis = await createVideoAnalysis(
      params.playerId,
      uploadResult.videoId,
      params.parentId
    );
    if (analysis) return analysis;
  }

  if (isDev) {
    const init = await createVideoUpload(
      {
        playerId: params.playerId,
        title: params.title,
        description: params.description,
        fileName: params.fileName,
        fileSizeBytes: params.fileSizeBytes,
        mimeType: params.mimeType,
        durationSeconds: params.durationSeconds,
      },
      params.parentId
    );
    await patchRequest(init.analysisRequestId, { uploadStatus: "uploading", analysisStatus: "uploading" });
    await uploadVideoToTarget(init.uploadUrl, params.videoUri);
    await markVideoUploaded(init.analysisRequestId, params.parentId);
    await startVideoProcessing(init.analysisRequestId, params.parentId);
    const requests = await getPlayerVideoAnalyses(params.playerId, params.parentId);
    const created = requests.find((r) => r.id === init.analysisRequestId);
    if (created) return created;
  }
  throw new Error("Не удалось создать запрос анализа");
}

/** Legacy: returns PlayerVideoAnalysis[] for passport/legacy screens. */
export async function getVideoAnalysesAsLegacy(
  playerId: string,
  parentId: string
): Promise<PlayerVideoAnalysis[]> {
  const requests = await getPlayerVideoAnalyses(playerId, parentId);
  const results = await getLocalResults();
  return requests.map((r) => {
    const result = results.find((it) => it.analysisRequestId === r.id);
    return toLegacyModel(r, result);
  });
}

export async function uploadVideoAndAnalyze(
  playerId: string,
  parentId: string,
  uri: string,
  options?: { description?: string; exerciseType?: string }
): Promise<PlayerVideoAnalysis> {
  const created = await createAndUploadVideoAnalysis({
    playerId,
    parentId,
    title: options?.exerciseType,
    description: options?.description,
    fileName: `video-${Date.now()}.mp4`,
    fileSizeBytes: 40 * 1024 * 1024,
    mimeType: "video/mp4",
    durationSeconds: 30,
    videoUri: uri,
  });
  return toLegacyModel(created);
}
