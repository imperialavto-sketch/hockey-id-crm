// Metro для Expo + on-device Storybook (@storybook/react-native).
// Важно: `withStorybook` по умолчанию смотрит `.storybook/main.*` — у нас конфиг в `.rnstorybook`,
// без явного `configPath` Metro падает с «main config file not found».
//
// Отключить интеграцию Storybook в Metro (только приложение): STORYBOOK_METRO=0 npx expo start
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const withStorybook = require("@storybook/react-native/metro/withStorybook");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

const storybookConfigPath = path.resolve(projectRoot, ".rnstorybook");
const storybookMetroEnabled =
  process.env.STORYBOOK_METRO !== "0" && process.env.STORYBOOK_METRO !== "false";

module.exports = storybookMetroEnabled
  ? withStorybook(config, {
      configPath: storybookConfigPath,
    })
  : config;
