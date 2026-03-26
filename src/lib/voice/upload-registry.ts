import { pendingVoiceProcessing, type VoiceProcessingStatus } from "@/lib/voice/pipeline-contract";

type RegistryRow = {
  coachId: string;
  processing: VoiceProcessingStatus;
};

const memoryRegistry = new Map<string, RegistryRow>();

export function saveVoiceUploadStatus(params: { coachId: string; processing: VoiceProcessingStatus }) {
  memoryRegistry.set(params.processing.upload.uploadId, {
    coachId: params.coachId,
    processing: params.processing,
  });
}

export function updateVoiceUploadStatus(params: {
  uploadId: string;
  coachId: string;
  mutate: (current: VoiceProcessingStatus) => VoiceProcessingStatus;
}): VoiceProcessingStatus | null {
  const row = memoryRegistry.get(params.uploadId);
  if (!row || row.coachId !== params.coachId) return null;
  const next = params.mutate(row.processing);
  memoryRegistry.set(params.uploadId, { coachId: row.coachId, processing: next });
  return next;
}

export function getVoiceUploadStatus(uploadId: string, coachId: string): VoiceProcessingStatus | null {
  const row = memoryRegistry.get(uploadId);
  if (!row || row.coachId !== coachId) return null;
  return row.processing;
}

export function getVoiceUploadStatusOrPending(uploadId: string, coachId: string): VoiceProcessingStatus {
  return getVoiceUploadStatus(uploadId, coachId) ?? pendingVoiceProcessing(uploadId);
}
