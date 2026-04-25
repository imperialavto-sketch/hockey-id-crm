// Metro для Expo + on-device Storybook (@storybook/react-native).
// Важно: `withStorybook` по умолчанию смотрит `.storybook/main.*` — у нас конфиг в `.rnstorybook`,
// без явного `configPath` Metro падает с «main config file not found».
//
// Полная интеграция Storybook в Metro: EXPO_PUBLIC_STORYBOOK_ENABLED=true npx expo start
// Обычный запуск приложения (без Storybook Metro): EXPO_PUBLIC_STORYBOOK_ENABLED=false (или не задавать)
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { withStorybook } = require("@storybook/react-native/metro/withStorybook");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@shared": path.resolve(monorepoRoot, "shared"),
};

const storybookConfigPath = path.resolve(projectRoot, ".rnstorybook");

module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
  configPath: storybookConfigPath,
});
