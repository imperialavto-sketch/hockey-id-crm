/**
 * Лёгкий тактильный отклик без новых зависимостей.
 * Android: короткий Vibration. iOS: без модуля expo-haptics отклик визуальный только.
 */
import { Platform, Vibration } from "react-native";

const LIGHT_MS = 12;
const SELECTION_MS = 8;
/** Двойной короткий импульс как «успех» на Android */
const SUCCESS_PATTERN: number | number[] = [0, 35, 50, 35];

export function coachHapticLight(): void {
  if (Platform.OS === "android") {
    Vibration.vibrate(LIGHT_MS);
  }
}

export function coachHapticSelection(): void {
  if (Platform.OS === "android") {
    Vibration.vibrate(SELECTION_MS);
  }
}

export function coachHapticSuccess(): void {
  if (Platform.OS === "android") {
    Vibration.vibrate(SUCCESS_PATTERN);
  }
}
