// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: только node_modules parent-app (избегаем конфликта React 18 из корня)
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// Workaround for "Unable to resolve module ./metroServerLogs" in @expo/metro-runtime on native
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform !== 'web' &&
    moduleName === './metroServerLogs' &&
    context.originModulePath &&
    context.originModulePath.includes('@expo/metro-runtime')
  ) {
    const pkgDir = path.dirname(context.originModulePath);
    const nativePath = path.join(pkgDir, 'metroServerLogs.native.ts');
    return { type: 'sourceFile', filePath: nativePath };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
