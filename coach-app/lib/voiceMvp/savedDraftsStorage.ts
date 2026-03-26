import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VoiceCoachDraft } from "./types";

const SAVED_KEY = "@hockey_voice_saved_drafts";
const MAX_SAVED = 50;

type SavedDraftRecord = VoiceCoachDraft;

function safeParseArray(raw: unknown): SavedDraftRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedDraftRecord[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") out.push(item as SavedDraftRecord);
  }
  return out;
}

export async function listSavedVoiceDrafts(): Promise<SavedDraftRecord[]> {
  try {
    const json = await AsyncStorage.getItem(SAVED_KEY);
    if (!json) return [];
    return safeParseArray(JSON.parse(json) as unknown);
  } catch {
    return [];
  }
}

export async function saveVoiceDraftForLater(draft: VoiceCoachDraft): Promise<number> {
  const existing = await listSavedVoiceDrafts();
  const withoutSameId = existing.filter((d) => d.id !== draft.id);
  const next = [draft, ...withoutSameId].slice(0, MAX_SAVED);
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next.length;
}

export async function getSavedVoiceDraftCount(): Promise<number> {
  const list = await listSavedVoiceDrafts();
  return list.length;
}

