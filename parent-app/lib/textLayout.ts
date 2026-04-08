import { Platform, type TextStyle } from "react-native";

/**
 * Web-only wrapping for long player names / team lines (RN Web).
 * Native: no-op — uses default Text layout.
 */
export function webPremiumWordWrap(): TextStyle {
  if (Platform.OS !== "web") {
    return {};
  }
  return {
    overflowWrap: "break-word",
    wordBreak: "break-word",
  } as TextStyle;
}
