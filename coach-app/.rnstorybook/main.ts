/**
 * Конфиг on-device Storybook. После смены `stories` или путей выполнить:
 * `npm run storybook-generate` → обновится `storybook.requires.ts`.
 */
import type { StorybookConfig } from "@storybook/react-native";

const main: StorybookConfig = {
  stories: ["../components/**/*.stories.?(ts|tsx|js|jsx)"],
  addons: [
    "@storybook/addon-ondevice-controls",
    "@storybook/addon-ondevice-actions",
  ],
};

export default main;
