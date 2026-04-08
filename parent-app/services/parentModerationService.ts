/**
 * Модерация messenger: жалоба на сообщение, блокировка родителя (только клиент → существующие API).
 */

import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";

const PARENT_ID_HEADER = "x-parent-id";

function headers(parentId: string): Record<string, string> {
  return { [PARENT_ID_HEADER]: parentId, "Content-Type": "application/json" };
}

export async function postMessageReport(
  parentId: string,
  messageId: string,
  reason?: string | null
): Promise<boolean> {
  try {
    await apiFetch<{ ok?: boolean }>("/api/parent/messages/report", {
      method: "POST",
      headers: headers(parentId),
      body: JSON.stringify({
        messageId,
        reason: reason?.trim() || undefined,
      }),
      timeoutMs: 12000,
    });
    return true;
  } catch (e) {
    logApiError("parentModerationService.postMessageReport", e);
    return false;
  }
}

export async function postPeerBlock(
  parentId: string,
  blockedParentId: string,
  teamId: string
): Promise<boolean> {
  try {
    await apiFetch<{ ok?: boolean }>("/api/parent/messaging/peer-block", {
      method: "POST",
      headers: headers(parentId),
      body: JSON.stringify({ blockedParentId, teamId }),
      timeoutMs: 12000,
    });
    return true;
  } catch (e) {
    logApiError("parentModerationService.postPeerBlock", e);
    return false;
  }
}
