import type { Meta, StoryObj } from "@storybook/react";
import { NotificationCard } from "./NotificationCard";
import {
  storybookNotificationChat,
  storybookNotificationRead,
} from "@/test-fixtures/messagingFixtures";

const meta: Meta<typeof NotificationCard> = {
  title: "Messaging/NotificationCard",
  component: NotificationCard,
  args: {
    onPress: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof NotificationCard>;

export const ChatUnread: Story = {
  name: "Личное сообщение · непрочитано",
  args: { item: storybookNotificationChat },
};

export const ChatRead: Story = {
  name: "Личное сообщение · прочитано",
  args: { item: storybookNotificationRead },
};
