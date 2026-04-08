import type { Meta, StoryObj } from "@storybook/react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { COACH_MARK_ID } from "@/services/chatService";
import type { ChatMessage } from "@/types/chat";
import { STORYBOOK_FIXTURE_PLAYER_ID } from "@/test-fixtures/messagingFixtures";

const coachMsg: ChatMessage = {
  id: "msg_story_coach",
  conversationId: "c_story",
  senderType: "coach",
  senderId: "coach_1",
  text: "Здравствуйте! **Сегодня** отличная работа на льду.",
  createdAt: "2026-03-15T12:00:00.000Z",
};

const parentMsg: ChatMessage = {
  id: "msg_story_parent",
  conversationId: "c_story",
  senderType: "parent",
  senderId: `parent_${STORYBOOK_FIXTURE_PLAYER_ID}`,
  text: "Спасибо, передадим Марку!",
  createdAt: "2026-03-15T12:05:00.000Z",
};

const coachMarkMsg: ChatMessage = {
  id: "msg_story_cm",
  conversationId: COACH_MARK_ID,
  senderType: "coach",
  senderId: COACH_MARK_ID,
  text: "Рекомендую **2–3** короткие сессии броска дома.",
  createdAt: "2026-03-15T12:10:00.000Z",
  isAI: true,
};

const meta: Meta<typeof ChatMessageBubble> = {
  title: "Messaging/ChatMessageBubble",
  component: ChatMessageBubble,
  args: {
    index: 0,
    onSaveNote: () => undefined,
    onSaveMemory: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof ChatMessageBubble>;

export const FromCoach: Story = {
  name: "Входящее от тренера",
  args: { item: coachMsg },
};

export const FromParent: Story = {
  name: "Исходящее родителя",
  args: { item: parentMsg },
};

export const CoachMarkAI: Story = {
  name: "Арена (долгое нажатие — сохранить)",
  args: { item: coachMarkMsg },
};
