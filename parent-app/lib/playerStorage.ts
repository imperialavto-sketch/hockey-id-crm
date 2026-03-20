/**
 * Central place to clear player-related local storage on logout.
 * Prevents data leakage between different parent accounts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PLAYER_RELATED_KEYS = [
  "@hockey_video_analysis_requests",
  "@hockey_video_analysis_results",
] as const;

/** Clear all player-related AsyncStorage. Call on logout. */
export async function clearPlayerRelatedStorage(): Promise<void> {
  try {
    await Promise.all(PLAYER_RELATED_KEYS.map((k) => AsyncStorage.removeItem(k)));
    if (__DEV__) {
      console.log("[playerStorage] cleared player-related storage");
    }
  } catch (e) {
    if (__DEV__) {
      console.warn("[playerStorage] clear failed", e);
    }
  }
}
