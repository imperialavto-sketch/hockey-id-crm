export interface ConversationItem {
  id: string;
  playerId: string;
  playerName: string;
  coachId: string;
  coachName: string;
  parentId: string;
  lastMessage?: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: "parent" | "coach";
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string | null;
  /** true для сообщений от Coach Mark (AI) */
  isAI?: boolean;
}
