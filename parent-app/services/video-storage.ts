import type { VideoUploadInitPayload, VideoUploadInitResponse } from "@/types/video-analysis";

export interface VideoStorageProvider {
  createUploadTarget(payload: VideoUploadInitPayload): Promise<VideoUploadInitResponse>;
  finalizeUpload(storageKey: string): Promise<{ videoUrl: string }>;
  getPublicPlaybackUrl(storageKey: string): Promise<string>;
  deleteVideo(storageKey: string): Promise<void>;
}

class MockVideoStorageProvider implements VideoStorageProvider {
  async createUploadTarget(payload: VideoUploadInitPayload): Promise<VideoUploadInitResponse> {
    const requestId = `va_${Date.now()}`;
    const storageKey = `players/${payload.playerId}/analyses/${requestId}/video.mp4`;
    return {
      analysisRequestId: requestId,
      uploadUrl: `https://upload.hockeyid.mock/${storageKey}`,
      storageKey,
    };
  }

  async finalizeUpload(storageKey: string): Promise<{ videoUrl: string }> {
    return { videoUrl: `https://storage.hockeyid.mock/${storageKey}` };
  }

  async getPublicPlaybackUrl(storageKey: string): Promise<string> {
    return `https://storage.hockeyid.mock/${storageKey}`;
  }

  async deleteVideo(_storageKey: string): Promise<void> {
    return;
  }
}

export const videoStorageProvider: VideoStorageProvider = new MockVideoStorageProvider();
