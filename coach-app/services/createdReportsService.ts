import { apiFetch, ApiRequestError } from "@/lib/api";

export type CreatedReportsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface CreatedReportListItem {
  id: string;
  playerId: string | null;
  playerName: string | null;
  title: string;
  contentPreview: string;
  createdAt: string;
  voiceNoteId?: string | null;
}

export interface CreatedReportDetail {
  id: string;
  coachId: string;
  playerId: string | null;
  playerName: string | null;
  title: string;
  content: string;
  createdAt: string;
  voiceNoteId?: string | null;
}

function toUserMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Неизвестная ошибка";
}

export async function getCreatedReports(): Promise<
  CreatedReportsResult<CreatedReportListItem[]>
> {
  try {
    const data = await apiFetch<CreatedReportListItem[]>("/api/reports", {
      method: "GET",
    });
    return { ok: true, data: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

export async function getCreatedReportById(
  id: string
): Promise<CreatedReportsResult<CreatedReportDetail>> {
  try {
    const data = await apiFetch<CreatedReportDetail>(
      `/api/reports/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

