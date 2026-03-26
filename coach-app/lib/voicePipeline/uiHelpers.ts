import type { VoiceArtifactStage, VoiceProcessingStatus, VoiceUploadStage } from "./contracts";

export function voiceUploadStageLabelRu(stage: VoiceUploadStage): string {
  switch (stage) {
    case "pending_upload":
      return "Ожидает загрузки";
    case "uploaded":
      return "Загружено";
    case "processing":
      return "Обработка";
    case "processed":
      return "Готово";
    case "failed":
      return "Ошибка";
    default:
      return "—";
  }
}

export function voiceArtifactStageLabelRu(stage: VoiceArtifactStage): string {
  switch (stage) {
    case "pending":
      return "В очереди";
    case "ready":
      return "Готово";
    case "failed":
      return "Ошибка";
    default:
      return "—";
  }
}

/** True while transcript or summary still pending (and upload not failed). */
export function voicePipelineStillProcessing(p: VoiceProcessingStatus | null | undefined): boolean {
  if (!p) return false;
  if (p.upload.status === "failed") return false;
  return p.transcript.status === "pending" || p.summary.status === "pending";
}

export function voiceListRowSignal(item: {
  summary: string | null;
  processing?: VoiceProcessingStatus | null;
}): { label: string; tone: "muted" | "active" | "warn" } | null {
  const p = item.processing;
  if (p?.upload.status === "failed") {
    return { label: "Сбой", tone: "warn" };
  }
  if (p && voicePipelineStillProcessing(p)) {
    return { label: "Обработка", tone: "active" };
  }
  const hasRecap =
    Boolean(item.summary?.trim()) ||
    Boolean(p?.summary.text?.trim()) ||
    (Array.isArray(p?.summary.highlights) && p.summary.highlights.length > 0);
  if (hasRecap) {
    return { label: "Готово", tone: "muted" };
  }
  return null;
}

export function voicePipelineStatusHintRu(
  p: VoiceProcessingStatus | null | undefined
): string {
  if (!p) return "Можно открыть заметку позже — обработка продолжится.";
  if (p.upload.status === "failed") {
    return "Не удалось обработать файл. Можно проверить статус ещё раз позже.";
  }
  if (p.upload.status === "pending_upload") return "Загружаем запись…";
  if (p.upload.status === "uploaded") return "Файл загружен. Готовим расшифровку…";
  if (p.transcript.status === "pending") return "Готовим расшифровку…";
  if (p.transcript.status === "ready" && p.summary.status === "pending") {
    return "Расшифровка готова. Собираем резюме…";
  }
  if (p.transcript.status === "ready" && p.summary.status === "failed") {
    return "Часть результатов пока недоступна: резюме не собрано, но расшифровка сохранена.";
  }
  if (p.transcript.status === "failed" && p.summary.status === "pending") {
    return "Пробуем завершить обработку. Можно проверить заметку позже.";
  }
  return "Можно открыть заметку позже — обработка продолжится.";
}

export function voicePipelineHasPartialResult(
  p: VoiceProcessingStatus | null | undefined
): boolean {
  if (!p) return false;
  return p.transcript.status === "ready" && p.summary.status === "failed";
}
