import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "coach-mark-post-training-entry-v1";
const POST_TRAINING_PROMPT =
  "Разбери последнюю тренировку и дай следующий шаг по игроку.";

export async function pushPostTrainingCoachMarkEntry(input: {
  playerId: string;
  playerName: string;
  createdAt: string;
}): Promise<void> {
  if (Platform.OS === "web") return;
  const playerId = input.playerId.trim();
  const createdAt = input.createdAt.trim();
  if (!playerId || !createdAt) return;

  const dedupeKey = `${playerId}:${createdAt}`;
  try {
    const prev = await AsyncStorage.getItem(STORAGE_KEY);
    if (prev === dedupeKey) return;

    const Notifications = await import("expo-notifications");
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted && permissions.status !== "granted") return;

    const safeName = input.playerName.trim() || "игрока";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `После тренировки ${safeName} есть разбор от Арены`,
        body: "Арена подготовила следующий шаг.",
        data: {
          type: "coach_mark_post_training",
          playerId,
          playerName: safeName,
          initialMessage: POST_TRAINING_PROMPT,
        },
        sound: "default",
      },
      trigger: null,
    });
    await AsyncStorage.setItem(STORAGE_KEY, dedupeKey);
  } catch {
    // no-op: не мешаем основному UX
  }
}
