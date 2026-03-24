import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  getCoachActionItems,
  type CoachActionItem,
} from "@/lib/coachActionHelpers";
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

function pluralPlayer(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "игрок";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "игрока";
  return "игроков";
}

function ActionRow({
  item,
  onOpen,
  isFirst,
}: {
  item: CoachActionItem;
  onOpen: () => void;
  isFirst: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isFirst && styles.rowBorder,
        pressed && styles.pressed,
      ]}
      onPress={onOpen}
    >
      <View style={styles.rowContent}>
        <Text style={styles.rowName}>{item.playerName}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
        <Text style={styles.actionLine} numberOfLines={2}>
          {item.actionLine}
        </Text>
      </View>
      <PrimaryButton
        title="Открыть"
        variant="ghost"
        onPress={onOpen}
        style={styles.rowBtn}
        textStyle={styles.rowBtnText}
      />
    </Pressable>
  );
}

export default function ActionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CoachActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      getCoachActionItems()
        .then((data) => {
          setItems(data);
          setError(null);
        })
        .catch((err) => {
          setItems([]);
          setError(isAuthRequiredError(err) ? "Требуется авторизация" : "Не удалось загрузить список");
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const dateLabel = formatContextDate();
  const countLabel =
    items.length > 0
      ? `${items.length} ${pluralPlayer(items.length)}`
      : "Нет игроков";

  if (loading) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.warning} />
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
            <Text style={styles.eyebrow}>Требуют внимания</Text>
            <Text style={styles.title}>Игроки</Text>
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
                getCoachActionItems()
                  .then((data) => {
                    setItems(data);
                    setError(null);
                  })
                  .catch((err) => setError(isAuthRequiredError(err) ? "Требуется авторизация" : "Не удалось загрузить список"))
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
          <Text style={styles.eyebrow}>Требуют внимания</Text>
          <Text style={styles.title}>Игроки</Text>
          <View style={styles.heroContext}>
            <Text style={styles.context}>{dateLabel}</Text>
            <View style={styles.dot} />
            <Text style={styles.context}>{countLabel}</Text>
          </View>
        </View>
      </StaggerFadeIn>

      <StaggerFadeIn delay={15}>
        <View style={styles.section}>
          {items.length === 0 ? (
            <SectionCard elevated style={styles.actionCard}>
              <Text style={styles.emptyTitle}>
                {isEndpointUnavailable(COACH_ENDPOINTS.ACTIONS)
                  ? 'Модуль действий пока не подключён'
                  : 'Пока нет игроков, требующих внимания'}
              </Text>
              <Text style={styles.emptyText}>
                {isEndpointUnavailable(COACH_ENDPOINTS.ACTIONS)
                  ? 'Когда сервер будет готов, здесь появятся задачи'
                  : 'Запишите тренировку'}
              </Text>
              {isEndpointUnavailable(COACH_ENDPOINTS.ACTIONS) ? (
                <PrimaryButton
                  title="Проверить снова"
                  variant="outline"
                  onPress={() => {
                    clearEndpointUnavailable(COACH_ENDPOINTS.ACTIONS);
                    setLoading(true);
                    setError(null);
                    getCoachActionItems()
                      .then((data) => setItems(data))
                      .catch((err) => setError(isAuthRequiredError(err) ? "Требуется авторизация" : "Не удалось загрузить список"))
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
            <SectionCard elevated style={styles.actionCard}>
              {items.map((item, i) => (
                <ActionRow
                  key={item.playerId}
                  item={item}
                  isFirst={i === 0}
                  onOpen={() => router.push(`/player/${item.playerId}`)}
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
  actionCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
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
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  actionLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  rowBtn: {
    alignSelf: "center",
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
