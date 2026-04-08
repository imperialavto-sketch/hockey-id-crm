/**
 * Короткий голосовой отклик «Арены» (expo-speech).
 * Тексты фраз — см. `arenaVoicePhrases.ts` (единый каталог).
 * Lazy-load: avoids hard failures if the native module is missing in some builds.
 */

import { Platform } from "react-native";

type ExpoSpeechVoice = {
  identifier: string;
  name: string;
  /** `VoiceQuality.Enhanced` | `Default` с нативного модуля */
  quality: string;
  language: string;
};

type ExpoSpeechApi = {
  stop: () => Promise<void>;
  speak: (
    text: string,
    options?: {
      language?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      voice?: string;
      onDone?: () => void;
      onStopped?: () => void;
      onError?: (e: Error) => void;
    }
  ) => void;
  getAvailableVoicesAsync?: () => Promise<ExpoSpeechVoice[]>;
};

let SpeechApi: ExpoSpeechApi | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SpeechApi = require("expo-speech") as ExpoSpeechApi;
} catch (e) {
  if (__DEV__) {
    console.warn("[arenaVoiceFeedback] expo-speech unavailable; TTS disabled.", e);
  }
}

/** Язык озвучки (BCP 47). */
const ARENA_TTS_LANGUAGE = "ru-RU";

/** Длинные фразы режем на два вызова `speak` с паузой (имитация интонации без SSML). */
const ARENA_TTS_SPLIT_MIN_LEN = 52;

/** Пауза между частями, мс. */
const ARENA_TTS_CHUNK_GAP_MS = 240;

/**
 * Целевой голос фиксируется на устройстве при первом успешном `getAvailableVoicesAsync`.
 * Примеры iOS (зависят от версии): `com.apple.voice.premium.ru-RU.Milena`, `...Yuri`.
 * На Android часто `ru-ru-x-...` в Google TTS. Если подходящего нет — `null` (системный).
 */
let resolvedArenaVoiceIdentifier: string | null | undefined;

/** Для отладки / аудита: какой `voice` передан в `speak` (или `null` = дефолт ОС). */
export function getArenaTtsResolvedVoiceIdentifier(): string | null {
  if (resolvedArenaVoiceIdentifier === undefined) return null;
  return resolvedArenaVoiceIdentifier;
}

const VOICE_QUALITY_ENHANCED = "Enhanced";

function pickPreferredRussianVoice(voices: ExpoSpeechVoice[]): string | undefined {
  const ru = voices.filter((v) => {
    const lang = (v.language || "").replace("_", "-").toLowerCase();
    return lang.startsWith("ru");
  });
  if (ru.length === 0) return undefined;

  const enhanced = ru.filter((v) => v.quality === VOICE_QUALITY_ENHANCED);
  const pool = enhanced.length > 0 ? enhanced : ru;

  const rank = (v: ExpoSpeechVoice): number => {
    const id = v.identifier.toLowerCase();
    const blob = `${v.name} ${v.identifier}`.toLowerCase();
    let s = 0;
    if (id.includes("premium") || id.includes("enhanced")) s += 4;
    if (/milena|милена|katya|катя|yuri|юрий|dmitri|дмитрий/.test(blob)) s += 3;
    if (/google|neural/.test(blob)) s += 2;
    return s;
  };

  const sorted = [...pool].sort((a, b) => rank(b) - rank(a));
  return sorted[0]?.identifier;
}

async function ensureArenaVoiceResolved(): Promise<string | undefined> {
  if (resolvedArenaVoiceIdentifier !== undefined) {
    return resolvedArenaVoiceIdentifier ?? undefined;
  }
  resolvedArenaVoiceIdentifier = null;
  const getVoices = SpeechApi?.getAvailableVoicesAsync;
  if (!getVoices) {
    return undefined;
  }
  try {
    const voices = await getVoices();
    const id = pickPreferredRussianVoice(voices);
    if (id) {
      resolvedArenaVoiceIdentifier = id;
      if (__DEV__) {
        const row = voices.find((v) => v.identifier === id);
        console.log("[arena-tts] resolved voice", {
          identifier: id,
          name: row?.name,
          quality: row?.quality,
          language: row?.language,
        });
      }
      return id;
    }
  } catch (e) {
    if (__DEV__) {
      console.warn("[arena-tts] getAvailableVoicesAsync failed; using default voice.", e);
    }
  }
  return undefined;
}

