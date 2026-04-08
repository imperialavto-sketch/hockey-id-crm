// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
try {
  require("react-native-gesture-handler/jestSetup");
} catch {
  /* optional until package install */
}

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

