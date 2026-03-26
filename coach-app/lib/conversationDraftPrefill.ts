type DraftPrefillPayload = {
  conversationId: string;
  text: string;
};

let pendingPrefill: DraftPrefillPayload | null = null;

export function setConversationDraftPrefill(payload: DraftPrefillPayload): void {
  const text = payload.text.trim();
  if (!payload.conversationId || !text) return;
  pendingPrefill = {
    conversationId: payload.conversationId,
    text,
  };
}

export function consumeConversationDraftPrefill(
  conversationId: string
): string | null {
  if (!pendingPrefill) return null;
  if (pendingPrefill.conversationId !== conversationId) return null;
  const text = pendingPrefill.text;
  pendingPrefill = null;
  return text;
}
