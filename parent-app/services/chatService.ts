import type { ConversationItem, ChatMessage } from "@/types/chat";
import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";

const PARENT_ID_HEADER = "x-parent-id";

function headers(parentId: string): Record<string, string> {
  return { [PARENT_ID_HEADER]: parentId };
}

export async function getConversations(
  parentId: string
): Promise<ConversationItem[]> {
  try {
    const data = await apiFetch<ConversationItem[]>(
      "/api/chat/conversations",
      { headers: headers(parentId) }
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    logApiError("chatService.getConversations", err);
    throw err;
  }
}

export async function getOrCreateConversation(
  parentId: string,
  playerId: string
): Promise<ConversationItem | null> {
  try {
    const data = await apiFetch<ConversationItem>(
      "/api/chat/conversations",
      {
        method: "POST",
        headers: headers(parentId),
        body: JSON.stringify({ playerId }),
      }
    );
    return data ?? null;
  } catch (err) {
    logApiError("chatService.getOrCreateConversation", err);
    return null;
  }
}

export async function getConversationMessages(
  conversationId: string,
  parentId: string
): Promise<ChatMessage[]> {
  try {
    const data = await apiFetch<ChatMessage[]>(
      `/api/chat/conversations/${conversationId}/messages`,
      { headers: headers(parentId) }
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    logApiError("chatService.getConversationMessages", err);
    throw err;
  }
}

export async function sendMessage(
  conversationId: string,
  text: string,
  parentId: string
): Promise<ChatMessage | null> {
  try {
    const data = await apiFetch<ChatMessage>(
      `/api/chat/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: headers(parentId),
        body: JSON.stringify({ text }),
      }
    );
    return data ?? null;
  } catch (err) {
    logApiError("chatService.sendMessage", err);
    return null;
  }
}
