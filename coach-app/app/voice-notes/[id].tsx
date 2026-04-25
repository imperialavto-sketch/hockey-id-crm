import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { VoiceProcessingProgressCard } from "@/components/voice/VoiceProcessingProgressCard";
import { theme } from "@/constants/theme";
import type { VoiceProcessingStatus } from "@/lib/voicePipeline/contracts";
import {
  voicePipelineHasPartialResult,
  voicePipelineStatusHintRu,
  voicePipelineStillProcessing,
} from "@/lib/voicePipeline/uiHelpers";
import { parseAnalysisJsonToVoiceProcessingResult } from "@/lib/ai/analysisJsonParse";
import { getVoiceNoteById, type CreatedVoiceNote } from "@/services/voiceNotesService";
import { getVoiceUploadProcessingStatus } from "@/services/voiceUploadService";
import {
  buildVoiceStarterFromVoiceRecap,
  enrichVoiceStarterWithAi,
  deriveVoiceRecapSuggestions,
  formatVoiceDateTimeFullRu,
  getVoiceCreationMemoryForNote,
  hasAnyRecapSuggestion,
  markVoiceCreationForNote,
  saveVoiceStarterPayload,
  type VoiceRecapSuggestionKind,
  type VoiceStarterIntent,
  type VoiceStarterPayload,
} from "@/lib/voiceMvp";
import {
  createActionItem,
  createParentDraft,
  createReport,
  type VoiceNoteCreateSource,
  voiceStarterToCreateActionInput,
  voiceStarterToCreateParentDraftInput,
  voiceStarterToCreateReportInput,
  voiceNoteToActionInput,
  voiceNoteToParentDraftInput,
  voiceNoteToReportInput,
} from "@/services/voiceCreateService";

function safeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean);
}

