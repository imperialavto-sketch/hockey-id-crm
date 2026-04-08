/**
 * On-device Storybook (`@storybook/react-native`) для секции метрик на карточке тренировки.
 *
 * **Запуск QA**
 * 1. `cd coach-app && npx expo start`
 * 2. Открыть маршрут `/storybook` (только `__DEV__`, см. `app/_layout.tsx`).
 * 3. В дереве: `Schedule / StructuredMetricsFoundationSection` — пройти истории сверху вниз.
 *
 * **Снапшоты Jest:** см. `StructuredMetricsFoundationSection.snapshot.test.tsx` и `*.snap`.
 */

import React from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";
import { SectionCard } from "@/components/ui/SectionCard";
import { theme } from "@/constants/theme";
import {
  StructuredMetricsFoundationSection,
  type StructuredMetricsFoundationSectionProps,
} from "@/components/schedule/StructuredMetricsFoundationSection";
import {
  fixtureApplyingSuggestion,
  fixtureEmpty,
  fixtureError,
  fixtureLoading,
  fixtureSaveError,
  fixtureSaveSucceeded,
  fixtureSaving,
  fixtureSuggestionApplyError,
  fixtureSuggestionHockeyIdConflict,
  fixtureSuggestionVoiceVsQuick,
  fixtureTwoPlayersCanSave,
  fixtureTwoPlayersNoSave,
} from "@/components/schedule/StructuredMetricsFoundationSection.fixtures";

const meta: Meta<StructuredMetricsFoundationSectionProps> = {
  title: "Schedule/StructuredMetricsFoundationSection",
  component: StructuredMetricsFoundationSection,
  decorators: [
    (Story) => (
      <View
        style={{
          padding: 16,
          backgroundColor: theme.colors.background,
        }}
      >
        <SectionCard elevated>{Story()}</SectionCard>
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<StructuredMetricsFoundationSectionProps>;

export const Loading: Story = { args: fixtureLoading() };

export const ErrorWithRetry: Story = { args: fixtureError() };

export const EmptyPlayers: Story = { args: fixtureEmpty() };

export const TwoPlayersCanSave: Story = {
  args: fixtureTwoPlayersCanSave(),
};

export const TwoPlayersNoChanges: Story = {
  args: fixtureTwoPlayersNoSave(),
};

export const Saving: Story = { args: fixtureSaving() };

export const SaveSucceeded: Story = { args: fixtureSaveSucceeded() };

export const SaveError: Story = { args: fixtureSaveError() };

export const SuggestionVoiceVsQuick: Story = {
  args: fixtureSuggestionVoiceVsQuick(),
};

export const SuggestionHockeyIdConflict: Story = {
  args: fixtureSuggestionHockeyIdConflict(),
};

export const SuggestionApplyError: Story = {
  args: fixtureSuggestionApplyError(),
};

export const ApplyingSuggestion: Story = {
  args: fixtureApplyingSuggestion(),
};
