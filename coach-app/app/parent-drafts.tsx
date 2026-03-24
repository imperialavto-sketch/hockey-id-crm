import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  getParentDrafts,
  type ParentDraftItem,
} from "@/lib/parentDraftHelpers";
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from "@/lib/endpointAvailability";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";

function formatContextDate() {
  const d = new Date();
  return d.toLocaleDateString("ru-RU", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function pluralDraft(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "черновик";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "черновика";
  return "черновиков";
}

function DraftRow({
  item,
  onOpen,
  onCopy,
  copiedId,
  isFirst,
}: {
  item: ParentDraftItem;
  onOpen: () => void;
  onCopy: () => void;
  copiedId: string | null;
  isFirst: boolean;
}) {
  const isCopied = copiedId === item.playerId;
  return (
    <View style={[styles.row, !isFirst && styles.rowBorder]}>
      <Pressable
        style={({ pressed }) => [styles.rowContent, pressed && styles.pressed]}
        onPress={onOpen}
      >
        <Text style={styles.rowName}>{item.playerName}</Text>
        <Text style={styles.rowPreview} numberOfLines={2}>
          {item.preview}
        </Text>
      </Pressable>
      <View style={styles.rowActions}>
        <PrimaryButton
          title="Открыть"
          variant="ghost"
          onPress={onOpen}
          style={styles.rowBtn}
          textStyle={styles.rowBtnText}
        />
        <PrimaryButton
          title={isCopied ? "Скопировано" : "Скопировать"}
          variant="ghost"
          onPress={onCopy}
          disabled={isCopied}
          style={styles.rowBtn}
          textStyle={styles.rowBtnText}
        />
      </View>
    </View>
  );
}

export default function ParentDraftsScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ParentDraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      getParentDrafts()
        .then((data) => {
          setDrafts(data);
          setError(null);
        })
        .catch((err) => {
          setDrafts([]);
          setError(isAuthRequiredError(err) ? "Требуется авторизация" : "Не удалось загрузить черновики");
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const handleCopy = async (item: ParentDraftItem) => {
    try {
      await Clipboard.setStringAsync(item.message);
      setCopiedId(item.playerId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      Alert.alert("Ошибка", "Не удалось скопировать");
    }
  };

  const dateLabel = formatContextDate();
  const countLabel =
    drafts.length > 0
      ? `${drafts.length} ${pluralDraft(drafts.length)}`
      : "Нет готовых черновиков";

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn delay={0}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Черновики родителям</Text>
            <Text style={styles.title}>Готовые сообщения</Text>
            <Text style={styles.context}>{dateLabel}</Text>
          </View>
        </StaggerFadeIn>
        <StaggerFadeIn delay={20}>
          <SectionCard elevated style={styles.errorCard}>
            <Text style={styles.errorTitle}>{error}</Text>
            <Text style={styles.errorText}>
              Проверьте соединение и попробуйте снова
            </Text>
            <PrimaryButton
              title="Повторить"
              variant="outline"
              onPress={() => {
                setLoading(true);
                setError(null);
                getParentDrafts()
                  .then((data) => {
                    setDrafts(data);
                    setError(null);
                  })
                  .catch((err) => setError(isAuthRequiredError(err) ? "Требуется авторизация" : "Не удалось загрузить черновики"))
                  .finally(() => setLoading(false));
              }}
              style={styles.retryBtn}
            />
          </SectionCard>
        </StaggerFadeIn>
        <View style={styles.bottomSpacer} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn delay={0}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Черновики родителям</Text>
          <Text style={styles.title}>Готовые сообщения</Text>
          <View style={styles.heroContext}>
            <Text style={styles.context}>{dateLabel}</Text>
            <View style={styles.dot} />
            <Text style={styles.context}>{countLabel}</Text>
          </View>
        </View>
      </StaggerFadeIn>

      <StaggerFadeIn delay={15}>
        <View style={styles.section}>
          {drafts.length === 0 ? (
            <SectionCard elevated style={styles.draftCard}>
              <Text style={styles.emptyTitle}>
                {isEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS)
                  ? 'Модуль черновиков пока не подключён'
                  : 'Пока нет готовых черновиков'}
              </Text>
              <Text style={styles.emptyText}>
                {isEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS)
                  ? 'Когда сервер будет готов, здесь появятся черновики'
                  : 'Запишите тренировку'}
              </Text>
              {isEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS) ? (
                <PrimaryButton
                  title="Проверить снова"
                  variant="outline"
                  onPress={() => {
                    clearEndpointUnavailable(COACH_ENDPOINTS.PARENT_DRAFTS);
                    setLoading(true);
                    setError(null);
                    getParentDrafts()
                      .then((data) => setDrafts(data))
                      .catch((err) => setError(isAuthRequiredError(err) ? "Требуется авторизация" : "Не удалось загрузить черновики"))
                      .finally(() => setLoading(false));
                  }}
                  style={styles.emptyCta}
                />
              ) : (
                <PrimaryButton
                  title="Записать тренировку"
                  variant="outline"
                  onPress={() => router.push("/dev/coach-input")}
                  style={styles.emptyCta}
                />
              )}
            </SectionCard>
          ) : (
            <SectionCard elevated style={styles.draftCard}>
              {drafts.map((item, i) => (
                <DraftRow
                  key={item.playerId}
                  item={item}
                  isFirst={i === 0}
                  onOpen={() =>
                    router.push(`/player/${item.playerId}/share-report`)
                  }
                  onCopy={() => handleCopy(item)}
                  copiedId={copiedId}
                />
              ))}
            </SectionCard>
          )}
        </View>
      </StaggerFadeIn>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  loading: {
    flexGrow: 1,
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  hero: {
    marginBottom: theme.spacing.xl,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: theme.colors.text,
    lineHeight: 34,
    marginBottom: theme.spacing.sm,
  },
  heroContext: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  context: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
  },
  draftCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  errorTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  retryBtn: {
    alignSelf: "flex-start",
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  emptyCta: {
    alignSelf: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  rowName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowPreview: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  rowActions: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  rowBtn: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  rowBtnText: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.8,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});
