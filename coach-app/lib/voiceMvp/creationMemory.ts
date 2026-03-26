import AsyncStorage from "@react-native-async-storage/async-storage";

export type VoiceDerivedCreationKind = "report_draft" | "action_item" | "parent_draft";

type VoiceCreationMemoryRecord = {
  createdAt: string;
};

type VoiceCreationMemory = Partial<Record<VoiceDerivedCreationKind, VoiceCreationMemoryRecord>>;

const VOICE_CREATION_MEMORY_PREFIX = "@hockey_voice_creation_memory:";

function keyForVoiceNote(voiceNoteId: string): string {
  return `${VOICE_CREATION_MEMORY_PREFIX}${voiceNoteId}`;
}

export async function getVoiceCreationMemoryForNote(
  voiceNoteId: string
): Promise<VoiceCreationMemory> {
  const id = voiceNoteId.trim();
  if (!id) return {};
  try {
    const raw = await AsyncStorage.getItem(keyForVoiceNote(id));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as VoiceCreationMemory;
  } catch {
    return {};
  }
}

export async function markVoiceCreationForNote(
  voiceNoteId: string,
  kind: VoiceDerivedCreationKind
): Promise<void> {
  const id = voiceNoteId.trim();
  if (!id) return;
  const prev = await getVoiceCreationMemoryForNote(id);
  const next: VoiceCreationMemory = {
    ...prev,
    [kind]: { createdAt: new Date().toISOString() },
  };
  await AsyncStorage.setItem(keyForVoiceNote(id), JSON.stringify(next));
}
