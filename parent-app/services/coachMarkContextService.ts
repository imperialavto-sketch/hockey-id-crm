import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "coach-mark-last-context";

export type CoachMarkSavedContext = {
  playerId: string;
  playerName?: string;
  teamId?: string;
  savedAt: string;
};

export async function saveCoachMarkContext(input: {
  playerId: string;
  playerName?: string | null;
  teamId?: string | null;
}): Promise<void> {
  const playerId = input.playerId?.trim();
  if (!playerId) return;
  const payload: CoachMarkSavedContext = {
    playerId,
    playerName: input.playerName?.trim() || undefined,
    teamId: input.teamId?.trim() || undefined,
    savedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function getCoachMarkContext(): Promise<CoachMarkSavedContext | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CoachMarkSavedContext>;
    if (!parsed || typeof parsed.playerId !== "string" || !parsed.playerId.trim()) {
      return null;
    }
    return {
      playerId: parsed.playerId.trim(),
      playerName:
        typeof parsed.playerName === "string" && parsed.playerName.trim()
          ? parsed.playerName.trim()
          : undefined,
      teamId:
        typeof parsed.teamId === "string" && parsed.teamId.trim()
          ? parsed.teamId.trim()
          : undefined,
      savedAt:
        typeof parsed.savedAt === "string" && parsed.savedAt.trim()
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
