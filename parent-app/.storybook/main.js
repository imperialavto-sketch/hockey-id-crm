const path = require("path");

/** @type {import('@storybook/react-vite').StorybookConfig} */
module.exports = {
  stories: ["../components/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    const baseAlias =
      viteConfig.resolve?.alias && typeof viteConfig.resolve.alias === "object"
        ? { ...viteConfig.resolve.alias }
        : {};
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...baseAlias,
      "react-native": "react-native-web",
      "react-native-reanimated": path.resolve(__dirname, "reanimated-mock.ts"),
      "@expo/vector-icons": path.resolve(__dirname, "expoVectorIconsStub.cjs"),
      "@": path.resolve(__dirname, ".."),
    };
    viteConfig.define = { ...viteConfig.define, __DEV__: true };

    return viteConfig;
  },
};
