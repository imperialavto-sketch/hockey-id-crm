import type { ConversationItem, ChatMessage } from "@/types/chat";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

const DEMO_CONVERSATION_ID = "c_demo_1";

export const demoConversation: ConversationItem = {
  id: DEMO_CONVERSATION_ID,
  playerId: PLAYER_MARK_GOLYSH.id,
  playerName: PLAYER_MARK_GOLYSH.profile.fullName,
  coachId: "coach_1",
  coachName: "Сергей Мозякин",
  parentId: "parent_demo_1",
  lastMessage: "До встречи завтра на льду в 18:30!",
  updatedAt: new Date().toISOString(),
};

export const demoMessages: ChatMessage[] = [
  {
    id: "m_demo_1",
    conversationId: DEMO_CONVERSATION_ID,
    senderType: "coach",
    senderId: "coach_1",
    text: "Здравствуйте! Марк отлично отработал последнюю игру.",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: "m_demo_2",
    conversationId: DEMO_CONVERSATION_ID,
    senderType: "parent",
    senderId: "parent_demo_1",
    text: "Спасибо! Очень рады прогрессу.",
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: "m_demo_3",
    conversationId: DEMO_CONVERSATION_ID,
    senderType: "coach",
    senderId: "coach_1",
    text: "Завтра сделаем упор на бросок и игру у борта.",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "m_demo_4",
    conversationId: DEMO_CONVERSATION_ID,
    senderType: "coach",
    senderId: "coach_1",
    text: "До встречи завтра на льду в 18:30!",
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export function getDemoConversations(): ConversationItem[] {
  return [demoConversation];
}

export function getDemoConversationForPlayer(_parentId: string, _playerId: string): ConversationItem {
  return demoConversation;
}

export function getDemoMessages(_conversationId: string, _parentId: string): ChatMessage[] {
  return demoMessages;
}

export function addDemoMessage(
  conversationId: string,
  text: string,
  senderType: "parent" | "coach",
  senderId: string
): ChatMessage {
  const msg: ChatMessage = {
    id: `m_demo_${Date.now()}`,
    conversationId,
    senderType,
    senderId,
    text,
    createdAt: new Date().toISOString(),
  };
  demoMessages.push(msg);
  return msg;
}

