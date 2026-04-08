/**
 * Снапшоты `StructuredMetricsFoundationSection` для регрессии вёрстки и текста.
 *
 * **Обновление:** `npm run test:snapshots -- -u` из `coach-app` (или `jest -u` с путём к файлу).
 * **Стабильность:** id игроков заданы в `StructuredMetricsFoundationSection.fixtures.ts` (`SM_FIXTURE_PLAYER_*`).
 *
 * `PrimaryButton` мокается без Reanimated (`animatedPress`), чтобы снапшоты были стабильны в Node.
 */

/* eslint-disable import/first -- jest.mock hoisted */
jest.mock("@/components/ui/PrimaryButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    PrimaryButton: (props: {
      title: string;
      onPress?: () => void;
      disabled?: boolean;
      style?: object;
      variant?: string;
      animatedPress?: boolean;
      accessibilityLabel?: string;
      accessibilityHint?: string;
      accessibilityRole?: string;
    }) => {
      const {
        title,
        onPress,
        disabled,
        style,
        accessibilityLabel,
        accessibilityHint,
        accessibilityRole,
      } = props;
      return (
        React.createElement(
          Pressable,
          {
            onPress,
            disabled,
            style,
            accessibilityLabel,
            accessibilityHint,
            accessibilityRole,
          },
          React.createElement(Text, null, title)
        )
      );
    },
  };
});

import React from "react";
import renderer, { act } from "react-test-renderer";
import { StructuredMetricsFoundationSection } from "@/components/schedule/StructuredMetricsFoundationSection";
import type { StructuredMetricsFoundationSectionProps } from "@/components/schedule/StructuredMetricsFoundationSection";
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

function snap(props: StructuredMetricsFoundationSectionProps) {
  let instance: renderer.ReactTestRenderer;
  act(() => {
    instance = renderer.create(
      <StructuredMetricsFoundationSection {...props} />
    );
  });
  const tree = instance!.toJSON();
  expect(tree).toMatchSnapshot();
  act(() => {
    instance!.unmount();
  });
}

describe("StructuredMetricsFoundationSection snapshots", () => {
  it("loading", () => snap(fixtureLoading()));
  it("error with retry", () => snap(fixtureError()));
  it("empty players", () => snap(fixtureEmpty()));
  it("two players can save", () => snap(fixtureTwoPlayersCanSave()));
  it("two players cannot save (no changes)", () =>
    snap(fixtureTwoPlayersNoSave()));
  it("saving", () => snap(fixtureSaving()));
  it("save succeeded", () => snap(fixtureSaveSucceeded()));
  it("save error", () => snap(fixtureSaveError()));
  it("suggestion voice vs quick", () =>
    snap(fixtureSuggestionVoiceVsQuick()));
  it("suggestion hockey id conflict", () =>
    snap(fixtureSuggestionHockeyIdConflict()));
  it("suggestion apply error", () =>
    snap(fixtureSuggestionApplyError()));
  it("applying suggestion", () =>
    snap(fixtureApplyingSuggestion()));
});
