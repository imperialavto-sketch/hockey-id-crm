import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Audio } from "expo-av";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { VoiceProcessingProgressCard } from "@/components/voice/VoiceProcessingProgressCard";
import { theme } from "@/constants/theme";
import type { VoiceProcessingStatus } from "@/lib/voicePipeline/contracts";
import {
  voicePipelineHasPartialResult,
  voicePipelineStatusHintRu,
  voicePipelineStillProcessing,
} from "@/lib/voicePipeline/uiHelpers";
import { loadCoachInputState } from "@/lib/coachInputStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  analyzeVoiceTranscriptRu,
  buildVoiceObservationPrefill,
  buildMockVoiceDraft,
  enrichVoiceStarterWithAi,
  buildVoiceStarterPayload,
  voiceStarterHandoffSignature,
  canStartVoiceRecording,
  canStopVoiceRecording,
  parseContinuousVoiceCommand,
  resetVoiceNoteHandsFreeDedupe,
  saveVoiceObservationPrefill,
  saveVoiceDraftForLater,
  saveVoiceStarterPayload,
  formatRecordingElapsed,
  buildVoiceSeriesEditLastPayload,
  tryConsumeVoiceNoteHandsFreeAction,
  voiceDraftContextRows,
  voicePhaseCardTitleRu,
  voicePhaseStatusLabelRu,
  VOICE_SERIES_EDIT_LAST_STORAGE_KEY,
  type VoiceCoachDraft,
  type VoiceCoachDraftContext,
  type VoiceStarterIntent,
  type VoiceStarterPayload,
  type VoiceIntentSuggestion,
  type VoiceUiPhase,
} from "@/lib/voiceMvp";
import { getVoiceUploadProcessingStatus, uploadVoiceAudio } from "@/services/voiceUploadService";
import { analyzeVoiceNote, createVoiceNote } from "@/services/voiceNotesService";
import { parseAnalysisJsonToVoiceProcessingResult } from "@/lib/ai/analysisJsonParse";
import type { VoiceProcessingResult } from "@/lib/ai/types";
import { processVoiceNote } from "@/lib/ai/voiceProcessing";
import {
  VOICE_NOTE_HUB_ENTRY_HINT,
  VOICE_PREVIEW_SECTION_EYEBROW,
} from "@/lib/voiceMvp/voiceStarterCompletionCopy";

const PROCESSING_MS = 1800;
const MIN_RECORDING_SEC = 1;
const NAV_DEBOUNCE_MS = 750;
const VOICE_AI_PREVIEW_DEBOUNCE_MS = 420;


function pickVoiceAiPreviewHighlights(r: VoiceProcessingResult): string[] {
  const pool = [...r.strengths, ...r.improvements, ...r.recommendations]
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of pool) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= 3) break;
  }
  return out;
}

/** Показываем премиум-блок только при явном сигнале из результата (без «пустых» заглушек). */
function voiceAiPreviewIsWorthShowing(r: VoiceProcessingResult): boolean {
  if (r.actions.length > 0) return true;
  if (r.strengths.length + r.improvements.length + r.recommendations.length > 0) {
    return true;
  }
  const s = r.summary.trim();
  if (!s) return false;
  if (/^Пустая заметка/i.test(s) || /нечего обработать/i.test(s)) return false;
  return s.length >= 16;
}

