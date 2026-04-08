// Allow imports from the monorepo root (e.g. shared `src/lib` development framework).
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

module.exports = withStorybook(config);