async function awaitStopSpeech(): Promise<void> {
  if (!SpeechApi) return;
  try {
    await SpeechApi.stop();
  } catch {
    /* ignore */
  }
}

export function stopArenaSpeech(): void {
  void awaitStopSpeech();
}

function arenaTtsRate(): number {
  if (Platform.OS === "ios") return 0.86;
  if (Platform.OS === "android") return 0.9;
  return 0.93;
}

function arenaTtsPitch(): number {
  if (Platform.OS === "ios") return 0.92;
  if (Platform.OS === "android") return 0.94;
  return 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Две части по границе предложения или по пробелу у середины.
 * Возвращает `null`, если резать не нужно / не получается.
 */
function splitArenaTtsForPause(s: string): [string, string] | null {
  const t = s.trim();
  if (t.length <= ARENA_TTS_SPLIT_MIN_LEN) return null;

  const searchEnd = Math.min(t.length - 1, Math.floor(t.length * 0.72));
  const slice = t.slice(0, Math.max(searchEnd, 1));
  const punct = slice.match(/[.!?]\s+/);
  if (punct?.index != null && punct.index >= 10) {
    const cut = punct.index + punct[0].length;
    const a = t.slice(0, cut).trim();
    const b = t.slice(cut).trim();
    if (b.length >= 6) return [a, b];
  }

  const mid = Math.floor(t.length / 2);
  let sp = t.lastIndexOf(" ", mid + 12);
  if (sp < 10) sp = t.indexOf(" ", mid);
  if (sp <= 0 || sp >= t.length - 5) return null;
  const a = t.slice(0, sp).trim();
  const b = t.slice(sp + 1).trim();
  if (a.length < 8 || b.length < 6) return null;
  return [a, b];
}

function buildSpeakOptions(
  voiceId: string | undefined
): NonNullable<Parameters<ExpoSpeechApi["speak"]>[1]> {
  const baseOpts: NonNullable<Parameters<ExpoSpeechApi["speak"]>[1]> = {
    language: ARENA_TTS_LANGUAGE,
    rate: arenaTtsRate(),
    pitch: arenaTtsPitch(),
  };
  if (voiceId) {
    baseOpts.voice = voiceId;
  }
  return baseOpts;
}

function speakOneSegment(text: string, baseOpts: ReturnType<typeof buildSpeakOptions>): Promise<void> {
  return new Promise((resolve) => {
    if (!SpeechApi) {
      resolve();
      return;
    }
    try {
      SpeechApi.speak(text, {
        ...baseOpts,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    } catch {
      resolve();
    }
  });
}

export async function speakArenaShort(text: string): Promise<void> {
  const t = text.trim();
  if (!t) return Promise.resolve();
  await awaitStopSpeech();
  if (!SpeechApi) return Promise.resolve();

  const voiceId = await ensureArenaVoiceResolved();
  const baseOpts = buildSpeakOptions(voiceId);

  const parts = splitArenaTtsForPause(t);
  if (!parts) {
    return speakOneSegment(t, baseOpts);
  }

  const [first, second] = parts;
  await speakOneSegment(first, baseOpts);
  await sleep(ARENA_TTS_CHUNK_GAP_MS);
  await speakOneSegment(second, baseOpts);
}

/** Прогрев списка голосов в фоне — меньше ожидание перед первой фразой в сессии. */
if (SpeechApi?.getAvailableVoicesAsync) {
  void ensureArenaVoiceResolved();
}