function VoiceNoteAiPreviewBlock({
  preview,
  loading,
}: {
  preview: VoiceProcessingResult | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <SectionCard elevated style={styles.aiPreviewCard}>
        <Text style={styles.aiPreviewEyebrow}>{VOICE_PREVIEW_SECTION_EYEBROW}</Text>
        <View style={styles.aiPreviewLoadingRow}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={styles.aiPreviewLoadingText}>Собираем смысл заметки…</Text>
        </View>
      </SectionCard>
    );
  }

  if (!preview || !voiceAiPreviewIsWorthShowing(preview)) {
    return null;
  }

  const highlights = pickVoiceAiPreviewHighlights(preview);
  const actionCount = preview.actions.length;
  const summaryLine = preview.summary.trim();

  return (
    <SectionCard elevated style={styles.aiPreviewCard}>
      <View style={styles.aiPreviewHeaderRow}>
        <Text style={styles.aiPreviewEyebrow}>{VOICE_PREVIEW_SECTION_EYEBROW}</Text>
        <View style={styles.aiPreviewBadge}>
          <Text style={styles.aiPreviewBadgeText}>Готово</Text>
        </View>
      </View>
      <Text style={styles.aiPreviewTitle}>Система разобрала текст</Text>
      <Text style={styles.aiPreviewSummary} numberOfLines={5}>
        {summaryLine}
      </Text>
      {highlights.length > 0 ? (
        <View style={styles.aiPreviewHighlights}>
          {highlights.map((line, i) => (
            <View key={`${i}-${line.slice(0, 48)}`} style={styles.aiPreviewBulletRow}>
              <Text style={styles.aiPreviewBulletDot}>●</Text>
              <Text style={styles.aiPreviewBulletText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {actionCount > 0 ? (
        <Text style={styles.aiPreviewMeta}>
          Найдено возможных шагов: {actionCount}
        </Text>
      ) : null}
      <View style={styles.aiPreviewDivider} />
      <Text style={styles.aiPreviewFooter}>
        Дальше можно оформить отчёт, задачу или короткое сообщение родителям — кнопки в блоке «Дальше».
      </Text>
    </SectionCard>
  );
}

type RecordedAudioMeta = {
  uri: string;
  name: string;
  mimeType: string;
};

function ContextRowsBlock({
  rows,
}: {
  rows: ReturnType<typeof voiceDraftContextRows>;
}) {
  return (
    <View style={styles.contextRows}>
      {rows.map((row) => (
        <View key={row.label} style={styles.contextRow}>
          <Text style={styles.contextRowLabel}>{row.label}</Text>
          <Text style={styles.contextRowValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CoachVoiceNoteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    audioUri?: string;
    audioName?: string;
    audioMimeType?: string;
    voiceSeries?: string;
  }>();
  const [phase, setPhase] = useState<VoiceUiPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState<VoiceCoachDraft | null>(null);
  const [contextHint, setContextHint] = useState<VoiceCoachDraftContext | undefined>(
    undefined
  );
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadedAudioId, setUploadedAudioId] = useState<string | null>(null);
  const [transcribedAudio, setTranscribedAudio] = useState(false);
  const [intentSuggestions, setIntentSuggestions] = useState<VoiceIntentSuggestion[]>([]);
  const [lastUploadMeta, setLastUploadMeta] = useState<{
    uploadId: string;
    fileName: string;
    mimeType: string;
    size: number;
  } | null>(null);
  const [savingVoiceNote, setSavingVoiceNote] = useState(false);
  const [savedVoiceNoteId, setSavedVoiceNoteId] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudioMeta | null>(
    null
  );
  const [recordingPermissionGranted, setRecordingPermissionGranted] = useState<
    boolean | null
  >(null);
  const [processingStatus, setProcessingStatus] = useState<VoiceProcessingStatus | null>(null);
  const [voiceAiPreview, setVoiceAiPreview] = useState<VoiceProcessingResult | null>(null);
  const [voiceAiPreviewLoading, setVoiceAiPreviewLoading] = useState(false);
  /** Совпадает с последним успешным `processVoiceNote` для пары transcript + playerLabel. */
  const [voiceAiPreviewSignature, setVoiceAiPreviewSignature] = useState<string | null>(null);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollingNetworkIssue, setPollingNetworkIssue] = useState(false);

  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const mountedRef = useRef(true);
  const navigatingRef = useRef(false);
  const navDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRunIdRef = useRef(0);
  /** transcript+player sig, для которого уже подставлен server analyze — client debounce не перезаписывает. */
  const serverBackedPreviewSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      if (navDebounceTimerRef.current) {
        clearTimeout(navDebounceTimerRef.current);
        navDebounceTimerRef.current = null;
      }
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      void Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCoachInputState()
      .then((state) => {
        if (cancelled || !state) return;
        const obs = state.sessionDraft.observations.at(-1);
        const title = state.sessionDraft.title?.trim();
        const hint: VoiceCoachDraftContext = {
          sessionStartedAt: state.sessionDraft.startedAt,
        };
        if (obs?.playerName || obs?.playerId) {
          hint.playerId = obs.playerId;
          hint.playerLabel = obs.playerName;
        }
        if (title) hint.sessionHint = title;
        setContextHint(hint);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const goIdle = useCallback(() => {
    navigatingRef.current = false;
    if (navDebounceTimerRef.current) {
      clearTimeout(navDebounceTimerRef.current);
      navDebounceTimerRef.current = null;
    }
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    if (recordingRef.current) {
      void recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
      void Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
    setPhase("idle");
    setSeconds(0);
    setDraft(null);
    setErrorDetail(null);
    setUploadingAudio(false);
    setUploadedAudioId(null);
    setTranscribedAudio(false);
    setIntentSuggestions([]);
    setLastUploadMeta(null);
    setSavingVoiceNote(false);
    setSavedVoiceNoteId(null);
    setRecordedAudio(null);
    setProcessingStatus(null);
    setVoiceAiPreview(null);
    setVoiceAiPreviewLoading(false);
    setVoiceAiPreviewSignature(null);
    setPollingTimedOut(false);
    setPollingNetworkIssue(false);
    resetVoiceNoteHandsFreeDedupe();
  }, []);

  const safePush = useCallback(
    (href: Href) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      router.push(href);
      if (navDebounceTimerRef.current) clearTimeout(navDebounceTimerRef.current);
      navDebounceTimerRef.current = setTimeout(() => {
        navDebounceTimerRef.current = null;
        navigatingRef.current = false;
      }, NAV_DEBOUNCE_MS);
    },
    [router]
  );

  const startRecording = async () => {
    if (!canStartVoiceRecording(phase)) return;
    if (recordingRef.current) return;
    try {
      const perm = await Audio.requestPermissionsAsync();
      setRecordingPermissionGranted(perm.granted);
      if (!perm.granted) {
        setPhase("failed");
        setErrorDetail("Нет доступа к микрофону. Разрешите запись в настройках.");
        Alert.alert(
          "Доступ к микрофону",
          "Разрешите доступ к микрофону, чтобы записывать голосовые заметки."
        );
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      rec.setOnRecordingStatusUpdate((status) => {
        const sec = Math.max(
          0,
          Math.floor(((status as { durationMillis?: number }).durationMillis ?? 0) / 1000)
        );
        setSeconds(sec);
      });
      await rec.startAsync();
      recordingRef.current = rec;
      setDraft(null);
      setErrorDetail(null);
      setRecordedAudio(null);
      setUploadedAudioId(null);
      setTranscribedAudio(false);
      setIntentSuggestions([]);
      setLastUploadMeta(null);
      setSavedVoiceNoteId(null);
      setSeconds(0);
      setPhase("recording");
    } catch (e) {
      setPhase("failed");
      setErrorDetail("Не удалось начать запись. Попробуйте ещё раз.");
      const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
      Alert.alert("Ошибка записи", msg);
    }
  };

  const stopRecording = async () => {
    if (!canStopVoiceRecording(phase)) return;
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      if (!uri) {
        setPhase("failed");
        setErrorDetail("Файл записи не найден. Повторите запись.");
        return;
      }
      if (seconds < MIN_RECORDING_SEC) {
        setPhase("failed");
        setErrorDetail("Запись слишком короткая. Удерживайте кнопку чуть дольше.");
        setSeconds(0);
        return;
      }
      const recorded = seconds;
      const fileName = `voice-${Date.now()}.m4a`;
      setRecordedAudio({
        uri,
        name: fileName,
        mimeType: "audio/x-m4a",
      });
      setPhase("processing");
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
      processingTimerRef.current = setTimeout(() => {
        processingTimerRef.current = null;
        if (!mountedRef.current) return;
        const d = buildMockVoiceDraft({
          recordingDurationSec: recorded,
          createdAt: new Date(),
          context: contextHint,
        });
        setDraft(d);
        setIntentSuggestions(analyzeVoiceTranscriptRu(d.transcript).suggestions);
        setPhase("ready");
      }, PROCESSING_MS);
    } catch (e) {
      setPhase("failed");
      setErrorDetail("Не удалось остановить запись.");
      const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
      Alert.alert("Ошибка записи", msg);
    }
  };

  const retryAfterFailure = () => {
    goIdle();
  };

  const newNoteFromReady = () => {
    goIdle();
  };

  const openFromDraft = useCallback(
    async (intent: VoiceStarterIntent) => {
      if (!draft || phase !== "ready") return;
      if (!draft.transcript?.trim()) {
        Alert.alert("Нет текста", "Дождитесь расшифровки или добавьте смысл в заметку, затем повторите шаг.");
        return;
      }
      const built = buildVoiceStarterPayload(draft, intent);
      const sig = voiceStarterHandoffSignature(draft.transcript, draft.context?.playerLabel);
      const canHandoffAi =
        !voiceAiPreviewLoading &&
        voiceAiPreview != null &&
        voiceAiPreviewSignature === sig;
      const withHandoff: VoiceStarterPayload = canHandoffAi
        ? { ...built, aiProcessed: voiceAiPreview }
        : built;
      const payload = await enrichVoiceStarterWithAi(withHandoff);
      const id = await saveVoiceStarterPayload(payload);

      if (intent === "coach_note" || intent === "parent_draft") {
        safePush({ pathname: "/dev/coach-input", params: { voiceStarterId: id } } as Href);
        return;
      }
      if (intent === "report_draft") {
        safePush({ pathname: "/voice-starter/report-draft", params: { voiceStarterId: id } } as Href);
        return;
      }
      safePush({ pathname: "/voice-starter/action-item", params: { voiceStarterId: id } } as Href);
    },
    [
      draft,
      phase,
      safePush,
      voiceAiPreview,
      voiceAiPreviewLoading,
      voiceAiPreviewSignature,
    ]
  );

  const onSaveLater = useCallback(async () => {
    if (!draft || phase !== "ready") return;
    const count = await saveVoiceDraftForLater(draft);
    Alert.alert(
      "Сохранено",
      `Черновик добавлен в локальные сохранения.\n\nВсего сохранено: ${count}.`,
      [{ text: "Понятно" }]
    );
  }, [draft, phase]);

  const openObservationFromDraft = useCallback(async () => {
    if (!draft || phase !== "ready") return;
    const prefill = buildVoiceObservationPrefill(draft.transcript);
    if (draft.context?.playerLabel && !prefill.playerNameCandidate) {
      prefill.playerNameCandidate = draft.context.playerLabel;
    }
    const id = await saveVoiceObservationPrefill(prefill);
    safePush({
      pathname: "/dev/coach-input",
      params: {
        voiceObservationPrefillId: id,
        ...(params.voiceSeries === "1" ? { voiceSeries: "1" } : {}),
      },
    } as Href);
  }, [draft, params.voiceSeries, phase, safePush]);

  useEffect(() => {
    if (params.voiceSeries !== "1" || phase !== "ready" || !draft) return;
    const t = draft.transcript.trim();
    if (!t) return;
    const cmd = parseContinuousVoiceCommand(t);
    if (!cmd) return;
    if (!tryConsumeVoiceNoteHandsFreeAction(draft.id, t, cmd)) return;

    if (cmd === "next") {
      void openObservationFromDraft();
      return;
    }
    if (cmd === "exit") {
      router.replace("/dev/coach-input" as Href);
      return;
    }
    if (cmd === "fix") {
      void (async () => {
        try {
          await AsyncStorage.setItem(
            VOICE_SERIES_EDIT_LAST_STORAGE_KEY,
            buildVoiceSeriesEditLastPayload()
          );
        } catch {
          /* ignore */
        }
        safePush({
          pathname: "/dev/coach-input",
          params: { voiceSeries: "1" },
        } as Href);
      })();
    }
  }, [draft, openObservationFromDraft, params.voiceSeries, phase, router, safePush]);

  useEffect(() => {
    const uploadId = lastUploadMeta?.uploadId;
    if (!uploadId || phase !== "ready") {
      return;
    }

    pollingRunIdRef.current += 1;
    const runId = pollingRunIdRef.current;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 48;
    setPollingTimedOut(false);
    setPollingNetworkIssue(false);

    const mergeFromProcessing = (p: VoiceProcessingStatus) => {
      const t = p.transcript.text?.trim();
      const s = p.summary.text?.trim();
      const hl =
        p.summary.highlights?.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        ).map((x) => x.trim()) ?? [];
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(t && t.length >= 3 ? { transcript: t } : {}),
          ...(s ? { summary: s } : {}),
          ...(hl.length > 0 ? { extractedPoints: hl } : {}),
        };
      });
      if (t && t.length >= 3) {
        setTranscribedAudio(true);
        setIntentSuggestions((prev) => {
          if (prev.length > 0) return prev;
          return analyzeVoiceTranscriptRu(t).suggestions;
        });
      }
    };

    const run = async () => {
      while (!cancelled && attempts < maxAttempts) {
        if (runId !== pollingRunIdRef.current) return;
        attempts += 1;
        try {
          const res = await getVoiceUploadProcessingStatus(uploadId);
          if (cancelled) return;
          setPollingNetworkIssue(false);
          setProcessingStatus(res.processing);
          mergeFromProcessing(res.processing);
          const p = res.processing;
          if (p.upload.status === "failed") return;
          if (!voicePipelineStillProcessing(p)) return;
        } catch {
          if (cancelled) return;
          setPollingNetworkIssue(true);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setPollingTimedOut(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [lastUploadMeta?.uploadId, phase]);

  const handleRefreshProcessingStatus = useCallback(async () => {
    const uploadId = lastUploadMeta?.uploadId?.trim();
    if (!uploadId) return;
    try {
      const res = await getVoiceUploadProcessingStatus(uploadId);
      setProcessingStatus(res.processing);
      setPollingTimedOut(false);
      setPollingNetworkIssue(false);
      const t = res.processing.transcript.text?.trim();
      if (t && t.length >= 3) {
        const analysis = analyzeVoiceTranscriptRu(t);
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                transcript: t,
                summary: res.processing.summary.text?.trim() || analysis.summary,
                extractedPoints:
                  res.processing.summary.highlights?.filter(
                    (x): x is string => typeof x === "string" && x.trim().length > 0
                  ).map((x) => x.trim()) || analysis.highlights,
              }
            : prev
        );
        setTranscribedAudio(true);
      }
    } catch {
      setPollingNetworkIssue(true);
    }
  }, [lastUploadMeta?.uploadId]);

  const handleUploadAudio = useCallback(async () => {
    if (phase !== "ready" || !draft || uploadingAudio) return;
    const audioUri = recordedAudio?.uri ?? params.audioUri?.trim();
    const audioName = (recordedAudio?.name ?? params.audioName?.trim()) || undefined;
    const audioMimeType =
      (recordedAudio?.mimeType ?? params.audioMimeType?.trim()) || undefined;
    if (!audioUri) {
      Alert.alert(
        "Аудиофайл недоступен",
        "Сначала запишите голосовую заметку, затем повторите загрузку."
      );
      return;
    }
    setUploadingAudio(true);
    try {
      const result = await uploadVoiceAudio({
        uri: audioUri,
        name: audioName,
        mimeType: audioMimeType,
      });
      setUploadedAudioId(result.uploadId);
      setLastUploadMeta({
        uploadId: result.uploadId,
        fileName: result.fileName,
        mimeType: result.mimeType,
        size: result.size,
      });
      if (result.processing) {
        setProcessingStatus(result.processing);
      }
      if (result.transcript?.trim()) {
        const analysis = analyzeVoiceTranscriptRu(result.transcript);
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                transcript: result.transcript!.trim(),
                summary: analysis.summary,
                extractedPoints: analysis.highlights,
              }
            : prev
        );
        setIntentSuggestions(analysis.suggestions);
        setTranscribedAudio(true);
        Alert.alert(
          "Аудио распознано",
          `Файл загружен и расшифрован.\nID: ${result.uploadId}`
        );
      } else if (result.sttStatus === "not_configured") {
        Alert.alert(
          "Аудио загружено",
          `Файл принят сервером, но STT не настроен.\n${result.sttError ?? ""}`.trim()
        );
      } else if (result.sttStatus === "stt_error") {
        Alert.alert(
          "Аудио загружено",
          `Файл принят сервером, но распознавание не удалось.\n${result.sttError ?? ""}`.trim()
        );
      } else {
        Alert.alert(
          "Аудио загружено",
          `Файл принят сервером.\nID: ${result.uploadId}\nРазмер: ${result.size} байт`
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка загрузки аудио";
      Alert.alert("Не удалось загрузить аудио", message);
    } finally {
      setUploadingAudio(false);
    }
  }, [
    draft,
    phase,
    params.audioMimeType,
    params.audioName,
    params.audioUri,
    recordedAudio,
    uploadingAudio,
  ]);

  const handleSaveVoiceNote = useCallback(async () => {
    if (!draft || phase !== "ready") return;
    if (savingVoiceNote || savedVoiceNoteId) return;
    if (!lastUploadMeta?.uploadId) {
      Alert.alert(
        "Сначала загрузите аудио",
        "Чтобы сохранить голосовую заметку, сначала выполните upload (и желательно распознавание)."
      );
      return;
    }
    const transcript =
      draft.transcript.trim().length >= 3
        ? draft.transcript.trim()
        : processingStatus?.transcript.text?.trim() ?? "";
    if (transcript.length < 3) {
      Alert.alert("Пустая расшифровка", "Нечего сохранять.");
      return;
    }
    const summary =
      draft.summary?.trim() ||
      processingStatus?.summary.text?.trim() ||
      null;
    const highlights =
      draft.extractedPoints.length > 0
        ? draft.extractedPoints
        : processingStatus?.summary.highlights?.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          ).map((x) => x.trim()) ?? [];
    setSavingVoiceNote(true);
    try {
      const handoffSig = voiceStarterHandoffSignature(
        draft.transcript.trim(),
        draft.context?.playerLabel
      );
      const analysisJson =
        voiceAiPreview != null && voiceAiPreviewSignature === handoffSig
          ? voiceAiPreview
          : undefined;
      const res = await createVoiceNote({
        playerId: draft.context?.playerId,
        transcript,
        summary,
        highlights,
        suggestions: intentSuggestions,
        uploadId: lastUploadMeta.uploadId,
        audioFileName: lastUploadMeta.fileName,
        audioMimeType: lastUploadMeta.mimeType,
        audioSizeBytes: lastUploadMeta.size,
        ...(analysisJson !== undefined ? { analysisJson } : {}),
      });
      if (!res.ok) {
        Alert.alert("Не удалось сохранить", res.error);
        return;
      }
      const noteId = res.data.id;
      const transcriptForMerge = draft.transcript.trim();
      const playerLabelForMerge = draft.context?.playerLabel;
      setSavedVoiceNoteId(noteId);
      Alert.alert("Сохранено", "Голосовая заметка сохранена на сервере.");

      void (async () => {
        const analyzed = await analyzeVoiceNote(noteId);
        if (!mountedRef.current || !analyzed.ok) return;
        const serverAi = parseAnalysisJsonToVoiceProcessingResult(analyzed.analysisJson);
        if (!serverAi || transcriptForMerge.length < 3) return;
        const mergeSig = voiceStarterHandoffSignature(
          transcriptForMerge,
          playerLabelForMerge
        );
        serverBackedPreviewSignatureRef.current = mergeSig;
        setVoiceAiPreview(serverAi);
        setVoiceAiPreviewSignature(mergeSig);
      })();
    } finally {
      setSavingVoiceNote(false);
    }
  }, [
    draft,
    intentSuggestions,
    lastUploadMeta,
    phase,
    processingStatus,
    savedVoiceNoteId,
    savingVoiceNote,
    voiceAiPreview,
    voiceAiPreviewSignature,
  ]);

  const showSessionContextHint =
    contextHint &&
    (contextHint.playerLabel ||
      contextHint.sessionHint ||
      contextHint.teamLabel ||
      contextHint.sessionStartedAt != null);

  useEffect(() => {
    if (phase !== "ready" || !draft?.transcript?.trim()) {
      serverBackedPreviewSignatureRef.current = null;
      setVoiceAiPreview(null);
      setVoiceAiPreviewSignature(null);
      setVoiceAiPreviewLoading(false);
      return;
    }
    const text = draft.transcript.trim();
    const playerName = draft.context?.playerLabel;
    setVoiceAiPreviewLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const sig = voiceStarterHandoffSignature(text, playerName);
          if (serverBackedPreviewSignatureRef.current === sig) {
            return;
          }
          setVoiceAiPreview(null);
          setVoiceAiPreviewSignature(null);
          const r = await processVoiceNote({ text, playerName });
          if (cancelled) return;
          const sigNow = voiceStarterHandoffSignature(text, playerName);
          if (serverBackedPreviewSignatureRef.current === sigNow) {
            return;
          }
          setVoiceAiPreview(r);
          setVoiceAiPreviewSignature(sigNow);
        } catch {
          if (!cancelled) {
            const sigOnErr = voiceStarterHandoffSignature(text, playerName);
            if (serverBackedPreviewSignatureRef.current !== sigOnErr) {
              setVoiceAiPreview(null);
              setVoiceAiPreviewSignature(null);
            }
          }
        } finally {
          if (!cancelled) setVoiceAiPreviewLoading(false);
        }
      })();
    }, VOICE_AI_PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, draft?.transcript, draft?.context?.playerLabel]);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.subHero}>
          {phase === "ready"
            ? "Черновик готов: сначала краткий разбор, ниже полный текст и шаги переноса в работу."
            : "Запишите голос, загрузите аудио на сервер и получите расшифровку. Затем сохраните заметку в историю."}
        </Text>

        <SectionCard elevated style={styles.stateCard}>
          <Text style={styles.stateKicker}>{voicePhaseCardTitleRu(phase)}</Text>
          <Text style={styles.stateTitle}>{voicePhaseStatusLabelRu(phase)}</Text>
          {phase === "recording" && (
            <Text style={styles.timer}>{formatRecordingElapsed(seconds)}</Text>
          )}
          {phase === "processing" && (
            <View style={styles.procRow}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.procText}>Пожалуйста, подождите…</Text>
            </View>
          )}
          {phase === "failed" && errorDetail ? (
            <Text style={styles.errorDetail}>{errorDetail}</Text>
          ) : null}
          {recordingPermissionGranted === false ? (
            <Text style={styles.errorDetail}>
              Микрофон отключён. Разрешите доступ в настройках устройства.
            </Text>
          ) : null}
          {phase !== "ready" && (
            <>
              {showSessionContextHint ? (
                <Text style={styles.contextLine}>
                  Контекст записи:{" "}
                  {[contextHint?.sessionHint, contextHint?.playerLabel]
                    .filter(Boolean)
                    .join(" · ") ||
                    (contextHint?.sessionStartedAt != null
                      ? "есть черновик сессии"
                      : "")}
                </Text>
              ) : (
                <Text style={styles.contextLineMuted}>
                  Контекст команды/сессии не подтянут — можно записать заметку без привязки.
                </Text>
              )}
            </>
          )}
        </SectionCard>

        <View style={styles.mainActions}>
          {canStartVoiceRecording(phase) && (
            <Pressable
              onPress={startRecording}
              style={({ pressed }) => [
                styles.micOuter,
                pressed && styles.micPressed,
              ]}
            >
              <View style={styles.micInner}>
                <Text style={styles.micGlyph}>●</Text>
                <Text style={styles.micLabel}>Начать запись</Text>
              </View>
            </Pressable>
          )}

          {canStopVoiceRecording(phase) && (
            <PrimaryButton
              title="Остановить и подготовить черновик"
              onPress={stopRecording}
              variant="outline"
              style={styles.stopBtn}
            />
          )}

          {phase === "processing" && (
            <PrimaryButton title="Отменить обработку" onPress={goIdle} variant="ghost" />
          )}

          {phase === "ready" && (
            <PrimaryButton title="Сбросить черновик" onPress={goIdle} variant="ghost" />
          )}

          {phase === "failed" && (
            <PrimaryButton title="Попробовать снова" onPress={retryAfterFailure} />
          )}
        </View>

        {phase === "processing" ? (
          <SectionCard elevated style={styles.draftCard}>
            <Text style={styles.sectionKicker}>Подготовка</Text>
            <Text style={styles.draftTitle}>Черновик расшифровки</Text>
            <Text style={styles.placeholderText}>
              Текст появится через несколько секунд…
            </Text>
          </SectionCard>
        ) : null}

        {phase === "ready" && draft ? (
          <>
            <SectionCard elevated style={styles.contextCard}>
              <Text style={styles.sectionKicker}>Контекст</Text>
              <Text style={styles.blockLead}>
                Данные для ориентира. Пустые поля можно заполнить в записи сессии.
              </Text>
              <ContextRowsBlock rows={voiceDraftContextRows(draft)} />
            </SectionCard>

            {voiceAiPreviewLoading ? (
              <VoiceNoteAiPreviewBlock preview={null} loading />
            ) : voiceAiPreview && voiceAiPreviewIsWorthShowing(voiceAiPreview) ? (
              <VoiceNoteAiPreviewBlock preview={voiceAiPreview} loading={false} />
            ) : voiceAiPreview && !voiceAiPreviewIsWorthShowing(voiceAiPreview) ? (
              <SectionCard elevated style={styles.aiPreviewFallbackCard}>
                <Text style={styles.aiPreviewEyebrow}>Следующий шаг</Text>
                <Text style={styles.aiPreviewFallbackText}>
                  Короткий разбор пока не выделен — можно сразу перенести заметку в отчёт, задачу или сообщение
                  родителям; текст подставится автоматически.
                </Text>
              </SectionCard>
            ) : null}

            <SectionCard elevated style={styles.draftCard}>
              <Text style={styles.sectionKicker}>Текст</Text>
              <Text style={styles.draftTitle}>Расшифровка</Text>
              <Text style={styles.transcript}>{draft.transcript}</Text>
              {params.voiceSeries === "1" ? (
                <Text style={styles.handsFreeHint}>
                  Серия: если вся расшифровка — одна короткая фраза, можно сказать «дальше» (как
                  «Создать наблюдение»), «исправить» (вернуться к последнему наблюдению) или «выйти»
                  из серии. Длинный текст не обрабатывается как команда.
                </Text>
              ) : null}

              <View style={styles.sectionDivider} />

              <Text style={styles.draftTitle}>Краткое содержание</Text>
              <Text style={styles.summaryBody}>{draft.summary ?? "—"}</Text>

              <View style={styles.sectionDivider} />

              <Text style={styles.draftTitle}>Акценты</Text>
              {draft.extractedPoints.map((line, i) => (
                <View key={`${line}-${i}`} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </SectionCard>

            {lastUploadMeta && processingStatus ? (
              <StaggerFadeIn preset="snappy" delay={12}>
                <VoiceProcessingProgressCard
                  processing={processingStatus}
                  subtitle={voicePipelineStatusHintRu(processingStatus)}
                />
              </StaggerFadeIn>
            ) : null}
            {processingStatus ? (
              <SectionCard elevated style={styles.draftCardMuted}>
                <Text style={styles.uploadHint}>{voicePipelineStatusHintRu(processingStatus)}</Text>
                {voicePipelineHasPartialResult(processingStatus) ? (
                  <Text style={styles.uploadHint}>
                    Расшифровка уже доступна. Если резюме не подтянулось, можно сохранить заметку и вернуться позже.
                  </Text>
                ) : null}
                {pollingNetworkIssue ? (
                  <Text style={styles.uploadHint}>
                    Связь нестабильна. Обработка продолжается, проверьте статус позже.
                  </Text>
                ) : null}
                {pollingTimedOut ? (
                  <Text style={styles.uploadHint}>
                    Ответ от сервера задерживается. Можно открыть экран позже — обработка не потеряется.
                  </Text>
                ) : null}
                {(voicePipelineStillProcessing(processingStatus) ||
                  pollingTimedOut ||
                  pollingNetworkIssue) && (
                  <PrimaryButton
                    title="Проверить ещё раз"
                    variant="ghost"
                    onPress={() => void handleRefreshProcessingStatus()}
                  />
                )}
              </SectionCard>
            ) : null}

            <View style={styles.createBlock}>
              <Text style={styles.createTitle}>Дальше</Text>
              <Text style={styles.createSub}>
                По желанию: загрузка и сохранение в историю, затем перенос смысла в отчёт, задачу или сообщение
                родителям.
              </Text>
              <Text style={styles.hubEntryHint}>{VOICE_NOTE_HUB_ENTRY_HINT}</Text>
              <PrimaryButton
                title="Созданные материалы"
                variant="outline"
                onPress={() => safePush("/created")}
                style={styles.nextBtn}
              />
              {intentSuggestions.length > 0 ? (
                <Text style={styles.intentHint}>
                  Рекомендация: {intentSuggestions.slice(0, 2).map((x) => x.label).join(" · ")}
                </Text>
              ) : null}
              <PrimaryButton
                title={
                  uploadingAudio
                    ? "Загрузка и распознавание…"
                    : uploadedAudioId
                      ? "Аудио уже загружено"
                      : "Загрузить аудио"
                }
                variant="outline"
                onPress={handleUploadAudio}
                disabled={uploadingAudio || !!uploadedAudioId}
                style={styles.nextBtn}
              />
              <PrimaryButton
                title={
                  savingVoiceNote
                    ? "Сохранение…"
                    : savedVoiceNoteId
                      ? "Заметка сохранена"
                      : "Сохранить в историю"
                }
                variant="outline"
                onPress={handleSaveVoiceNote}
                disabled={savingVoiceNote || !!savedVoiceNoteId}
                style={styles.nextBtn}
              />
              {savedVoiceNoteId ? (
                <PrimaryButton
                  title="Открыть историю"
                  variant="ghost"
                  onPress={() => safePush("/voice-notes")}
                  style={styles.nextBtn}
                />
              ) : null}
              <View style={styles.sectionDivider} />
              <Text style={styles.createSub}>Перенести в рабочие разделы</Text>
              <PrimaryButton
                title="Создать наблюдение"
                variant="outline"
                onPress={openObservationFromDraft}
                style={styles.nextBtn}
              />
              <PrimaryButton
                title="Заметка тренера (в запись сессии)"
                variant="outline"
                onPress={() => openFromDraft("coach_note")}
                style={styles.nextBtn}
              />
              <PrimaryButton
                title="Сообщение родителю"
                variant="outline"
                onPress={() => openFromDraft("parent_draft")}
                style={styles.nextBtn}
              />
              <PrimaryButton
                title="Черновик отчёта"
                variant="outline"
                onPress={() => openFromDraft("report_draft")}
                style={styles.nextBtn}
              />
              <PrimaryButton
                title="Задача / действие"
                variant="outline"
                onPress={() => openFromDraft("action_item")}
                style={styles.nextBtn}
              />
              {!recordedAudio && !params.audioUri ? (
                <Text style={styles.uploadHint}>
                  Сначала выполните запись. После остановки локальный файл будет готов к загрузке.
                </Text>
              ) : null}
              {recordedAudio ? (
                <Text style={styles.uploadHint}>
                  Файл готов: {recordedAudio.name}
                </Text>
              ) : null}
              {transcribedAudio ? (
                <Text style={styles.uploadHint}>
                  Расшифровка обновлена после распознавания.
                </Text>
              ) : null}
              <PrimaryButton
                title="Сохранить на потом"
                variant="ghost"
                onPress={onSaveLater}
                style={styles.nextBtn}
              />
              <PrimaryButton
                title="Новая голосовая заметка"
                onPress={newNoteFromReady}
              />
            </View>
          </>
        ) : null}

        {phase !== "ready" && phase !== "processing" ? (
          <SectionCard style={styles.draftCardMuted}>
            <Text style={styles.placeholderText}>
              {phase === "recording"
                ? "Идёт запись… после остановки здесь появится черновик."
                : phase === "idle" || phase === "failed"
                  ? "После остановки записи появится расшифровка, краткое содержание и шаги переноса в работу."
                  : "—"}
            </Text>
          </SectionCard>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: theme.spacing.xxl,
  },
  subHero: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  stateCard: {
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  stateKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.xs,
  },
  stateTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  timer: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  procRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  procText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  errorDetail: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
  contextLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
  contextLineMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
  mainActions: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    alignItems: "center",
  },
  micOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  micInner: {
    alignItems: "center",
  },
  micGlyph: {
    fontSize: 28,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  micLabel: {
    ...theme.typography.caption,
    fontWeight: "600",
    color: theme.colors.primary,
    textAlign: "center",
  },
  stopBtn: {
    width: "100%",
    maxWidth: 360,
  },
  contextCard: {
    marginBottom: theme.spacing.lg,
  },
  aiPreviewCard: {
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accentMuted,
    backgroundColor: theme.colors.accentMuted,
  },
  aiPreviewFallbackCard: {
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    opacity: 0.95,
  },
  aiPreviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  aiPreviewEyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.accent,
  },
  aiPreviewBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primary,
  },
  aiPreviewBadgeText: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.primary,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  aiPreviewTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  aiPreviewSummary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  aiPreviewHighlights: {
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  aiPreviewBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  aiPreviewBulletDot: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    marginTop: 3,
    fontSize: 8,
  },
  aiPreviewBulletText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
  aiPreviewMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  aiPreviewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  aiPreviewFooter: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  aiPreviewFallbackText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  aiPreviewLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  aiPreviewLoadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  draftCard: {
    marginBottom: theme.spacing.lg,
  },
  draftCardMuted: {
    marginBottom: theme.spacing.lg,
    opacity: 0.88,
  },
  sectionKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.xs,
  },
  blockLead: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  contextRows: {
    gap: theme.spacing.md,
  },
  contextRow: {
    marginBottom: theme.spacing.md,
  },
  contextRowLabel: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  contextRowValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  draftTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  transcript: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  handsFreeHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  placeholderText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    lineHeight: 22,
  },
  summaryBody: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  bulletDot: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "700",
    marginTop: 2,
  },
  bulletText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  createBlock: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  createTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  createSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  intentHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  nextBtn: {
    width: "100%",
  },
  uploadHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  hubEntryHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
});
