import { Alert } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/lib/haptics", () => ({
  triggerHaptic: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name?: string }) =>
      React.createElement(Text, { testID: "ionicon" }, name ?? "icon"),
  };
});

jest.spyOn(Alert, "alert").mockImplementation(() => {});

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
