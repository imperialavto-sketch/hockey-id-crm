/**
 * Ответ GET /api/coach/messages — элемент списка (расширяется вместе с CRM contract).
 */
export interface CoachInboxListApiItem {
  id: string;
  title?: string;
  playerId?: string;
  groupName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  participants?: string[];
  /** Legacy UI-ярлык */
  kind?: string;
  type?: 'coach_parent_direct' | 'team_parent_channel';
  conversationKind?: string;
  preview?: string;
  teamId?: string;
  lastSenderLabel?: string;
  lastMessageIsOwn?: boolean;
  lastMessageSenderRole?: string;
}
