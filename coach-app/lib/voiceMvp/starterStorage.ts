import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VoiceStarterPayload } from "./starter";

const STARTER_PREFIX = "@hockey_voice_starter:";

export async function saveVoiceStarterPayload(payload: VoiceStarterPayload): Promise<string> {
  const key = `${STARTER_PREFIX}${payload.id}`;
  await AsyncStorage.setItem(key, JSON.stringify(payload));
  return payload.id;
}

export async function loadVoiceStarterPayload(
  id: string
): Promise<VoiceStarterPayload | null> {
  try {
    const json = await AsyncStorage.getItem(`${STARTER_PREFIX}${id}`);
    if (!json) return null;
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object") return null;
    return raw as VoiceStarterPayload;
  } catch {
    return null;
  }
}

/** Load once and remove to avoid applying twice. */
export async function consumeVoiceStarterPayload(
  id: string
): Promise<VoiceStarterPayload | null> {
  const payload = await loadVoiceStarterPayload(id);
  if (!payload) return null;
  try {
    await AsyncStorage.removeItem(`${STARTER_PREFIX}${id}`);
  } catch {
    // ignore
  }
  return payload;
}

