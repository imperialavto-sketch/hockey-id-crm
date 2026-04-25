/**
 * Arena Listening Adapter — PHASE 1 transport boundary between Arena logic and native STT.
 *
 * React hooks cannot live here: `useSpeechRecognitionEvent` stays in `useArenaVoiceAssistant`,
 * which forwards native callbacks into the handler contract below. Arena product logic must
 * not call `ExpoSpeechRecognitionModule.start` directly — only through the transport.
 *
 * PHASE 1 does not promise full continuous listening; options pass through to native as-is.
 *
 * PHASE 2: `ArenaTranscriptSegment` is the only inbound utterance carrier — downstream code must
 * treat `text` as verbatim STT, never as inferred facts about the ice.
 */

export type ArenaListeningStartOptions = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  contextualStrings: string[];
  addsPunctuation?: boolean;
  volumeChangeEventOptions?: { enabled: boolean; intervalMillis: number };
};

export type ArenaTranscriptSegment = {
  text: string;
  isFinal: boolean;
};

export type ArenaNativeListeningSurface = "started" | "ended";

/**
 * Callbacks mirror the contract the agent layer needs from listening (fed by the hook).
 * They are intentionally separate from start/stop so the hook can wire `useSpeechRecognitionEvent`.
 */
export type ArenaListeningAdapterHandlers = {
  onTranscriptSegment: (segment: ArenaTranscriptSegment) => void;
  onListeningStateChange: (surface: ArenaNativeListeningSurface) => void;
  onError: (message: string, detail?: unknown) => void;
};

export type ArenaListeningTransport = {
  isRecognitionAvailable(): boolean;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  startListening(opts: ArenaListeningStartOptions): Promise<void>;
  stopListening(): void;
  abortListening(): void;
};

type NativeSpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => Promise<void>;
  stop: () => void;
  abort: () => void;
};

export function createExpoSpeechArenaListeningTransport(native: NativeSpeechModule): ArenaListeningTransport {
  return {
    isRecognitionAvailable: () => native.isRecognitionAvailable(),
    requestPermissionsAsync: () => native.requestPermissionsAsync(),
    async startListening(opts: ArenaListeningStartOptions) {
      await native.start({ ...opts });
    },
    stopListening: () => native.stop(),
    abortListening: () => {
      try {
        native.abort();
      } catch {
        try {
          native.stop();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
