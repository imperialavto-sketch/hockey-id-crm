import React, { useState, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { getParamId } from "@/lib/params";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { SectionCard } from "@/components/ui/SectionCard";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  CoachDetailEmptyState,
  CoachDetailErrorState,
  CoachDetailHero,
  CoachDetailLoadingBody,
} from "@/components/details/CoachDetailScreenPrimitives";
import {
  getCoachShareReport,
  type CoachShareReportResult,
} from "@/services/coachParentDraftsService";
import { getCoachMessages } from "@/services/coachMessagesService";
import { setConversationDraftPrefill } from "@/lib/conversationDraftPrefill";
import { theme } from "@/constants/theme";

function formatShareUpdatedAt(iso?: string): string | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryMetricChip({ label }: { label: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export default function ShareReportScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Extract<CoachShareReportResult, { kind: "ready" }> | null>(
    null
  );
  const [loadError, setLoadError] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [forwarded, setForwarded] = useState(false);

  const fetchMessage = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setReport(null);
    setLoadError(false);
    setNotReady(false);
    getCoachShareReport(id)
      .then((out) => {
        if (out.kind === "ready") {
          setReport(out);
          return;
        }
        if (out.kind === "failed") {
          setLoadError(true);
          return;
        }
        setNotReady(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(useCallback(() => fetchMessage(), [fetchMessage]));

  const handleCopy = async () => {
    if (!report?.message) return;
    try {
      await Clipboard.setStringAsync(report.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert("Не получилось скопировать", "Попробуйте ещё раз чуть позже.");
    }
  };

  const handleForwardToParent = async () => {
    if (!report?.message || !id) return;
    try {
      setForwarded(true);
      const conversations = await getCoachMessages();
      const targetConversation = conversations.find(
        (conv) => conv.type === "parent" && conv.playerId === id
      );

      if (targetConversation?.id) {
        setConversationDraftPrefill({
          conversationId: targetConversation.id,
          text: report.message,
        });
        router.push(`/conversation/${targetConversation.id}`);
        return;
      }

      await Clipboard.setStringAsync(report.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      router.push("/(tabs)/messages");
    } catch {
      try {
        await Clipboard.setStringAsync(report.message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        router.push("/(tabs)/messages");
      } catch {
        Alert.alert("Не получилось подготовить отправку", "Скопируйте текст вручную и откройте «Сообщения».");
      }
    }
  };

  const forwardTitle = forwarded ? "Чат открыт" : "Открыть чат с родителем";

  if (!id) {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <CoachDetailErrorState
          title="Игрок не найден"
          description="Проверьте ссылку или откройте карточку игрока ещё раз."
          retryTitle="Назад"
          onRetry={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <CoachDetailLoadingBody
          eyebrow="Родителям"
          title="Перед отправкой"
          subtitle="Загружаем черновик для проверки и отправки в чат родителя."
        />
      </ScreenContainer>
    );
  }

  if (loadError) {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <CoachDetailErrorState
          title="Сейчас не удалось загрузить текст"
          description="Черновик на сервере может быть на месте. Проверьте сеть и попробуйте снова."
          retryTitle="Попробовать снова"
          onRetry={fetchMessage}
          backTitle="Назад"
          onBack={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (notReady || !report) {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachDetailEmptyState
            title="Черновика для отправки пока нет"
            description="Родителям уходит текст из этого экрана после проверки. Обычно он появляется, когда есть данные по игроку. Все сохранённые черновики — в «Черновики ответов»."
            primaryTitle="Обновить"
            onPrimary={fetchMessage}
            secondaryTitle="К черновикам"
            onSecondary={() => router.push("/parent-drafts")}
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={18}>
          <PrimaryButton
            title="К карточке игрока"
            variant="ghost"
            onPress={() => router.push(`/player/${id}`)}
            style={styles.ghostAfterEmpty}
          />
        </StaggerFadeIn>
      </ScreenContainer>
    );
  }

  const { playerName, message, shortSummary, keyPoints, recommendations, updatedAt } = report;
  const charCount = message.length;
  const updatedLabel = formatShareUpdatedAt(updatedAt);
  const keyCount = keyPoints?.length ?? 0;
  const recCount = recommendations?.length ?? 0;

  const metricChips: string[] = [`${charCount.toLocaleString("ru-RU")} симв.`];
  if (keyCount > 0) metricChips.push(`Ключевых пунктов: ${keyCount}`);
  if (recCount > 0) metricChips.push(`Рекомендаций: ${recCount}`);

  const ctaHint = forwarded
    ? "Если чат не открылся, текст уже в буфере — вставьте его в поле ввода вручную."
    : "Основное действие откроет чат: черновик подставится в поле ввода; отправка остаётся за вами.";

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachDetailHero
            eyebrow="Родителям"
            title="Перед отправкой"
            subtitle={`Родитель игрока · ${playerName}`}
            metaLeft="Финальный шаг"
            metaRight="Проверьте текст ниже"
          />
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={12}>
          <SectionCard elevated style={styles.summaryCard}>
            <Text style={styles.summaryKicker}>Кратко</Text>
            <Text style={styles.summaryPlayerName} numberOfLines={3}>
              {playerName}
            </Text>
            <View style={styles.metricRow}>
              {metricChips.map((c) => (
                <SummaryMetricChip key={c} label={c} />
              ))}
            </View>
            {updatedLabel ? (
              <Text style={styles.summaryMetaLine} numberOfLines={2}>
                Обновлено: {updatedLabel}
              </Text>
            ) : null}
            {shortSummary ? (
              <Text style={styles.summarySummary} numberOfLines={4}>
                {shortSummary}
              </Text>
            ) : null}
          </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={22}>
          <SectionCard elevated style={styles.previewCard}>
            <Text style={styles.previewKicker}>Текст для родителя</Text>
            <Text style={styles.messageText} selectable>
              {message}
            </Text>
          </SectionCard>
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={32}>
          <PrimaryButton
            animatedPress
            title={forwardTitle}
            onPress={handleForwardToParent}
            style={styles.sendBtn}
          />
          <PrimaryButton
            animatedPress
            title={copied ? "Скопировано" : "Скопировать текст"}
            onPress={handleCopy}
            disabled={copied}
            variant="outline"
            style={styles.copyBtn}
          />
          <Text style={styles.ctaHint}>{ctaHint}</Text>
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={42}>
          <View style={styles.linkRow}>
            <PressableFeedback onPress={() => router.push(`/player/${id}`)} style={styles.linkHit}>
              <Text style={styles.linkText} numberOfLines={1}>
                Карточка игрока
              </Text>
            </PressableFeedback>
            <Text style={styles.linkSep}>·</Text>
            <PressableFeedback onPress={() => router.push(`/player/${id}/report`)} style={styles.linkHit}>
              <Text style={styles.linkText} numberOfLines={1}>
                Отчёт
              </Text>
            </PressableFeedback>
            <Text style={styles.linkSep}>·</Text>
            <PressableFeedback onPress={() => router.push("/parent-drafts")} style={styles.linkHit}>
              <Text style={styles.linkText} numberOfLines={1}>
                Черновики
              </Text>
            </PressableFeedback>
          </View>
          <Text style={styles.nextStepHint} numberOfLines={3}>
            После отправки можно вернуться к черновикам или отчёту по игроку.
          </Text>
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={52}>
          <PrimaryButton title="Готово" variant="ghost" onPress={() => router.back()} style={styles.doneBtn} />
        </StaggerFadeIn>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  screenPad: {
    paddingBottom: theme.spacing.xxl,
  },
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.xs,
  },
  summaryPlayerName: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  metricChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxWidth: "100%",
  },
  metricChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  summaryMetaLine: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  summarySummary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  previewCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  previewKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: theme.spacing.sm,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  sendBtn: {
    marginBottom: theme.spacing.sm,
  },
  copyBtn: {
    marginBottom: theme.spacing.sm,
  },
  ctaHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  linkHit: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    minHeight: 36,
    justifyContent: "center",
    maxWidth: "100%",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.accent,
  },
  linkSep: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  nextStepHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  doneBtn: {},
  ghostAfterEmpty: {
    alignSelf: "center",
    marginTop: theme.spacing.sm,
  },
});
