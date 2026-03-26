import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VoiceObservationPrefillPayload } from "./observationAutofill";

const PREFILL_PREFIX = "@hockey_voice_observation_prefill:";

export async function saveVoiceObservationPrefill(
  payload: VoiceObservationPrefillPayload
): Promise<string> {
  const key = `${PREFILL_PREFIX}${payload.id}`;
  await AsyncStorage.setItem(key, JSON.stringify(payload));
  return payload.id;
}

export async function loadVoiceObservationPrefill(
  id: string
): Promise<VoiceObservationPrefillPayload | null> {
  try {
    const json = await AsyncStorage.getItem(`${PREFILL_PREFIX}${id}`);
    if (!json) return null;
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== "object") return null;
    return raw as VoiceObservationPrefillPayload;
  } catch {
    return null;
  }
}

export async function consumeVoiceObservationPrefill(
  id: string
): Promise<VoiceObservationPrefillPayload | null> {
  const payload = await loadVoiceObservationPrefill(id);
  if (!payload) return null;
  try {
    await AsyncStorage.removeItem(`${PREFILL_PREFIX}${id}`);
  } catch {
    // ignore
  }
  return payload;
}

