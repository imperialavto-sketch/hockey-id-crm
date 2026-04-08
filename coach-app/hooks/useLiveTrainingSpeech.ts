/**
 * Live Training — захват речи через expo-speech-recognition (тот же стек, что useVoiceNote).
 * Режим: короткая фраза по удержанию кнопки (push-to-talk); continuous: false на нативном слое.
 */

import { useCallback, useState } from "react";
import { useVoiceNote, DEFAULT_VOICE_LOCALE } from "@/hooks/useVoiceNote";

export type LiveTrainingSpeechState = "idle" | "listening" | "processing" | "error";

export function useLiveTrainingSpeech() {
  const [recognizedText, setRecognizedText] = useState("");

  const onTranscript = useCallback((text: string) => {
    setRecognizedText(text.trim());
  }, []);

  const voice = useVoiceNote(onTranscript, DEFAULT_VOICE_LOCALE);
  const { clearError } = voice;

  const clearRecognized = useCallback(() => {
    setRecognizedText("");
  }, []);

  const resetSpeechUi = useCallback(() => {
    clearError();
    setRecognizedText("");
  }, [clearError]);

  return {
    ...voice,
    recognizedText,
    clearRecognized,
    resetSpeechUi,
    speechState: voice.state as LiveTrainingSpeechState,
    voiceErrorKind: voice.errorKind,
  };
}
