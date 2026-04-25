export interface ConversationItem {
  id: string;
  /** Present for direct coach↔parent threads; optional for messenger-style rows. */
  playerId?: string;
  playerName: string;
  coachId: string;
  coachName: string;
  parentId: string;
  lastMessage?: string;
  updatedAt: string;
  /** From API / inbox builder: discriminates direct vs team/parent/announcement threads. */
  conversationKind?: string;
  teamName?: string | null;
  unreadCount?: number;
  threadTitle?: string | null;
  threadSubtitle?: string | null;
  teamId?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: "parent" | "coach";
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string | null;
  /** true для сообщений компаньона Арены (AI) */
  isAI?: boolean;
}
