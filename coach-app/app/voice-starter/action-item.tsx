import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import {
  buildVoiceStarterDestinationContext,
  consumeVoiceStarterPayload,
  formatVoiceStarterForActionItem,
  getVoiceCreationMemoryForNote,
  markVoiceCreationForNote,
  type VoiceStarterPayload,
} from "@/lib/voiceMvp";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  createActionItem,
  voiceStarterToCreateActionInputFromEditedText,
} from "@/services/voiceCreateService";
import { VoiceStarterServerSuccessPanel } from "@/components/voice/VoiceStarterServerSuccessPanel";
import {
  VOICE_AI_PILL_LABEL,
  VOICE_STARTER_UNAVAILABLE_BODY,
  VOICE_STARTER_UNAVAILABLE_TITLE,
} from "@/lib/voiceMvp/voiceStarterCompletionCopy";

export default function VoiceStarterActionItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ voiceStarterId?: string }>();
  const [payload, setPayload] = useState<VoiceStarterPayload | null>(null);
  const [composerText, setComposerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverSuccess, setServerSuccess] = useState<{ hadAiBreakdown: boolean } | null>(null);
  const [duplicateHint, setDuplicateHint] = useState(false);
  const submitLockRef = useRef(false);

  const load = useCallback(() => {
    const id = params.voiceStarterId?.trim();
    if (!id) return;
    consumeVoiceStarterPayload(id).then((p) => {
      setPayload(p);
      if (!p) {
        Alert.alert(VOICE_STARTER_UNAVAILABLE_TITLE, VOICE_STARTER_UNAVAILABLE_BODY);
      }
    });
  }, [params.voiceStarterId]);

  useEffect(() => load(), [load]);

  const actionText = payload ? formatVoiceStarterForActionItem(payload) : "";
  const destinationContext = payload ? buildVoiceStarterDestinationContext(payload) : null;

  useEffect(() => {
    setComposerText(actionText);
  }, [actionText]);

  useEffect(() => {
    const voiceNoteId = payload?.originVoiceNoteId?.trim();
    if (!voiceNoteId) {
      setDuplicateHint(false);
      return;
    }
    let cancelled = false;
    getVoiceCreationMemoryForNote(voiceNoteId).then((memory) => {
      if (cancelled) return;
      setDuplicateHint(Boolean(memory.action_item));
    });
    return () => {
      cancelled = true;
    };
  }, [payload?.originVoiceNoteId]);

  const handleCreateOnServer = useCallback(async () => {
    if (!payload || submitting || submitLockRef.current || serverSuccess) return;
    const submittedText = composerText.trim();
    if (!submittedText) {
      Alert.alert("Добавьте текст", "Перед сохранением заполните формулировку следующего шага.");
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const input = voiceStarterToCreateActionInputFromEditedText(payload, composerText);
      const res = await createActionItem(input);
      if (!res.ok) {
        Alert.alert("Не удалось создать задачу", res.error);
        return;
      }
      const voiceNoteId = payload.originVoiceNoteId?.trim();
      if (voiceNoteId) await markVoiceCreationForNote(voiceNoteId, "action_item");
      setServerSuccess({ hadAiBreakdown: Boolean(payload.aiProcessed) });
      setPayload(null);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }, [payload, submitting, composerText, serverSuccess]);

  if (serverSuccess) {
    return (
      <ScreenContainer>
        <VoiceStarterServerSuccessPanel
          router={router}
          variant="action"
          hadAiBreakdown={serverSuccess.hadAiBreakdown}
        />
      </ScreenContainer>
    );
  }

  if (!payload) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.warning} />
          <Text style={styles.loadingEyebrow}>Заметка → задача</Text>
          <Text style={styles.title}>Собираем заготовку задачи</Text>
          <Text style={styles.sub}>Формируем формулировку из голосовой заметки…</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StaggerFadeIn preset="snappy" revealKey={payload.id} delay={0}>
          <SectionCard elevated style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Готово к проверке</Text>
            <Text style={styles.title}>Заготовка задачи подготовлена</Text>
            <Text style={styles.sub}>
              Заметка превращена в формулировку задачи. Проверьте формулировку и при необходимости уточните детали —
              после сохранения задача появится в списке.
            </Text>
            {payload.aiProcessed ? (
              <View style={styles.aiStatusPill}>
                <Text style={styles.aiStatusPillText}>{VOICE_AI_PILL_LABEL}</Text>
              </View>
            ) : null}
            {duplicateHint ? (
              <Text style={styles.duplicateHint}>
                По этой заметке уже создавали задачу. Можно скорректировать текст и сохранить новый вариант.
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard elevated style={styles.contextCard}>
            <Text style={styles.kicker}>Кратко по заметке</Text>
            <View style={styles.hintPill}>
              <Text style={styles.hintPillText}>{destinationContext?.sourceHint ?? "На основе заметки"}</Text>
            </View>
            <Text style={styles.summaryText}>{destinationContext?.summary ?? "Краткий контекст пока недоступен."}</Text>
            {destinationContext?.highlights.length ? (
              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>Подсказки из заметки</Text>
                {destinationContext.highlights.map((line) => (
                  <Text key={line} style={styles.listItem}>
                    • {line}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Структурные подсказки не найдены. Сфокусируйтесь на следующем шаге вручную.</Text>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaChip}>
                Игрок: {destinationContext?.playerLabel ?? "не указан"}
              </Text>
              <Text style={styles.metaChip}>
                Тренировка: {destinationContext?.sessionLabel ?? "без уточнения"}
              </Text>
            </View>
          </SectionCard>

          <SectionCard elevated style={styles.editorCard}>
            <Text style={styles.kicker}>Текст задачи</Text>
            <Text style={styles.editorHint}>
              Это почти готовая задача — уточните формулировку и сохраните, чтобы она появилась в списке.
            </Text>
            <TextInput
              style={styles.editorInput}
              value={composerText}
              onChangeText={setComposerText}
              multiline
              editable={!submitting}
              textAlignVertical="top"
              placeholder="Формулировка задачи…"
              placeholderTextColor={theme.colors.textMuted}
            />
          </SectionCard>

          <SectionCard elevated style={styles.actionsCard}>
            <Text style={styles.nextStepHint}>
              Следующий шаг: проверьте текст и сохраните — задача будет создана на сервере.
            </Text>
            <PrimaryButton
              title={
                submitting
                  ? "Создание…"
                  : duplicateHint
                    ? "Сохранить новый вариант задачи"
                    : "Сохранить задачу на сервере"
              }
              onPress={handleCreateOnServer}
              disabled={submitting || !composerText.trim() || Boolean(serverSuccess)}
              style={styles.btn}
            />
            {submitting ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={theme.colors.warning} />
              </View>
            ) : null}
            <PrimaryButton
              title="Скопировать черновик"
              variant="outline"
              onPress={async () => {
                await Clipboard.setStringAsync(composerText.trim() || actionText);
                Alert.alert("Скопировано", "Черновик в буфере обмена.");
              }}
              disabled={submitting}
              style={styles.btn}
            />
            <PrimaryButton
              title="К списку задач"
              variant="outline"
              onPress={() => router.push("/actions")}
              disabled={submitting}
              style={styles.btn}
            />
            <PrimaryButton
              title="Назад"
              variant="ghost"
              onPress={() => router.back()}
              disabled={submitting}
            />
          </SectionCard>
        </StaggerFadeIn>
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
  title: { ...theme.typography.title, color: theme.colors.text, marginBottom: theme.spacing.sm },
  sub: { ...theme.typography.caption, color: theme.colors.textMuted, lineHeight: 18 },
  heroEyebrow: {
    ...theme.typography.heroEyebrow,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },
  loadingEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.xs,
  },
  aiStatusPill: {
    alignSelf: "flex-start",
    marginTop: theme.spacing.sm,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    borderRadius: theme.borderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  aiStatusPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  nextStepHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  heroCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    backgroundColor: theme.colors.surfaceElevated,
  },
  contextCard: { marginBottom: theme.spacing.md },
  editorCard: { marginBottom: theme.spacing.md },
  actionsCard: { marginBottom: theme.spacing.md },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.sm,
  },
  hintPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 166, 35, 0.2)",
    borderRadius: theme.borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  hintPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  summaryText: { ...theme.typography.body, color: theme.colors.text, lineHeight: 21 },
  listWrap: { marginTop: theme.spacing.sm, gap: 6 },
  listTitle: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: 2 },
  listItem: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18 },
  emptyText: { ...theme.typography.caption, color: theme.colors.textMuted, lineHeight: 18, marginTop: theme.spacing.sm },
  metaRow: { marginTop: theme.spacing.md, gap: theme.spacing.xs },
  metaChip: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    overflow: "hidden",
  },
  editorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  editorInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    padding: theme.spacing.md,
    ...theme.typography.body,
    lineHeight: 22,
  },
  btn: { marginBottom: theme.spacing.sm },
  inlineLoading: { alignItems: "center", marginBottom: theme.spacing.sm },
  duplicateHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    lineHeight: 17,
  },
});
