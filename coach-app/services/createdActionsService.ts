import { apiFetch, ApiRequestError } from "@/lib/api";

export type CreatedActionsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface CreatedActionListItem {
  id: string;
  title: string;
  descriptionPreview: string;
  status: string;
  createdAt: string;
  playerId: string | null;
  playerName: string | null;
  voiceNoteId?: string | null;
}

export interface CreatedActionDetail {
  id: string;
  coachId: string;
  playerId: string | null;
  playerName: string | null;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  voiceNoteId?: string | null;
}

function toUserMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Неизвестная ошибка";
}

export async function getCreatedActions(): Promise<
  CreatedActionsResult<CreatedActionListItem[]>
> {
  try {
    const data = await apiFetch<CreatedActionListItem[]>("/api/actions", {
      method: "GET",
    });
    return { ok: true, data: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

export async function getCreatedActionById(
  id: string
): Promise<CreatedActionsResult<CreatedActionDetail>> {
  try {
    const data = await apiFetch<CreatedActionDetail>(
      `/api/actions/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