export default function VoiceNoteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<CreatedVoiceNote | null>(null);
  const [liveProcessing, setLiveProcessing] = useState<VoiceProcessingStatus | null>(null);
  const [submitting, setSubmitting] = useState<"report" | "action" | "parent" | null>(
    null
  );
  const [openingStarter, setOpeningStarter] = useState(false);
  const [quickCreated, setQuickCreated] = useState<
    Partial<Record<VoiceRecapSuggestionKind, string>>
  >({});
  const [createdByMemory, setCreatedByMemory] = useState<
    Partial<Record<VoiceRecapSuggestionKind, boolean>>
  >({});
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollingNetworkIssue, setPollingNetworkIssue] = useState(false);

  useEffect(() => {
    setQuickCreated({});
    setCreatedByMemory({});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getVoiceCreationMemoryForNote(id).then((memory) => {
      if (cancelled) return;
      setCreatedByMemory({
        report_draft: Boolean(memory.report_draft),
        action_item: Boolean(memory.action_item),
        parent_draft: Boolean(memory.parent_draft),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const fetchOne = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getVoiceNoteById(id)
      .then((res) => {
        if (!res.ok) {
          setNote(null);
          setError(res.error);
          return;
        }
        setNote(res.data);
        setLiveProcessing(res.data.processing ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => fetchOne(), [fetchOne]);

  const serverAiSnapshot = useMemo(
    () => parseAnalysisJsonToVoiceProcessingResult(note?.analysisJson ?? null),
    [note?.analysisJson]
  );

  const shouldPollProcessing = Boolean(
    note?.uploadId &&
      note.processing &&
      voicePipelineStillProcessing(note.processing)
  );

  useEffect(() => {
    const uploadId = note?.uploadId?.trim();
    if (!uploadId || !shouldPollProcessing) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 36;
    setPollingTimedOut(false);
    setPollingNetworkIssue(false);

    const run = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          const res = await getVoiceUploadProcessingStatus(uploadId);
          if (cancelled) return;
          setPollingNetworkIssue(false);
          setLiveProcessing(res.processing);
          if (res.processing.upload.status === "failed") return;
          if (!voicePipelineStillProcessing(res.processing)) return;
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
  }, [note?.uploadId, note?.id, shouldPollProcessing]);

  const handleRefreshProcessing = useCallback(async () => {
    const uploadId = note?.uploadId?.trim();
    if (!uploadId) return;
    try {
      const res = await getVoiceUploadProcessingStatus(uploadId);
      setLiveProcessing(res.processing);
      setPollingTimedOut(false);
      setPollingNetworkIssue(false);
    } catch {
      setPollingNetworkIssue(true);
    }
  }, [note?.uploadId]);

  const processing = liveProcessing ?? note?.processing ?? null;

  const recapSummary = useMemo(() => {
    if (!note) return null;
    return (
      note.summary?.trim() ||
      processing?.summary.text?.trim() ||
      null
    );
  }, [note, processing]);

  const recapTranscript = useMemo(() => {
    if (!note) return "";
    const fromNote = note.transcript?.trim() ?? "";
    if (fromNote.length >= 3) return fromNote;
    return processing?.transcript.text?.trim() || fromNote;
  }, [note, processing]);

  const recapHighlights = useMemo(() => {
    if (!note) return [];
    const fromJson = safeStringArray(note.highlightsJson);
    const fromProc =
      processing?.summary.highlights?.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      ).map((x) => x.trim()) ?? [];
    return fromJson.length > 0 ? fromJson : fromProc;
  }, [note, processing]);

  const effectiveNote = useMemo((): CreatedVoiceNote | null => {
    if (!note) return null;
    return {
      ...note,
      transcript: recapTranscript.trim() ? recapTranscript : note.transcript,
      summary: recapSummary ?? note.summary,
      highlightsJson: recapHighlights.length > 0 ? recapHighlights : note.highlightsJson,
      processing: processing ?? note.processing,
    };
  }, [note, recapTranscript, recapSummary, recapHighlights, processing]);

  /** Нижние «Действия»: тот же источник, что и раньше, плюс server analysisJson при валидном snapshot. */
  const actionsCreateSource = useMemo((): VoiceNoteCreateSource | null => {
    if (!effectiveNote) return null;
    return {
      id: effectiveNote.id,
      playerId: effectiveNote.playerId,
      transcript: effectiveNote.transcript,
      summary: effectiveNote.summary,
      highlightsJson: effectiveNote.highlightsJson,
      ...(serverAiSnapshot ? { aiProcessed: serverAiSnapshot } : {}),
    };
  }, [effectiveNote, serverAiSnapshot]);

  const suggestionPack = useMemo(
    () =>
      deriveVoiceRecapSuggestions({
        summary: recapSummary,
        highlights: recapHighlights,
        transcript: recapTranscript,
      }),
    [recapSummary, recapHighlights, recapTranscript]
  );

  const recapSuggestionFlags = suggestionPack.flags;

  const processingActive = Boolean(processing && voicePipelineStillProcessing(processing));

  const showSmartSuggestionsBlock =
    processingActive || hasAnyRecapSuggestion(recapSuggestionFlags);

  const smartSuggestionRows = useMemo(() => {
    const order: VoiceRecapSuggestionKind[] = ["parent_draft", "action_item", "report_draft"];
    const hasPlayer = Boolean(note?.playerId);
    const copy: Record<VoiceRecapSuggestionKind, { title: string; sub: string }> = {
      parent_draft: {
        title: "Подготовить сообщение родителю",
        sub: hasPlayer
          ? "Сформировать текст по этой заметке и привязке к игроку"
          : "Сформировать текст по последним наблюдениям",
      },
      action_item: {
        title: "Зафиксировать задачу по игроку",
        sub: hasPlayer
          ? "Следующий шаг из акцента — карточка игрока уже в контексте"
          : "Следующий шаг из выделенного акцента",
      },
      report_draft: {
        title: "Собрать краткий отчёт",
        sub: hasPlayer
          ? "Свести серию наблюдений в структуру отчёта"
          : "Свести наблюдения в структурированный черновик",
      },
    };
    const { flags, primary, previews } = suggestionPack;
    const kinds = order.filter((k) => {
      if (k === "parent_draft") return flags.suggestParentDraft;
      if (k === "action_item") return flags.suggestAction;
      return flags.suggestReport;
    });
    kinds.sort((a, b) => {
      if (primary === a) return -1;
      if (primary === b) return 1;
      return order.indexOf(a) - order.indexOf(b);
    });
    return kinds.map((k) => ({
      kind: k,
      intent: k as VoiceStarterIntent,
      title: copy[k].title,
      sub: copy[k].sub,
      preview: previews[k],
      isPrimary: primary === k,
    }));
  }, [note?.playerId, suggestionPack]);

  const starterContext = useMemo(() => {
    if (!note?.playerId) return undefined;
    return { playerId: note.playerId };
  }, [note?.playerId]);

  const withServerAiIfAvailable = useCallback(
    (built: VoiceStarterPayload): VoiceStarterPayload =>
      serverAiSnapshot ? { ...built, aiProcessed: serverAiSnapshot } : built,
    [serverAiSnapshot]
  );

  const openStarterFromRecap = useCallback(
    async (intent: VoiceStarterIntent) => {
      if (!effectiveNote || openingStarter || submitting !== null || processingActive) return;
      setOpeningStarter(true);
      try {
        const summaryForStarter =
          effectiveNote.summary?.trim() || recapSummary?.trim() || null;
        const hlForStarter =
          suggestionPack.meaningfulHighlights.length > 0
            ? suggestionPack.meaningfulHighlights
            : recapHighlights;
        const built = buildVoiceStarterFromVoiceRecap({
          intent,
          transcript: effectiveNote.transcript,
          summary: summaryForStarter,
          highlights: hlForStarter,
          context: starterContext,
          originVoiceNoteId: id,
        });
        const payload = await enrichVoiceStarterWithAi(withServerAiIfAvailable(built));
        const voiceStarterId = await saveVoiceStarterPayload(payload);
        if (intent === "parent_draft") {
          router.push({
            pathname: "/coach-input",
            params: { voiceStarterId },
          } as Href);
          return;
        }
        if (intent === "report_draft") {
          router.push({
            pathname: "/voice-starter/report-draft",
            params: { voiceStarterId },
          } as Href);
          return;
        }
        if (intent === "action_item") {
          router.push({
            pathname: "/voice-starter/action-item",
            params: { voiceStarterId },
          } as Href);
        }
      } finally {
        setOpeningStarter(false);
      }
    },
    [
      effectiveNote,
      id,
      openingStarter,
      processingActive,
      recapHighlights,
      recapSummary,
      router,
      starterContext,
      submitting,
      suggestionPack,
      withServerAiIfAvailable,
    ]
  );

  const buildStarterPayloadForIntent = useCallback(
    (intent: VoiceStarterIntent) => {
      if (!effectiveNote) return null;
      const summaryForStarter = effectiveNote.summary?.trim() || recapSummary?.trim() || null;
      const hlForStarter =
        suggestionPack.meaningfulHighlights.length > 0
          ? suggestionPack.meaningfulHighlights
          : recapHighlights;
      return buildVoiceStarterFromVoiceRecap({
        intent,
        transcript: effectiveNote.transcript,
        summary: summaryForStarter,
        highlights: hlForStarter,
        context: starterContext,
        originVoiceNoteId: id,
      });
    },
    [effectiveNote, recapHighlights, recapSummary, starterContext, suggestionPack, id]
  );

  const quickCreateFromSuggestion = useCallback(
    async (kind: VoiceRecapSuggestionKind) => {
      if (
        processingActive ||
        openingStarter ||
        submitting !== null ||
        quickCreated[kind] ||
        createdByMemory[kind]
      ) {
        return;
      }
      const intent = kind as VoiceStarterIntent;
      const built = buildStarterPayloadForIntent(intent);
      if (!built) return;
      const payload = await enrichVoiceStarterWithAi(withServerAiIfAvailable(built));

      const submitKind = kind === "report_draft" ? "report" : kind === "action_item" ? "action" : "parent";
      setSubmitting(submitKind);
      try {
        if (kind === "report_draft") {
          const res = await createReport(voiceStarterToCreateReportInput(payload));
          if (!res.ok) {
            Alert.alert("Не удалось создать отчёт", res.error);
            return;
          }
          if (id) await markVoiceCreationForNote(id, "report_draft");
          setCreatedByMemory((prev) => ({ ...prev, report_draft: true }));
          setQuickCreated((prev) => ({ ...prev, report_draft: "Отчёт добавлен" }));
          return;
        }
        if (kind === "action_item") {
          const res = await createActionItem(voiceStarterToCreateActionInput(payload));
          if (!res.ok) {
            Alert.alert("Не удалось создать задачу", res.error);
            return;
          }
          if (id) await markVoiceCreationForNote(id, "action_item");
          setCreatedByMemory((prev) => ({ ...prev, action_item: true }));
          setQuickCreated((prev) => ({ ...prev, action_item: "Задача создана" }));
          return;
        }
        const res = await createParentDraft(voiceStarterToCreateParentDraftInput(payload));
        if (!res.ok) {
          Alert.alert("Не удалось создать черновик", res.error);
          return;
        }
        if (id) await markVoiceCreationForNote(id, "parent_draft");
        setCreatedByMemory((prev) => ({ ...prev, parent_draft: true }));
        setQuickCreated((prev) => ({ ...prev, parent_draft: "Черновик добавлен" }));
      } finally {
        setSubmitting(null);
      }
    },
    [
      buildStarterPayloadForIntent,
      openingStarter,
      processingActive,
      quickCreated,
      submitting,
      createdByMemory,
      id,
      withServerAiIfAvailable,
    ]
  );

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.title}>Заметка не найдена</Text>
          <PrimaryButton title="Назад" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.sub}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !note) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.title}>Не удалось загрузить</Text>
          <Text style={styles.sub}>{error ?? "—"}</Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={fetchOne} />
          <PrimaryButton title="Назад" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const suggestions = Array.isArray(note.suggestionsJson) ? note.suggestionsJson : [];
  const submitLocked = submitting !== null;

  const askAfterSuccess = useCallback(
    (title: string, message: string, listRoute: "/created-reports" | "/created-actions" | "/parent-drafts") => {
      Alert.alert(title, message, [
        { text: "Остаться", style: "cancel" },
        { text: "Открыть список", onPress: () => router.push(listRoute) },
      ]);
    },
    [router]
  );

  const onCreateReport = useCallback(async () => {
    if (!actionsCreateSource || submitLocked) return;
    setSubmitting("report");
    try {
      const res = await createReport(voiceNoteToReportInput(actionsCreateSource));
      if (!res.ok) {
        Alert.alert("Не удалось создать отчёт", res.error);
        return;
      }
      askAfterSuccess("Отчёт создан", "Отчёт сохранён на сервере.", "/created-reports");
      if (id) {
        await markVoiceCreationForNote(id, "report_draft");
        setCreatedByMemory((prev) => ({ ...prev, report_draft: true }));
      }
    } finally {
      setSubmitting(null);
    }
  }, [askAfterSuccess, actionsCreateSource, submitLocked, id]);

  const onCreateAction = useCallback(async () => {
    if (!actionsCreateSource || submitLocked) return;
    setSubmitting("action");
    try {
      const res = await createActionItem(voiceNoteToActionInput(actionsCreateSource));
      if (!res.ok) {
        Alert.alert("Не удалось создать задачу", res.error);
        return;
      }
      askAfterSuccess("Задача создана", "Задача сохранена на сервере.", "/created-actions");
      if (id) {
        await markVoiceCreationForNote(id, "action_item");
        setCreatedByMemory((prev) => ({ ...prev, action_item: true }));
      }
    } finally {
      setSubmitting(null);
    }
  }, [askAfterSuccess, actionsCreateSource, submitLocked, id]);

  const onCreateParentDraft = useCallback(async () => {
    if (!actionsCreateSource || submitLocked) return;
    setSubmitting("parent");
    try {
      const res = await createParentDraft(voiceNoteToParentDraftInput(actionsCreateSource));
      if (!res.ok) {
        Alert.alert("Не удалось создать черновик", res.error);
        return;
      }
      askAfterSuccess(
        "Черновик создан",
        "Черновик родителю сохранён на сервере.",
        "/parent-drafts"
      );
      if (id) {
        await markVoiceCreationForNote(id, "parent_draft");
        setCreatedByMemory((prev) => ({ ...prev, parent_draft: true }));
      }
    } finally {
      setSubmitting(null);
    }
  }, [askAfterSuccess, actionsCreateSource, submitLocked, id]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <Text style={styles.eyebrow}>Голосовая заметка</Text>
          <Text style={styles.title}>Просмотр</Text>
          <Text style={styles.meta}>{formatVoiceDateTimeFullRu(note.createdAt)}</Text>
          <Text style={styles.readonly}>
            Только чтение · Ниже два варианта: открыть черновик с текстом (можно править) или
            отправить запись на сервер одной кнопкой, без редактора.
          </Text>
        </StaggerFadeIn>

        {processing && (voicePipelineStillProcessing(processing) || processing.upload.status === "failed") ? (
          <StaggerFadeIn preset="snappy" delay={10}>
            <VoiceProcessingProgressCard
              processing={processing}
              subtitle={voicePipelineStatusHintRu(processing)}
            />
          </StaggerFadeIn>
        ) : null}
        {processing ? (
          <SectionCard elevated style={styles.cardMuted}>
            <Text style={styles.bodyMuted}>{voicePipelineStatusHintRu(processing)}</Text>
            {voicePipelineHasPartialResult(processing) ? (
              <Text style={styles.warn}>
                Расшифровка доступна. Подсказки и черновики работают в упрощённом режиме.
              </Text>
            ) : null}
            {pollingNetworkIssue ? (
              <Text style={styles.bodyMuted}>
                Связь нестабильна. Можно открыть заметку позже или проверить статус вручную.
              </Text>
            ) : null}
            {pollingTimedOut ? (
              <Text style={styles.bodyMuted}>
                Обработка занимает больше обычного. Можно вернуться позже — данные подтянутся.
              </Text>
            ) : null}
            {(pollingTimedOut || pollingNetworkIssue || voicePipelineStillProcessing(processing)) ? (
              <PrimaryButton
                title="Проверить ещё раз"
                variant="ghost"
                onPress={() => void handleRefreshProcessing()}
              />
            ) : null}
          </SectionCard>
        ) : null}

        <StaggerFadeIn preset="snappy" delay={20}>
          <SectionCard elevated style={styles.card}>
            <Text style={styles.kicker}>Кратко</Text>
            <Text style={styles.body}>{recapSummary || "—"}</Text>
          </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={30}>
          <SectionCard elevated style={styles.card}>
            <Text style={styles.kicker}>Расшифровка</Text>
            <Text style={styles.body}>{recapTranscript.trim() ? recapTranscript : "—"}</Text>
          </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={40}>
          <SectionCard elevated style={styles.card}>
            <Text style={styles.kicker}>Акценты</Text>
            {recapHighlights.length === 0 ? (
              <Text style={styles.bodyMuted}>—</Text>
            ) : (
              recapHighlights.map((h, i) => (
                <Text key={`${h}-${i}`} style={styles.bullet}>
                  • {h}
                </Text>
              ))
            )}
          </SectionCard>
        </StaggerFadeIn>

        {serverAiSnapshot ? (
          <StaggerFadeIn preset="snappy" delay={42}>
            <SectionCard elevated style={styles.card}>
              <Text style={styles.kicker}>AI-разбор (сохранён)</Text>
              <Text style={styles.aiLinkHint}>
                Используется при формировании текста в шагах ниже, если разбор есть.
              </Text>
              <Text style={styles.body}>
                {serverAiSnapshot.summary.trim() ? serverAiSnapshot.summary.trim() : "—"}
              </Text>
              {serverAiSnapshot.strengths.length > 0 ? (
                <>
                  <Text style={[styles.kicker, styles.aiBlockSecondKicker]}>Сильные стороны</Text>
                  {serverAiSnapshot.strengths.slice(0, 8).map((s, i) => (
                    <Text key={`ai-str-${i}`} style={styles.bullet}>
                      • {s}
                    </Text>
                  ))}
                </>
              ) : null}
            </SectionCard>
          </StaggerFadeIn>
        ) : null}

        {showSmartSuggestionsBlock ? (
          <StaggerFadeIn preset="snappy" delay={45}>
            <SectionCard elevated style={styles.suggestionsCard}>
              <Text style={styles.kicker}>Следующий шаг</Text>
              <Text style={styles.suggestionsRoleLabel}>Черновик и редактор</Text>
              <Text style={styles.suggestionsLead}>
                Нажмите карточку — откроется экран с подставленным текстом, его можно изменить
                перед сохранением. Кнопка под карточкой отправляет запись на сервер сразу, без этого
                экрана.
              </Text>
              <Text style={styles.confidenceHint}>{suggestionPack.confidenceHint}</Text>
              {processingActive ? (
                <View style={styles.suggestionsProc}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.bodyMuted}>
                    Готовим рекомендации по резюме и акцентам…
                  </Text>
                </View>
              ) : null}
              {smartSuggestionRows.map((row) => {
                const disabled = processingActive || openingStarter || submitting !== null;
                const createdFromMemory = Boolean(createdByMemory[row.kind]);
                const createdLabel = quickCreated[row.kind] ?? (createdFromMemory ? "Уже подготовлено" : undefined);
                return (
                  <PressableFeedback
                    key={row.kind}
                    style={[
                      styles.suggestionRow,
                      row.isPrimary ? styles.suggestionRowPrimary : styles.suggestionRowSecondary,
                      createdFromMemory ? styles.suggestionRowCreated : null,
                    ]}
                    disabled={disabled}
                    onPress={() => void openStarterFromRecap(row.intent)}
                  >
                    <View style={styles.suggestionTitleRow}>
                      <Text
                        style={row.isPrimary ? styles.suggestionTitlePrimary : styles.suggestionTitle}
                        numberOfLines={2}
                      >
                        {row.title}
                      </Text>
                      {row.isPrimary ? (
                        <Text style={styles.suggestionPrimaryBadge}>Рекомендуем</Text>
                      ) : createdFromMemory ? (
                        <Text style={styles.suggestionPrimaryBadge}>Уже подготовлено</Text>
                      ) : null}
                    </View>
                    <Text style={styles.suggestionSub} numberOfLines={2}>
                      {row.sub}
                    </Text>
                    {createdFromMemory ? (
                      <Text style={styles.suggestionMemoryHint}>
                        По этой заметке уже создан похожий результат. Можно открыть черновик или подготовить новый вариант.
                      </Text>
                    ) : null}
                    {row.preview && !processingActive ? (
                      <Text style={styles.suggestionPreview} numberOfLines={1}>
                        {row.preview}
                      </Text>
                    ) : null}
                    <View style={styles.suggestionActions}>
                      <PrimaryButton
                        title={
                          createdLabel
                            ? "Уже создано"
                            : row.kind === "report_draft"
                              ? "Создать сразу"
                              : row.kind === "action_item"
                                ? "Быстро добавить"
                                : "Создать сразу"
                        }
                        variant="ghost"
                        onPress={() => void quickCreateFromSuggestion(row.kind)}
                        disabled={disabled || Boolean(createdLabel)}
                        style={styles.suggestionQuickBtn}
                        textStyle={styles.suggestionQuickBtnText}
                      />
                    </View>
                    {createdLabel ? (
                      <Text style={styles.suggestionSuccessInline}>{createdLabel}</Text>
                    ) : null}
                  </PressableFeedback>
                );
              })}
              {!processingActive && openingStarter ? (
                <Text style={styles.bodyMuted}>Открываем черновик…</Text>
              ) : null}
            </SectionCard>
          </StaggerFadeIn>
        ) : null}

        {Array.isArray(suggestions) && suggestions.length > 0 ? (
          <SectionCard elevated style={styles.cardMuted}>
            <Text style={styles.kicker}>Идеи при записи</Text>
            <Text style={styles.bodyMuted}>
              {suggestions
                .slice(0, 4)
                .map((s) =>
                  s && typeof s === "object" && "label" in s
                    ? String((s as { label?: unknown }).label ?? "")
                    : ""
                )
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          </SectionCard>
        ) : null}

        <SectionCard elevated style={styles.actionsSectionCard}>
          <Text style={styles.kicker}>Сразу на сервер</Text>
          <Text style={styles.actionsRoleLabel}>Без экрана правки</Text>
          <Text style={styles.bodyMuted}>
            Те же типы записей, что и в блоке выше, но сразу в списки отчётов, задач или черновиков
            родителю. Текст собирается по заметке и, при наличии, по сохранённому AI-разбору.
          </Text>
          {!note.playerId ? (
            <Text style={styles.warn}>
              Без привязки к игроку: создание всё равно доступно, но запись будет общей.
            </Text>
          ) : null}
          <PrimaryButton
            title={submitting === "report" ? "Создание отчёта…" : "Создать отчёт"}
            variant="outline"
            onPress={onCreateReport}
            disabled={submitLocked}
            style={styles.actionBtn}
          />
          <PrimaryButton
            title={submitting === "action" ? "Создание задачи…" : "Создать задачу"}
            variant="outline"
            onPress={onCreateAction}
            disabled={submitLocked}
            style={styles.actionBtn}
          />
          <PrimaryButton
            title={
              submitting === "parent"
                ? "Создание черновика…"
                : "Создать черновик родителю"
            }
            variant="outline"
            onPress={onCreateParentDraft}
            disabled={submitLocked}
            style={styles.actionBtn}
          />
        </SectionCard>

        <SectionCard elevated style={styles.cardMuted}>
          <Text style={styles.kicker}>Метаданные</Text>
          <Text style={styles.bodyMuted}>Upload ID: {note.uploadId ?? "—"}</Text>
          <Text style={styles.bodyMuted}>Файл: {note.audioFileName ?? "—"}</Text>
          <Text style={styles.bodyMuted}>MIME: {note.audioMimeType ?? "—"}</Text>
        </SectionCard>

        <PrimaryButton title="Назад" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.xxl },
  center: {
    flex: 1,
    paddingVertical: theme.spacing.xxl,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  title: { ...theme.typography.title, color: theme.colors.text, marginBottom: theme.spacing.sm },
  sub: { ...theme.typography.caption, color: theme.colors.textMuted, lineHeight: 18, textAlign: "center" },
  meta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg },
  readonly: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  card: { marginBottom: theme.spacing.lg, borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  cardMuted: { marginBottom: theme.spacing.lg, borderLeftWidth: 4, borderLeftColor: theme.colors.border },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.sm,
  },
  body: { ...theme.typography.body, color: theme.colors.text, lineHeight: 24 },
  bodyMuted: { ...theme.typography.caption, color: theme.colors.textMuted, lineHeight: 18 },
  bullet: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, marginTop: theme.spacing.xs },
  aiBlockSecondKicker: { marginTop: theme.spacing.md },
  aiLinkHint: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  suggestionsRoleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.15,
  },
  actionsSectionCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  actionsRoleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.15,
  },
  warn: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  actionBtn: { marginTop: theme.spacing.sm },
  suggestionsCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  confidenceHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  suggestionsLead: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  suggestionsProc: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  suggestionRow: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  suggestionRowPrimary: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  suggestionRowSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  suggestionRowCreated: {
    opacity: 0.82,
  },
  suggestionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  suggestionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  suggestionTitlePrimary: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  suggestionPrimaryBadge: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.colors.primary,
    marginTop: 2,
  },
  suggestionSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  suggestionMemoryHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  suggestionPreview: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    fontStyle: "italic",
    lineHeight: 16,
  },
  suggestionActions: {
    marginTop: theme.spacing.sm,
    alignItems: "flex-start",
  },
  suggestionQuickBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  suggestionQuickBtnText: {
    fontSize: 12,
  },
  suggestionSuccessInline: {
    ...theme.typography.caption,
    color: theme.colors.success,
    marginTop: theme.spacing.xs,
    fontWeight: "600",
  },
});

