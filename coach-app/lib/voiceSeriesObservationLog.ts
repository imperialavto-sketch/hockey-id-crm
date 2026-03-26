import AsyncStorage from "@react-native-async-storage/async-storage";

/** Observations added from voice-prefill while continuous mode is on (local-only). */
export type VoiceSeriesLogEntry = {
  obsId: string;
  playerId: string;
  playerName: string;
  skillType: string;
  impact: "positive" | "neutral" | "negative";
  notePreview: string;
  createdAt: number;
};

const MAX_STORED = 15;
export const VOICE_SERIES_LOG_PREVIEW_LEN = 72;

function keyForSession(sessionId: string): string {
  return `@hockey_voice_series_log:${sessionId}`;
}

function isVoiceSeriesLogEntry(x: unknown): x is VoiceSeriesLogEntry {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.obsId === "string" &&
    typeof o.playerId === "string" &&
    typeof o.playerName === "string" &&
    typeof o.skillType === "string" &&
    (o.impact === "positive" || o.impact === "neutral" || o.impact === "negative") &&
    typeof o.notePreview === "string" &&
    typeof o.createdAt === "number"
  );
}

export function truncateForVoiceSeriesPreview(text: string, maxLen = VOICE_SERIES_LOG_PREVIEW_LEN): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export async function loadVoiceSeriesLog(sessionId: string): Promise<VoiceSeriesLogEntry[]> {
  if (!sessionId) return [];
  try {
    const raw = await AsyncStorage.getItem(keyForSession(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isVoiceSeriesLogEntry);
  } catch {
    return [];
  }
}

export async function appendVoiceSeriesLog(
  sessionId: string,
  entry: VoiceSeriesLogEntry
): Promise<VoiceSeriesLogEntry[]> {
  const prev = await loadVoiceSeriesLog(sessionId);
  const next = [entry, ...prev.filter((e) => e.obsId !== entry.obsId)].slice(0, MAX_STORED);
  await AsyncStorage.setItem(keyForSession(sessionId), JSON.stringify(next));
  return next;
}

export async function removeVoiceSeriesLogEntry(
  sessionId: string,
  obsId: string
): Promise<VoiceSeriesLogEntry[]> {
  const prev = await loadVoiceSeriesLog(sessionId);
  const next = prev.filter((e) => e.obsId !== obsId);
  if (next.length === 0) {
    await AsyncStorage.removeItem(keyForSession(sessionId));
  } else {
    await AsyncStorage.setItem(keyForSession(sessionId), JSON.stringify(next));
  }
  return next;
}

export async function clearVoiceSeriesLog(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await AsyncStorage.removeItem(keyForSession(sessionId));
}

/** Local-only recap for finish UI (no AI / backend). */
export type VoiceSeriesRecap = {
  total: number;
  uniquePlayers: number;
  impactPositive: number;
  impactNeutral: number;
  impactNegative: number;
  /** Most frequent skills, descending. */
  topSkills: Array<{ skillKey: string; count: number }>;
};

export function buildVoiceSeriesRecap(entries: VoiceSeriesLogEntry[]): VoiceSeriesRecap {
  const total = entries.length;
  const playerIds = new Set(entries.map((e) => e.playerId));
  const uniquePlayers = playerIds.size;
  let impactPositive = 0;
  let impactNeutral = 0;
  let impactNegative = 0;
  const skillCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.impact === "positive") impactPositive += 1;
    else if (e.impact === "negative") impactNegative += 1;
    else impactNeutral += 1;
    skillCounts.set(e.skillType, (skillCounts.get(e.skillType) ?? 0) + 1);
  }
  const topSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([skillKey, count]) => ({ skillKey, count }));
  return {
    total,
    uniquePlayers,
    impactPositive,
    impactNeutral,
    impactNegative,
    topSkills,
  };
}
