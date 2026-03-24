/**
 * Voice Note — tap-to-record, transcribe into note text.
 * Uses expo-speech-recognition (iOS SFSpeechRecognizer, Android SpeechRecognizer).
 * Additive to manual note input; no auto-submit.
 * Safe fallback in Expo Go when native module is unavailable.
 */

import { useState, useCallback, useEffect, useRef } from "react";

/** Lazy-load speech module to avoid crash in Expo Go (no native module) */
let SpeechModule: {
  default: {
    isRecognitionAvailable: () => boolean;
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    start: (opts: object) => Promise<void>;
    stop: () => void;
    abort: () => void;
  };
  useSpeechRecognitionEvent: (event: string, handler: (e?: unknown) => void) => void;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SpeechModule = require("expo-speech-recognition");
} catch {
  /* Expo Go / native module unavailable */
}

const useSpeechRecognitionEventStub = () => {};
const useSpeechRecognitionEvent =
  SpeechModule?.useSpeechRecognitionEvent ?? useSpeechRecognitionEventStub;

export type VoiceNoteState = "idle" | "listening" | "processing" | "error";

export interface UseVoiceNoteResult {
  state: VoiceNoteState;
  errorMessage: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  cancelListening: () => void;
  clearError: () => void;
  isAvailable: boolean;
  voiceLocale: string;
}

export const SUPPORTED_VOICE_LOCALES = ["en-US", "ru-RU"] as const;
export type VoiceLocale = (typeof SUPPORTED_VOICE_LOCALES)[number];
export const DEFAULT_VOICE_LOCALE: VoiceLocale = "ru-RU";
export const FALLBACK_VOICE_LOCALE: VoiceLocale = "en-US";

export function useVoiceNote(
  onTranscript: (text: string) => void,
  locale?: string
): UseVoiceNoteResult {
  const effectiveLocale =
    (locale && SUPPORTED_VOICE_LOCALES.includes(locale as VoiceLocale))
      ? locale
      : DEFAULT_VOICE_LOCALE;
  const [state, setState] = useState<VoiceNoteState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const transcriptRef = useRef<string>("");
  const isActiveRef = useRef(false);

  useEffect(() => {
    if (!SpeechModule?.default) {
      setIsAvailable(false);
      return;
    }
    try {
      const available = SpeechModule.default.isRecognitionAvailable();
      setIsAvailable(available);
    } catch {
      setIsAvailable(false);
    }
  }, []);

  useSpeechRecognitionEvent("start", () => {
    isActiveRef.current = true;
    setState("listening");
    setErrorMessage(null);
    transcriptRef.current = "";
  });

  useSpeechRecognitionEvent("end", () => {
    isActiveRef.current = false;
    setState((prev) => (prev === "listening" ? "idle" : prev));
  });

  useSpeechRecognitionEvent("result", (e?: unknown) => {
    const event = e as { results?: { transcript?: string }[]; isFinal?: boolean };
    const transcript = event?.results?.[0]?.transcript?.trim();
    if (transcript) {
      transcriptRef.current = transcript;
    }
    if (event.isFinal && transcriptRef.current) {
      isActiveRef.current = false;
      setState("processing");
      onTranscript(transcriptRef.current);
      setState("idle");
      transcriptRef.current = "";
    }
  });

  useSpeechRecognitionEvent("error", (e?: unknown) => {
    const event = e as { error?: string; message?: string };
    isActiveRef.current = false;
    if (event?.error === "aborted") {
      setState("idle");
      setErrorMessage(null);
      return;
    }
    setState("error");
    let msg = event?.message ?? event?.error ?? "Ошибка распознавания";
    if (event?.error === "not-allowed") {
      msg = "Нет доступа к микрофону";
    } else if (event?.error === "no-speech" || event?.error === "speech-timeout") {
      msg = "Речь не распознана";
    } else if (event?.error === "network") {
      msg = "Требуется интернет";
    } else if (event?.error === "language-not-supported") {
      msg = "Язык не поддерживается. Переключите EN/RU.";
    }
    setErrorMessage(msg);
  });

  useSpeechRecognitionEvent("nomatch", () => {
    isActiveRef.current = false;
    setState("idle");
  });

  const startListening = useCallback(async () => {
    if (!SpeechModule?.default) {
      setState("error");
      setErrorMessage("Голосовой ввод недоступен в Expo Go");
      return;
    }
    if (!isAvailable) {
      setState("error");
      setErrorMessage("Голосовой ввод недоступен в Expo Go");
      return;
    }
    if (isActiveRef.current) return;
    try {
      const result = await SpeechModule!.default.requestPermissionsAsync();
      if (!result.granted) {
        setState("error");
        setErrorMessage("Нет доступа к микрофону");
        return;
      }
      setErrorMessage(null);
      await SpeechModule!.default.start({
        lang: effectiveLocale,
        interimResults: true,
        continuous: false,
      });
    } catch (err) {
      isActiveRef.current = false;
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Не удалось запустить голосовой ввод");
    }
  }, [isAvailable, effectiveLocale]);

  const stopListening = useCallback(() => {
    if (!isActiveRef.current) return;
    if (!SpeechModule?.default) return;
    try {
      SpeechModule.default.stop();
    } catch {
      isActiveRef.current = false;
      setState("idle");
    }
  }, []);

  const cancelListening = useCallback(() => {
    if (!isActiveRef.current) return;
    if (!SpeechModule?.default) return;
    try {
      SpeechModule.default.abort();
      isActiveRef.current = false;
      setState("idle");
      setErrorMessage(null);
    } catch {
      isActiveRef.current = false;
      setState("idle");
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setState("idle");
  }, []);

  return {
    state,
    errorMessage,
    startListening,
    stopListening,
    cancelListening,
    clearError,
    isAvailable,
    voiceLocale: effectiveLocale,
  };
}
