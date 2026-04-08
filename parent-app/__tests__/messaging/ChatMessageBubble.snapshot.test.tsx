import React from "react";
import renderer from "react-test-renderer";
import { ChatMessageBubble } from "@/components/messaging/ChatMessageBubble";
import { COACH_MARK_ID } from "@/services/chatService";
import type { ChatMessage } from "@/types/chat";
import { STORYBOOK_FIXTURE_PLAYER_ID } from "@/test-fixtures/messagingFixtures";

const noop = () => {};

const coachMsg: ChatMessage = {
  id: "snap_msg_coach",
  conversationId: "c_snap",
  senderType: "coach",
  senderId: "coach_snap",
  text: "Текст **жирный** для снапшота.",
  createdAt: "2026-03-15T12:00:00.000Z",
};

const parentMsg: ChatMessage = {
  id: "snap_msg_parent",
  conversationId: "c_snap",
  senderType: "parent",
  senderId: `parent_${STORYBOOK_FIXTURE_PLAYER_ID}`,
  text: "Ответ родителя",
  createdAt: "2026-03-15T12:01:00.000Z",
};

const aiMsg: ChatMessage = {
  id: "snap_msg_ai",
  conversationId: COACH_MARK_ID,
  senderType: "coach",
  senderId: COACH_MARK_ID,
  text: "Совет от Арены",
  createdAt: "2026-03-15T12:02:00.000Z",
  isAI: true,
};

describe("ChatMessageBubble snapshots", () => {
  it("coach incoming", () => {
    const tree = renderer
      .create(
        <ChatMessageBubble
          item={coachMsg}
          index={0}
          onSaveNote={noop}
          onSaveMemory={noop}
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("parent outgoing", () => {
    const tree = renderer
      .create(
        <ChatMessageBubble
          item={parentMsg}
          index={1}
          onSaveNote={noop}
          onSaveMemory={noop}
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("arena AI bubble", () => {
    const tree = renderer
      .create(
        <ChatMessageBubble
          item={aiMsg}
          index={2}
          onSaveNote={noop}
          onSaveMemory={noop}
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
