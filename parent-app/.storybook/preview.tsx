import type { Preview } from "@storybook/react";
import { View, StyleSheet } from "react-native";
import { colors, spacing } from "@/constants/theme";

const preview: Preview = {
  parameters: {
    layout: "centered",
    actions: { argTypesRegex: "^on[A-Z].*" },
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: true }],
      },
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.canvas}>
        <Story />
      </View>
    ),
  ],
};

const styles = StyleSheet.create({
  canvas: {
    padding: spacing.lg,
    minWidth: 380,
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: colors.bgMid,
  },
});

export default preview;
