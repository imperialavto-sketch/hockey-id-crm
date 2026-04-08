import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = (playerId: string) =>
  `arena_auto_mode:v1:${playerId.trim()}`;

export async function getArenaAutoMode(playerId: string): Promise<boolean> {
  if (!playerId.trim()) return false;
  try {
    const v = await AsyncStorage.getItem(storageKey(playerId));
    return v === "1";
  } catch {
    return false;
  }
}

export async function setArenaAutoMode(
  playerId: string,
  enabled: boolean
): Promise<void> {
  if (!playerId.trim()) return;
  try {
    if (enabled) {
      await AsyncStorage.setItem(storageKey(playerId), "1");
    } else {
      await AsyncStorage.removeItem(storageKey(playerId));
    }
  } catch {
    /* ignore */
  }
}
