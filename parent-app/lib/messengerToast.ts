import { Alert, Platform, ToastAndroid } from "react-native";

/** Короткое подтверждение действия (без новых UI-зависимостей). */
export function showMessengerToast(message: string): void {
  const text = message.trim();
  if (!text) return;
  if (Platform.OS === "android") {
    ToastAndroid.show(text, ToastAndroid.SHORT);
  } else {
    Alert.alert("", text);
  }
}
