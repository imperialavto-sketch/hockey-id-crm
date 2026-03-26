import { API_BASE_URL } from "@/lib/config";
import { ApiRequestError, getAuthToken } from "@/lib/api";
import type { VoiceProcessingStatus, VoiceUploadStatusResponse } from "@/lib/voicePipeline/contracts";

export interface VoiceUploadInput {
  uri: string;
  name?: string;
  mimeType?: string;
}

export interface VoiceUploadResponse {
  ok: true;
  uploadId: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: "uploaded" | "transcribed";
  transcript: string | null;
  durationSeconds: number | null;
  sttStatus: "processing" | "transcribed" | "not_configured" | "stt_error";
  sttError: string | null;
  processing?: VoiceProcessingStatus;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function pickMimeType(uri: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  const low = uri.toLowerCase();
  if (low.endsWith(".mp3")) return "audio/mpeg";
  if (low.endsWith(".wav")) return "audio/wav";
  if (low.endsWith(".m4a")) return "audio/x-m4a";
  if (low.endsWith(".ogg")) return "audio/ogg";
  if (low.endsWith(".webm")) return "audio/webm";
  return "audio/mp4";
}

function pickName(uri: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  const normalized = uri.split("?")[0];
  const parts = normalized.split("/");
  const last = parts[parts.length - 1]?.trim();
  if (last) return last;
  return `voice-${Date.now()}.m4a`;
}

export async function uploadVoiceAudio(
  input: VoiceUploadInput
): Promise<VoiceUploadResponse> {
  const token = getAuthToken();
  const uri = input.uri?.trim();
  if (!uri) {
    throw new ApiRequestError("Не передан путь к аудиофайлу", 400);
  }
  if (!token) {
    throw new ApiRequestError("Требуется авторизация", 401);
  }

  const form = new FormData();
  form.append("audio", {
    // React Native file payload for multipart/form-data
    uri,
    name: pickName(uri, input.name),
    type: pickMimeType(uri, input.mimeType),
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${API_BASE_URL}/api/voice/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      },
      45000
    );
  } catch {
    throw new ApiRequestError("Сеть недоступна. Проверьте подключение.", 0);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiRequestError("Неверный ответ сервера", res.status);
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? ((data as { error: string }).error || `Ошибка ${res.status}`)
        : `Ошибка ${res.status}`;
    throw new ApiRequestError(message, res.status);
  }

  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true
  ) {
    throw new ApiRequestError("Неверный формат ответа upload", 500);
  }

  return data as VoiceUploadResponse;
}

export async function getVoiceUploadProcessingStatus(
  uploadId: string
): Promise<VoiceUploadStatusResponse> {
  const token = getAuthToken();
  const id = uploadId?.trim();
  if (!id) {
    throw new ApiRequestError("Не передан uploadId", 400);
  }
  if (!token) {
    throw new ApiRequestError("Требуется авторизация", 401);
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${API_BASE_URL}/api/voice/upload/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      15000
    );
  } catch {
    throw new ApiRequestError("Сеть недоступна. Проверьте подключение.", 0);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiRequestError("Неверный ответ сервера", res.status);
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? ((data as { error: string }).error || `Ошибка ${res.status}`)
        : `Ошибка ${res.status}`;
    throw new ApiRequestError(message, res.status);
  }

  if (
    !data ||
    typeof data !== "object" ||
    (data as { ok?: unknown }).ok !== true ||
    typeof (data as { uploadId?: unknown }).uploadId !== "string"
  ) {
    throw new ApiRequestError("Неверный формат статуса voice upload", 500);
  }

  return data as VoiceUploadStatusResponse;
}

