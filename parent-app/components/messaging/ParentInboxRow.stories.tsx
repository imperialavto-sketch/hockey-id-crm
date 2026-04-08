import type { Meta, StoryObj } from "@storybook/react";
import { ParentInboxRow } from "./ParentInboxRow";
import {
  storybookInboxCoachMark,
  storybookInboxDirectUnread,
  storybookInboxTeam,
} from "@/test-fixtures/messagingFixtures";

/**
 * Storybook: инбокс родителя (Vite + react-native-web).
 * Запуск: `npm run storybook` из каталога `parent-app`.
 */
const meta: Meta<typeof ParentInboxRow> = {
  title: "Messaging/ParentInboxRow",
  component: ParentInboxRow,
  args: {
    index: 0,
    onPress: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof ParentInboxRow>;

export const DirectCoachUnread: Story = {
  name: "Чат с тренером · непрочитанное",
  args: { item: storybookInboxDirectUnread },
};

export const TeamAnnouncementsUnread: Story = {
  name: "Объявления команды · непрочитанное",
  args: { item: storybookInboxTeam },
};

export const CoachMark: Story = {
  name: "Арена · AI",
  args: { item: storybookInboxCoachMark },
};
